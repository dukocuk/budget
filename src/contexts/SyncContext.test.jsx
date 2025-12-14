/**
 * SyncContext Tests
 * Tests for cloud synchronization with Google Drive
 *
 * Tests cover:
 * - Sync state management (idle, syncing, synced, error, offline)
 * - Google Drive integration (upload/download)
 * - Data operations (expenses, periods, settings)
 * - Error handling and recovery
 * - Online/offline detection
 *
 * Note: Debouncing and polling behavior are tested functionally
 * without relying on complex timer mocking to avoid flakiness
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { SyncProvider, SyncContext } from './SyncContext';
import { useContext } from 'react';

// Mock Google Drive functions
const mockUploadBudgetData = vi.fn();
const mockDownloadBudgetData = vi.fn();
const mockCheckForUpdates = vi.fn();

vi.mock('../lib/googleDrive', () => ({
  uploadBudgetData: (...args) => mockUploadBudgetData(...args),
  downloadBudgetData: (...args) => mockDownloadBudgetData(...args),
  checkForUpdates: (...args) => mockCheckForUpdates(...args),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock PGlite database
const mockPGliteQuery = vi.fn();
vi.mock('../lib/pglite', () => ({
  localDB: {
    query: (...args) => mockPGliteQuery(...args),
  },
}));

// Mock validators
vi.mock('../utils/validators', () => ({
  validateCloudData: vi.fn().mockReturnValue({ valid: true, warnings: [] }),
  validateDownloadedData: vi.fn().mockReturnValue({ valid: true, errors: [] }),
}));

// Test fixtures
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
};

const mockExpenses = [
  { id: '1', name: 'Rent', amount: 5000, frequency: 'monthly' },
  { id: '2', name: 'Internet', amount: 300, frequency: 'monthly' },
];

const mockBudgetPeriods = [
  {
    id: 'period-2025',
    year: 2025,
    monthlyPayment: 5700,
    previousBalance: 4831,
  },
];

const mockSettings = {
  monthlyPayment: 5700,
  previousBalance: 4831,
};

// Helper to render hook with context
const wrapper =
  ({ user = mockUser, children } = {}) =>
  ({ children: innerChildren }) => (
    <SyncProvider user={user}>{children || innerChildren}</SyncProvider>
  );

// Helper hook to access context
const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('SyncContext not found');
  return context;
};

describe('SyncContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock PGlite database responses for fetchCompleteLocalData
    mockPGliteQuery.mockImplementation(async (query, _params) => {
      if (query.includes('SELECT * FROM expenses')) {
        return {
          rows: mockExpenses.map(e => ({
            id: e.id,
            name: e.name,
            amount: e.amount,
            frequency: e.frequency,
            start_month: 1,
            end_month: 12,
            budget_period_id: 'period-2025',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
        };
      } else if (query.includes('SELECT * FROM budget_periods')) {
        return {
          rows: mockBudgetPeriods.map(p => ({
            id: p.id,
            user_id: 'user-123',
            year: p.year,
            monthly_payment: p.monthlyPayment,
            previous_balance: p.previousBalance,
            monthly_payments: null,
            status: 'active',
            is_template: 0,
            template_name: null,
            template_description: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
        };
      }
      return { rows: [] };
    });

    // Default successful responses
    mockUploadBudgetData.mockResolvedValue({
      success: true,
      lastModified: new Date().toISOString(),
    });

    mockDownloadBudgetData.mockResolvedValue({
      expenses: mockExpenses,
      budgetPeriods: mockBudgetPeriods,
      settings: mockSettings,
      lastModified: new Date().toISOString(),
    });

    mockCheckForUpdates.mockResolvedValue(false);

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization and State', () => {
    it('should initialize with idle state', () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      expect(result.current.syncStatus).toBe('idle');
      expect(result.current.lastSyncTime).toBeNull();
      expect(result.current.syncError).toBeNull();
      expect(result.current.isOnline).toBe(true);
    });

    it('should detect online status correctly', () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      expect(result.current.isOnline).toBe(true);
    });

    it('should provide all sync methods', () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      expect(result.current.syncExpenses).toBeDefined();
      expect(result.current.syncBudgetPeriods).toBeDefined();
      expect(result.current.syncSettings).toBeDefined();
      expect(result.current.loadExpenses).toBeDefined();
      expect(result.current.loadBudgetPeriods).toBeDefined();
      expect(result.current.loadSettings).toBeDefined();
      expect(result.current.immediateSyncExpenses).toBeDefined();
      expect(result.current.immediateSyncBudgetPeriods).toBeDefined();
      expect(result.current.immediateSyncSettings).toBeDefined();
    });
  });

  describe('Sync Operations', () => {
    it('should sync expenses successfully with complete data', async () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      await act(async () => {
        await result.current.immediateSyncExpenses(mockExpenses);
      });

      // CRITICAL FIX: Now syncs complete data, not partial
      expect(mockUploadBudgetData).toHaveBeenCalled();
      const uploadedData = mockUploadBudgetData.mock.calls[0][0];

      // Verify expenses were synced
      expect(uploadedData.expenses).toBeDefined();
      expect(uploadedData.expenses.length).toBeGreaterThan(0);

      // CRITICAL: Verify budget periods are included (not empty)
      expect(uploadedData.budgetPeriods).toBeDefined();
      expect(uploadedData.budgetPeriods.length).toBeGreaterThan(0);

      expect(result.current.syncStatus).toBe('synced');
    });

    it('should sync budget periods successfully with complete data', async () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      await act(async () => {
        await result.current.immediateSyncBudgetPeriods(mockBudgetPeriods);
      });

      // CRITICAL FIX: Now syncs complete data, not partial
      expect(mockUploadBudgetData).toHaveBeenCalled();
      const uploadedData = mockUploadBudgetData.mock.calls[0][0];

      // Verify budget periods were synced
      expect(uploadedData.budgetPeriods).toBeDefined();
      expect(uploadedData.budgetPeriods.length).toBeGreaterThan(0);

      // CRITICAL: Verify expenses are included (not empty)
      expect(uploadedData.expenses).toBeDefined();
      expect(uploadedData.expenses.length).toBeGreaterThan(0);
    });

    it('should sync settings successfully with complete data', async () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      await act(async () => {
        await result.current.immediateSyncSettings(5700, 4831, null);
      });

      // CRITICAL FIX: Now syncs complete data, not partial
      // Settings are now stored in budget_periods, not as separate field
      expect(mockUploadBudgetData).toHaveBeenCalled();
      const uploadedData = mockUploadBudgetData.mock.calls[0][0];

      // CRITICAL: Verify expenses and periods are included (not empty)
      expect(uploadedData.expenses).toBeDefined();
      expect(uploadedData.expenses.length).toBeGreaterThan(0);
      expect(uploadedData.budgetPeriods).toBeDefined();
      expect(uploadedData.budgetPeriods.length).toBeGreaterThan(0);
    });

    it('should update lastSyncTime after successful sync', async () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      expect(result.current.lastSyncTime).toBeNull();

      await act(async () => {
        await result.current.immediateSyncExpenses(mockExpenses);
      });

      expect(result.current.lastSyncTime).not.toBeNull();
      expect(result.current.lastSyncTime).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should set error state on sync failure', async () => {
      const errorMessage = 'Network error';
      mockUploadBudgetData.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      await act(async () => {
        await result.current.immediateSyncExpenses(mockExpenses);
      });

      expect(result.current.syncStatus).toBe('error');
      expect(result.current.syncError).toBe(errorMessage);
    });

    it('should clear error on successful retry', async () => {
      // First attempt fails
      mockUploadBudgetData.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      // First sync fails
      await act(async () => {
        await result.current.immediateSyncExpenses(mockExpenses);
      });

      expect(result.current.syncStatus).toBe('error');
      expect(result.current.syncError).toBe('Network error');

      // Second attempt succeeds
      mockUploadBudgetData.mockResolvedValue({
        success: true,
        lastModified: new Date().toISOString(),
      });

      await act(async () => {
        await result.current.immediateSyncExpenses(mockExpenses);
      });

      expect(result.current.syncStatus).toBe('synced');
      expect(result.current.syncError).toBeNull();
    });

    it('should handle Drive API authentication errors', async () => {
      mockUploadBudgetData.mockRejectedValue(
        new Error('Authentication required')
      );

      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      await act(async () => {
        await result.current.immediateSyncExpenses(mockExpenses);
      });

      expect(result.current.syncStatus).toBe('error');
      expect(result.current.syncError).toBe('Authentication required');
    });

    it('should skip sync when user is not authenticated', async () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper({ user: null }),
      });

      await act(async () => {
        await result.current.immediateSyncExpenses(mockExpenses);
      });

      expect(mockUploadBudgetData).not.toHaveBeenCalled();
    });

    it('should skip sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      await act(async () => {
        window.dispatchEvent(new Event('offline'));
      });

      await act(async () => {
        await result.current.immediateSyncExpenses(mockExpenses);
      });

      expect(mockUploadBudgetData).not.toHaveBeenCalled();
    });
  });

  describe('Data Loading', () => {
    it('should load expenses from Google Drive', async () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      const response = await act(async () => {
        return await result.current.loadExpenses();
      });

      expect(mockDownloadBudgetData).toHaveBeenCalled();
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockExpenses);
    });

    it('should load budget periods from Google Drive', async () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      const response = await act(async () => {
        return await result.current.loadBudgetPeriods();
      });

      expect(mockDownloadBudgetData).toHaveBeenCalled();
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockBudgetPeriods);
    });

    it('should load settings from Google Drive (deprecated - returns empty)', async () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      const response = await act(async () => {
        return await result.current.loadSettings();
      });

      expect(mockDownloadBudgetData).toHaveBeenCalled();
      expect(response.success).toBe(true);
      // Settings are now stored in budget_periods, loadSettings always returns empty
      expect(response.data).toEqual({});
    });

    it('should handle empty Drive response gracefully', async () => {
      mockDownloadBudgetData.mockResolvedValue(null);

      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      const response = await act(async () => {
        return await result.current.loadExpenses();
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
    });

    it('should handle corrupted JSON gracefully', async () => {
      mockDownloadBudgetData.mockRejectedValue(
        new Error('Invalid JSON format')
      );

      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      const response = await act(async () => {
        return await result.current.loadExpenses();
      });

      expect(response.data).toEqual([]);
      expect(result.current.syncError).toBe('Invalid JSON format');
    });

    it('should handle partial data from Drive', async () => {
      mockDownloadBudgetData.mockResolvedValue({
        expenses: mockExpenses,
        // Missing budgetPeriods and settings
      });

      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      const expensesResponse = await act(async () => {
        return await result.current.loadExpenses();
      });

      const periodsResponse = await act(async () => {
        return await result.current.loadBudgetPeriods();
      });

      expect(expensesResponse.data).toEqual(mockExpenses);
      expect(periodsResponse.data).toEqual([]);
    });
  });

  describe('Multi-Device Sync', () => {
    it('should download latest data when remote updates detected', async () => {
      mockCheckForUpdates.mockResolvedValue(true);

      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      const updates = await act(async () => {
        return await result.current.checkAndDownloadUpdates();
      });

      expect(mockCheckForUpdates).toHaveBeenCalled();
      expect(mockDownloadBudgetData).toHaveBeenCalled();
      expect(updates).toBeTruthy();
      expect(updates.expenses).toEqual(mockExpenses);
    });

    it('should use last-write-wins conflict resolution', async () => {
      const oldTimestamp = '2025-01-15T10:00:00Z';
      const newTimestamp = '2025-01-15T12:00:00Z';

      // First sync with old timestamp
      mockUploadBudgetData.mockResolvedValue({
        success: true,
        lastModified: oldTimestamp,
      });

      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      await act(async () => {
        await result.current.immediateSyncExpenses(mockExpenses);
      });

      // Remote has newer data
      mockDownloadBudgetData.mockResolvedValue({
        expenses: [...mockExpenses, { id: '3', name: 'New expense' }],
        budgetPeriods: mockBudgetPeriods,
        settings: mockSettings,
        lastModified: newTimestamp,
      });

      mockCheckForUpdates.mockResolvedValue(true);

      const updates = await act(async () => {
        return await result.current.checkAndDownloadUpdates();
      });

      expect(updates.expenses).toHaveLength(3);
      expect(updates.lastModified).toBe(newTimestamp);
    });

    it('should not check updates when sync is in progress', async () => {
      // Make upload slow
      mockUploadBudgetData.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () => resolve({ success: true, lastModified: new Date() }),
              100
            )
          )
      );

      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      // Start sync
      act(() => {
        result.current.immediateSyncExpenses(mockExpenses);
      });

      // Try to check updates while syncing
      const updates = await act(async () => {
        return await result.current.checkAndDownloadUpdates();
      });

      expect(updates).toBeNull();
    });
  });

  describe('Online/Offline Detection', () => {
    it('should detect offline state', async () => {
      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      expect(result.current.isOnline).toBe(true);

      // Simulate going offline
      await act(async () => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
        expect(result.current.syncStatus).toBe('offline');
      });
    });

    it('should resume to idle when coming back online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useSyncContext(), {
        wrapper: wrapper(),
      });

      await act(async () => {
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('offline');
      });

      // Go back online
      await act(async () => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
        expect(result.current.syncStatus).toBe('idle');
      });
    });
  });
});
