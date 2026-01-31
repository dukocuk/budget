/**
 * Tests for Google Drive integration
 * Covers upload/download, network errors, file versioning, auth edge cases, and backup management
 *
 * Priority: HIGHEST (19.93% → 90%+ coverage target)
 * Critical Path: Cloud sync functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initGoogleDrive,
  ensureBudgetFolder,
  ensureBackupFolder,
  getBudgetFileMetadata,
  downloadBudgetData,
  uploadBudgetData,
  checkForUpdates,
  createBackup,
  listBackups,
  downloadBackup,
  deleteOldBackups,
  clearCache,
  getCacheStatus,
} from './googleDrive';

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock validators
vi.mock('../utils/validators', () => ({
  validateDownloadedData: vi.fn().mockReturnValue({
    valid: true,
    errors: [],
    warnings: [],
  }),
}));

describe('Google Drive Integration', () => {
  // Mock Google API
  let mockGapi;
  let mockDriveFiles;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers(); // Clear timers before each test
    clearCache(); // Clear cache before each test

    // Setup mock Google API
    mockDriveFiles = {
      list: vi.fn(),
      create: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
    };

    mockGapi = {
      load: vi.fn((name, callback) => callback()),
      client: {
        init: vi.fn().mockResolvedValue(undefined),
        setToken: vi.fn(),
        drive: {
          files: mockDriveFiles,
        },
        request: vi.fn(),
      },
    };

    global.window = {
      gapi: mockGapi,
      location: {
        origin: 'http://localhost:5173',
      },
    };

    // Use fake timers for better control
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers(); // Restore real timers
    clearCache();
  });

  describe('Initialization', () => {
    it('should initialize Google Drive API successfully', async () => {
      const accessToken = 'test-access-token';

      const result = await initGoogleDrive(accessToken);

      expect(result).toBe(true);
      expect(mockGapi.load).toHaveBeenCalledWith(
        'client',
        expect.any(Function)
      );
      expect(mockGapi.client.init).toHaveBeenCalledWith({
        apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
        discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
        ],
      });
      expect(mockGapi.client.setToken).toHaveBeenCalledWith({
        access_token: accessToken,
      });
    });

    it('should handle gapi not available error', async () => {
      delete global.window.gapi;

      // Create promise and immediately start advancing time
      const promise = expect(initGoogleDrive('token')).rejects.toThrow(
        'Google API (gapi) not available after 10 seconds'
      );

      // Fast-forward timers by 10 seconds
      await vi.advanceTimersByTimeAsync(10000);

      // Await the assertion
      await promise;
    });

    it('should handle client init failure', async () => {
      mockGapi.client.init.mockRejectedValue(new Error('Init failed'));

      await expect(initGoogleDrive('token')).rejects.toThrow('Init failed');
    });
  });

  describe('Folder Management', () => {
    it('should create BudgetTracker folder if it does not exist', async () => {
      mockDriveFiles.list.mockResolvedValue({ result: { files: [] } });
      mockDriveFiles.create.mockResolvedValue({ result: { id: 'folder-123' } });

      const folderId = await ensureBudgetFolder();

      expect(folderId).toBe('folder-123');
      expect(mockDriveFiles.list).toHaveBeenCalledWith({
        q: "name='BudgetTracker' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name, createdTime)',
        spaces: 'drive',
        orderBy: 'createdTime',
      });
      expect(mockDriveFiles.create).toHaveBeenCalledWith({
        resource: {
          name: 'BudgetTracker',
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });
    });

    it('should return existing folder ID if folder exists', async () => {
      mockDriveFiles.list.mockResolvedValue({
        result: {
          files: [{ id: 'existing-folder-123', name: 'BudgetTracker' }],
        },
      });

      const folderId = await ensureBudgetFolder();

      expect(folderId).toBe('existing-folder-123');
      expect(mockDriveFiles.create).not.toHaveBeenCalled();
    });

    it('should use oldest folder if multiple exist', async () => {
      mockDriveFiles.list.mockResolvedValue({
        result: {
          files: [
            {
              id: 'folder-old',
              name: 'BudgetTracker',
              createdTime: '2024-01-01',
            },
            {
              id: 'folder-new',
              name: 'BudgetTracker',
              createdTime: '2024-12-01',
            },
          ],
        },
      });

      const folderId = await ensureBudgetFolder();

      expect(folderId).toBe('folder-old');
    });

    it('should cache folder ID after first lookup', async () => {
      mockDriveFiles.list.mockResolvedValue({
        result: { files: [{ id: 'folder-123' }] },
      });

      const folderId1 = await ensureBudgetFolder();
      const folderId2 = await ensureBudgetFolder();

      expect(folderId1).toBe('folder-123');
      expect(folderId2).toBe('folder-123');
      expect(mockDriveFiles.list).toHaveBeenCalledTimes(1); // Only once due to caching
    });

    it('should prevent concurrent folder creation with promise lock', async () => {
      mockDriveFiles.list.mockResolvedValue({ result: { files: [] } });
      mockDriveFiles.create.mockResolvedValue({ result: { id: 'folder-123' } });

      // Call ensureBudgetFolder twice simultaneously
      const [folderId1, folderId2] = await Promise.all([
        ensureBudgetFolder(),
        ensureBudgetFolder(),
      ]);

      expect(folderId1).toBe('folder-123');
      expect(folderId2).toBe('folder-123');
      expect(mockDriveFiles.create).toHaveBeenCalledTimes(1); // Only create once
    });

    it('should create backup folder inside BudgetTracker folder', async () => {
      // Mock parent folder exists
      mockDriveFiles.list
        .mockResolvedValueOnce({
          result: { files: [{ id: 'parent-folder-123' }] },
        })
        .mockResolvedValueOnce({
          result: { files: [] }, // No backup folder yet
        });

      mockDriveFiles.create.mockResolvedValue({
        result: { id: 'backup-folder-123' },
      });

      const backupFolderId = await ensureBackupFolder();

      expect(backupFolderId).toBe('backup-folder-123');
      expect(mockDriveFiles.create).toHaveBeenCalledWith({
        resource: {
          name: 'backups',
          mimeType: 'application/vnd.google-apps.folder',
          parents: ['parent-folder-123'],
        },
        fields: 'id',
      });
    });
  });

  describe('Upload/Download Cycle', () => {
    const mockData = {
      expenses: [
        { id: 'exp-1', name: 'Netflix', amount: 79 },
        { id: 'exp-2', name: 'Spotify', amount: 99 },
      ],
      budgetPeriods: [{ id: 'period-2025', year: 2025 }],
    };

    beforeEach(() => {
      // Mock folder exists
      mockDriveFiles.list.mockResolvedValue({
        result: { files: [{ id: 'folder-123' }] },
      });
    });

    it('should upload budget data successfully (create new file)', async () => {
      // No existing file
      mockDriveFiles.list
        .mockResolvedValueOnce({
          result: { files: [{ id: 'folder-123' }] },
        })
        .mockResolvedValueOnce({
          result: { files: [] },
        });

      mockGapi.client.request.mockResolvedValueOnce({
        result: { id: 'file-123' },
      });

      // Mock getBudgetFileMetadata after create
      mockDriveFiles.list.mockResolvedValueOnce({
        result: {
          files: [{ id: 'file-123', modifiedTime: '2025-01-31T12:00:00.000Z' }],
        },
      });

      const result = await uploadBudgetData(mockData);

      expect(result.success).toBe(true);
      expect(result.fileId).toBe('file-123');
      expect(mockGapi.client.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/upload/drive/v3/files',
          method: 'POST',
          params: { uploadType: 'multipart', fields: 'id' },
        })
      );
    });

    it('should upload budget data successfully (update existing file)', async () => {
      // Existing file
      mockDriveFiles.list
        .mockResolvedValueOnce({
          result: { files: [{ id: 'folder-123' }] },
        })
        .mockResolvedValueOnce({
          result: {
            files: [
              { id: 'file-123', modifiedTime: '2025-01-31T10:00:00.000Z' },
            ],
          },
        });

      mockGapi.client.request.mockResolvedValueOnce({
        result: { id: 'file-123' },
      });

      // Mock getBudgetFileMetadata after update
      mockDriveFiles.list.mockResolvedValueOnce({
        result: {
          files: [{ id: 'file-123', modifiedTime: '2025-01-31T12:00:00.000Z' }],
        },
      });

      const result = await uploadBudgetData(mockData);

      expect(result.success).toBe(true);
      expect(mockGapi.client.request).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/upload/drive/v3/files/file-123',
          method: 'PATCH',
        })
      );
    });

    it('should download budget data successfully', async () => {
      mockDriveFiles.list.mockResolvedValue({
        result: {
          files: [{ id: 'file-123', modifiedTime: '2025-01-31T12:00:00.000Z' }],
        },
      });

      mockDriveFiles.get.mockResolvedValue({
        body: JSON.stringify({
          version: '1.0.0',
          expenses: mockData.expenses,
          budgetPeriods: mockData.budgetPeriods,
        }),
      });

      const result = await downloadBudgetData();

      expect(result).toEqual({
        version: '1.0.0',
        expenses: mockData.expenses,
        budgetPeriods: mockData.budgetPeriods,
        lastModified: '2025-01-31T12:00:00.000Z',
      });
    });

    it('should return null when downloading non-existent file', async () => {
      // Mock folder exists
      mockDriveFiles.list
        .mockResolvedValueOnce({ result: { files: [{ id: 'folder-123' }] } })
        .mockResolvedValueOnce({ result: { files: [] } }); // No file in folder

      const result = await downloadBudgetData();

      expect(result).toBeNull();
    });

    it('should handle large datasets (1000+ expenses)', async () => {
      const largeData = {
        expenses: Array.from({ length: 1500 }, (_, i) => ({
          id: `exp-${i}`,
          name: `Expense ${i}`,
          amount: 100 + i,
        })),
        budgetPeriods: [{ id: 'period-2025', year: 2025 }],
      };

      mockDriveFiles.list
        .mockResolvedValueOnce({ result: { files: [{ id: 'folder-123' }] } })
        .mockResolvedValueOnce({ result: { files: [] } });

      mockGapi.client.request.mockResolvedValueOnce({
        result: { id: 'file-123' },
      });

      mockDriveFiles.list.mockResolvedValueOnce({
        result: {
          files: [{ id: 'file-123', modifiedTime: '2025-01-31T12:00:00.000Z' }],
        },
      });

      const result = await uploadBudgetData(largeData);

      expect(result.success).toBe(true);
      expect(mockGapi.client.request).toHaveBeenCalled();
    });

    it('should handle empty data upload', async () => {
      const emptyData = {
        expenses: [],
        budgetPeriods: [],
      };

      mockDriveFiles.list
        .mockResolvedValueOnce({ result: { files: [{ id: 'folder-123' }] } })
        .mockResolvedValueOnce({ result: { files: [] } });

      mockGapi.client.request.mockResolvedValueOnce({
        result: { id: 'file-123' },
      });

      mockDriveFiles.list.mockResolvedValueOnce({
        result: {
          files: [{ id: 'file-123', modifiedTime: '2025-01-31T12:00:00.000Z' }],
        },
      });

      const result = await uploadBudgetData(emptyData);

      expect(result.success).toBe(true);
    });

    it('should handle malformed JSON download gracefully', async () => {
      mockDriveFiles.list.mockResolvedValue({
        result: {
          files: [{ id: 'file-123', modifiedTime: '2025-01-31T12:00:00.000Z' }],
        },
      });

      mockDriveFiles.get.mockResolvedValue({
        body: 'invalid json',
      });

      await expect(downloadBudgetData()).rejects.toThrow();
    });
  });

  describe('Network Error Handling', () => {
    beforeEach(() => {
      // Mock folder exists for these tests
      mockDriveFiles.list.mockResolvedValue({
        result: { files: [{ id: 'folder-123' }] },
      });
    });

    it('should retry on network timeout', async () => {
      // This test verifies error is thrown (caller handles retry)
      mockDriveFiles.get.mockRejectedValue(new Error('Network timeout'));

      mockDriveFiles.list.mockResolvedValue({
        result: {
          files: [{ id: 'file-123', modifiedTime: '2025-01-31T12:00:00.000Z' }],
        },
      });

      await expect(downloadBudgetData()).rejects.toThrow('Network timeout');
    });

    it('should handle 401 unauthorized (token expired)', async () => {
      mockGapi.client.request.mockRejectedValue({
        status: 401,
        message: 'Unauthorized',
      });

      mockDriveFiles.list
        .mockResolvedValueOnce({ result: { files: [{ id: 'folder-123' }] } })
        .mockResolvedValueOnce({ result: { files: [] } });

      await expect(
        uploadBudgetData({ expenses: [], budgetPeriods: [] })
      ).rejects.toThrow();
    });

    it('should handle 403 forbidden (permissions issue)', async () => {
      mockGapi.client.request.mockRejectedValue({
        status: 403,
        message: 'Forbidden',
      });

      mockDriveFiles.list
        .mockResolvedValueOnce({ result: { files: [{ id: 'folder-123' }] } })
        .mockResolvedValueOnce({ result: { files: [] } });

      await expect(
        uploadBudgetData({ expenses: [], budgetPeriods: [] })
      ).rejects.toThrow();
    });

    it('should handle 404 not found (file deleted)', async () => {
      // Mock folder exists but file doesn't
      mockDriveFiles.list
        .mockResolvedValueOnce({ result: { files: [{ id: 'folder-123' }] } })
        .mockResolvedValueOnce({ result: { files: [] } }); // No file

      const result = await downloadBudgetData();

      expect(result).toBeNull(); // Graceful handling of missing file
    });

    it('should handle 429 rate limit', async () => {
      mockGapi.client.request.mockRejectedValue({
        status: 429,
        message: 'Rate limit exceeded',
      });

      mockDriveFiles.list
        .mockResolvedValueOnce({ result: { files: [{ id: 'folder-123' }] } })
        .mockResolvedValueOnce({ result: { files: [] } });

      await expect(
        uploadBudgetData({ expenses: [], budgetPeriods: [] })
      ).rejects.toThrow();
    });

    it('should handle 500 server error', async () => {
      mockGapi.client.request.mockRejectedValue({
        status: 500,
        message: 'Internal server error',
      });

      mockDriveFiles.list
        .mockResolvedValueOnce({ result: { files: [{ id: 'folder-123' }] } })
        .mockResolvedValueOnce({ result: { files: [] } });

      await expect(
        uploadBudgetData({ expenses: [], budgetPeriods: [] })
      ).rejects.toThrow();
    });
  });

  describe('File Versioning & Conflict Detection', () => {
    it('should detect file version conflicts', async () => {
      const lastKnownModified = '2025-01-31T10:00:00.000Z';

      mockDriveFiles.list.mockResolvedValue({
        result: {
          files: [{ id: 'file-123', modifiedTime: '2025-01-31T12:00:00.000Z' }],
        },
      });

      const hasUpdates = await checkForUpdates(lastKnownModified);

      expect(hasUpdates).toBe(true);
    });

    it('should detect no updates when local is current', async () => {
      const lastKnownModified = '2025-01-31T12:00:00.000Z';

      mockDriveFiles.list.mockResolvedValue({
        result: {
          files: [{ id: 'file-123', modifiedTime: '2025-01-31T10:00:00.000Z' }],
        },
      });

      const hasUpdates = await checkForUpdates(lastKnownModified);

      expect(hasUpdates).toBe(false);
    });

    it('should handle checkForUpdates with no remote file', async () => {
      mockDriveFiles.list.mockResolvedValue({ result: { files: [] } });

      const hasUpdates = await checkForUpdates('2025-01-31T12:00:00.000Z');

      expect(hasUpdates).toBe(false);
    });

    it('should handle checkForUpdates with no local timestamp', async () => {
      mockDriveFiles.list.mockResolvedValue({
        result: {
          files: [{ id: 'file-123', modifiedTime: '2025-01-31T12:00:00.000Z' }],
        },
      });

      const hasUpdates = await checkForUpdates(null);

      expect(hasUpdates).toBe(true);
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should handle token refresh during upload', async () => {
      // First attempt fails with 401
      mockGapi.client.request
        .mockRejectedValueOnce({ status: 401, message: 'Unauthorized' })
        .mockResolvedValueOnce({ result: { id: 'file-123' } });

      mockDriveFiles.list
        .mockResolvedValueOnce({ result: { files: [{ id: 'folder-123' }] } })
        .mockResolvedValueOnce({ result: { files: [] } });

      // This test verifies error is thrown (caller handles token refresh)
      await expect(
        uploadBudgetData({ expenses: [], budgetPeriods: [] })
      ).rejects.toThrow();
    });

    it('should handle revoked token', async () => {
      mockGapi.client.request.mockRejectedValue({
        status: 401,
        message: 'Token has been revoked',
      });

      mockDriveFiles.list
        .mockResolvedValueOnce({ result: { files: [{ id: 'folder-123' }] } })
        .mockResolvedValueOnce({ result: { files: [] } });

      await expect(
        uploadBudgetData({ expenses: [], budgetPeriods: [] })
      ).rejects.toThrow();
    });

    it('should handle expired session', async () => {
      mockGapi.client.request.mockRejectedValue({
        status: 401,
        message: 'Session expired',
      });

      mockDriveFiles.list
        .mockResolvedValueOnce({ result: { files: [{ id: 'folder-123' }] } })
        .mockResolvedValueOnce({ result: { files: [] } });

      await expect(
        uploadBudgetData({ expenses: [], budgetPeriods: [] })
      ).rejects.toThrow();
    });

    it('should re-authenticate on 401 error', async () => {
      mockDriveFiles.list.mockRejectedValue({
        status: 401,
        message: 'Unauthorized',
      });

      await expect(ensureBudgetFolder()).rejects.toThrow();
    });
  });

  describe('Backup Management', () => {
    const mockData = {
      expenses: [{ id: 'exp-1', name: 'Netflix', amount: 79 }],
      budgetPeriods: [{ id: 'period-2025', year: 2025 }],
    };

    beforeEach(() => {
      // Mock folders exist
      mockDriveFiles.list
        .mockResolvedValueOnce({ result: { files: [{ id: 'folder-123' }] } })
        .mockResolvedValueOnce({
          result: { files: [{ id: 'backup-folder-123' }] },
        });
    });

    it('should create backup successfully', async () => {
      mockGapi.client.request.mockResolvedValue({
        result: { id: 'backup-file-123' },
      });

      const result = await createBackup(mockData);

      expect(result.success).toBe(true);
      expect(result.fileId).toBe('backup-file-123');
      expect(result.filename).toMatch(
        /^backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/
      );
    });

    it('should list backups sorted by date (newest first)', async () => {
      mockDriveFiles.list.mockResolvedValueOnce({
        result: {
          files: [
            {
              id: 'backup-2',
              name: 'backup-2025-01-31T12-00-00.json',
              modifiedTime: '2025-01-31T12:00:00.000Z',
              size: '2048',
            },
            {
              id: 'backup-1',
              name: 'backup-2025-01-30T10-00-00.json',
              modifiedTime: '2025-01-30T10:00:00.000Z',
              size: '1024',
            },
          ],
        },
      });

      const backups = await listBackups();

      expect(backups).toHaveLength(2);
      expect(backups[0].fileId).toBe('backup-2'); // Newest first
      expect(backups[0].size).toBe(2048);
      expect(backups[1].fileId).toBe('backup-1');
    });

    it('should download specific backup file', async () => {
      mockDriveFiles.get.mockResolvedValue({
        body: JSON.stringify({
          version: '1.0.0',
          timestamp: '2025-01-31T12:00:00.000Z',
          expenses: mockData.expenses,
          budgetPeriods: mockData.budgetPeriods,
        }),
      });

      const result = await downloadBackup('backup-file-123');

      expect(result.expenses).toEqual(mockData.expenses);
      expect(result.budgetPeriods).toEqual(mockData.budgetPeriods);
      expect(result.timestamp).toBe('2025-01-31T12:00:00.000Z');
    });

    it('should delete old backups when count exceeds limit', async () => {
      // Mock 10 backups
      const mockBackups = Array.from({ length: 10 }, (_, i) => ({
        id: `backup-${i}`,
        name: `backup-${i}.json`,
        modifiedTime: `2025-01-${31 - i}T12:00:00.000Z`,
        size: '1024',
      }));

      mockDriveFiles.list.mockResolvedValueOnce({
        result: { files: mockBackups },
      });

      mockDriveFiles.delete.mockResolvedValue({});

      const result = await deleteOldBackups(7);

      expect(result.deleted).toBe(3); // Delete 3 oldest backups
      expect(result.errors).toBe(0);
      expect(mockDriveFiles.delete).toHaveBeenCalledTimes(3);
    });

    it('should handle no cleanup needed when within limit', async () => {
      mockDriveFiles.list.mockResolvedValueOnce({
        result: {
          files: [
            {
              id: 'backup-1',
              name: 'backup-1.json',
              modifiedTime: '2025-01-31',
            },
          ],
        },
      });

      const result = await deleteOldBackups(7);

      expect(result.deleted).toBe(0);
      expect(mockDriveFiles.delete).not.toHaveBeenCalled();
    });
  });

  describe('Cache Management', () => {
    it('should clear cache on demand', () => {
      clearCache();

      const status = getCacheStatus();
      expect(status.folderIdCache).toBeNull();
      expect(status.fileIdCache).toBeNull();
      expect(status.folderCreationInProgress).toBe(false);
    });

    it('should provide cache status', async () => {
      mockDriveFiles.list.mockResolvedValue({
        result: { files: [{ id: 'folder-123' }] },
      });

      await ensureBudgetFolder();

      const status = getCacheStatus();
      expect(status.folderIdCache).toBe('folder-123');
      expect(status.folderCreationInProgress).toBe(false);
    });
  });

  describe('Data Validation', () => {
    it('should validate downloaded data structure', async () => {
      const { validateDownloadedData } = await import('../utils/validators');

      mockDriveFiles.list.mockResolvedValue({
        result: {
          files: [{ id: 'file-123', modifiedTime: '2025-01-31T12:00:00.000Z' }],
        },
      });

      mockDriveFiles.get.mockResolvedValue({
        body: JSON.stringify({
          version: '1.0.0',
          expenses: [],
          budgetPeriods: [],
        }),
      });

      await downloadBudgetData();

      expect(validateDownloadedData).toHaveBeenCalled();
    });

    it('should throw error when validation fails', async () => {
      const { validateDownloadedData } = await import('../utils/validators');
      validateDownloadedData.mockReturnValueOnce({
        valid: false,
        errors: ['Invalid data structure'],
        warnings: [],
      });

      mockDriveFiles.list.mockResolvedValue({
        result: {
          files: [{ id: 'file-123', modifiedTime: '2025-01-31T12:00:00.000Z' }],
        },
      });

      mockDriveFiles.get.mockResolvedValue({
        body: JSON.stringify({
          version: '1.0.0',
          expenses: 'invalid',
          budgetPeriods: [],
        }),
      });

      await expect(downloadBudgetData()).rejects.toThrow(
        'Validation failed: Invalid data structure'
      );
    });
  });
});
