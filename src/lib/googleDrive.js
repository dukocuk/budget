/**
 * Google Drive API Client
 * Handles all Google Drive operations for budget data storage
 *
 * Features:
 * - Single JSON file storage in /BudgetTracker/ folder
 * - Automatic folder creation
 * - File upload/download with conflict detection
 * - Last-write-wins conflict resolution
 * - Token management and refresh
 */

import { logger } from '../utils/logger';
import { validateDownloadedData } from '../utils/validators';

const FOLDER_NAME = 'BudgetTracker';
const FILE_NAME = 'budget-data.json';
const BACKUP_FOLDER_NAME = 'backups';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
];

// File metadata cache
let folderIdCache = null;
let fileIdCache = null;
let backupFolderIdCache = null;

// Promise lock to prevent concurrent folder creation
let folderCreationPromise = null;
let backupFolderCreationPromise = null;

/**
 * Initialize Google Drive API client
 * Must be called after user authentication
 *
 * @param {string} accessToken - Google OAuth access token
 * @returns {Promise<boolean>} Success status
 */
export async function initGoogleDrive(accessToken) {
  try {
    logger.log('⏳ Initializing Google Drive API...');

    // Wait for gapi to be available (with 10 second timeout)
    await Promise.race([
      new Promise(resolve => {
        if (window.gapi) {
          resolve(true);
        } else {
          const checkGapi = setInterval(() => {
            if (window.gapi) {
              clearInterval(checkGapi);
              resolve(true);
            }
          }, 100);
        }
      }),
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error('Google API (gapi) not available after 10 seconds')
            ),
          10000
        )
      ),
    ]);

    // Load the client library (this creates gapi.client)
    await new Promise(resolve => window.gapi.load('client', resolve));

    // Initialize gapi client with API key and discovery docs
    await window.gapi.client.init({
      apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
      discoveryDocs: DISCOVERY_DOCS,
    });

    // Set access token
    window.gapi.client.setToken({ access_token: accessToken });

    logger.log('✅ Google Drive API initialized successfully');
    return true;
  } catch (error) {
    logger.error('❌ Error initializing Google Drive API:', error);
    logger.error('💥 Full error details:', {
      message: error.message,
      stack: error.stack,
      gapi: !!window.gapi,
      client: !!(window.gapi && window.gapi.client),
    });
    throw error;
  }
}

/**
 * Ensure BudgetTracker folder exists
 * Creates folder if it doesn't exist, with safeguards against duplicates
 *
 * Safety mechanisms:
 * - Cache to avoid repeated searches
 * - Promise locking to prevent concurrent creation
 * - Finds existing folders (all matches) before creating
 * - Uses oldest folder if multiple exist (handles edge cases)
 * - Only creates if absolutely no folder exists
 *
 * @returns {Promise<string>} Folder ID
 */
export async function ensureBudgetFolder() {
  try {
    // Return cached folder ID if available
    if (folderIdCache) {
      logger.log('Using cached folder ID:', folderIdCache);
      return folderIdCache;
    }

    // If folder creation is already in progress, wait for it
    if (folderCreationPromise) {
      logger.log('⏳ Folder creation in progress, waiting...');
      return await folderCreationPromise;
    }

    // Create promise lock and start folder creation process
    folderCreationPromise = (async () => {
      try {
        logger.log('Searching for BudgetTracker folder...');

        // Search for ALL existing folders with this name
        const response = await window.gapi.client.drive.files.list({
          q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id, name, createdTime)',
          spaces: 'drive',
          orderBy: 'createdTime', // Oldest first
        });

        const existingFolders = response.result.files || [];

        if (existingFolders.length > 0) {
          // Use the oldest folder (first in sorted list)
          folderIdCache = existingFolders[0].id;

          // Log warning if multiple folders exist
          if (existingFolders.length > 1) {
            logger.warn(
              `⚠️ Found ${existingFolders.length} BudgetTracker folders. Using oldest:`,
              folderIdCache
            );
            logger.warn(
              'Consider manually deleting duplicate folders in Google Drive'
            );
          } else {
            logger.log('✅ Found existing folder:', folderIdCache);
          }

          return folderIdCache;
        }

        // Create folder ONLY if none exist
        logger.log('Creating BudgetTracker folder (none found)...');
        const createResponse = await window.gapi.client.drive.files.create({
          resource: {
            name: FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
          },
          fields: 'id',
        });

        folderIdCache = createResponse.result.id;
        logger.log('✅ Created folder:', folderIdCache);
        return folderIdCache;
      } finally {
        // Clear the promise lock when done (success or failure)
        folderCreationPromise = null;
      }
    })();

    return await folderCreationPromise;
  } catch (error) {
    logger.error('❌ Error ensuring folder:', error);
    folderCreationPromise = null; // Clear lock on error
    throw error;
  }
}

/**
 * Ensure backups subfolder exists within BudgetTracker folder
 * Creates /BudgetTracker/backups/ if it doesn't exist
 *
 * @returns {Promise<string>} Backup folder ID
 */
export async function ensureBackupFolder() {
  try {
    // Return cached backup folder ID if available
    if (backupFolderIdCache) {
      logger.log('Using cached backup folder ID:', backupFolderIdCache);
      return backupFolderIdCache;
    }

    // If backup folder creation is already in progress, wait for it
    if (backupFolderCreationPromise) {
      logger.log('⏳ Backup folder creation in progress, waiting...');
      return await backupFolderCreationPromise;
    }

    // Create promise lock and start backup folder creation process
    backupFolderCreationPromise = (async () => {
      try {
        // Ensure parent BudgetTracker folder exists first
        const parentFolderId = await ensureBudgetFolder();
        logger.log('Searching for backups subfolder...');

        // Search for ALL existing backup folders with this name
        const response = await window.gapi.client.drive.files.list({
          q: `name='${BACKUP_FOLDER_NAME}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: 'files(id, name, createdTime)',
          spaces: 'drive',
          orderBy: 'createdTime', // Oldest first
        });

        const existingFolders = response.result.files || [];

        if (existingFolders.length > 0) {
          // Use the oldest folder (first in sorted list)
          backupFolderIdCache = existingFolders[0].id;

          // Log warning if multiple folders exist
          if (existingFolders.length > 1) {
            logger.warn(
              `⚠️ Found ${existingFolders.length} backup folders. Using oldest:`,
              backupFolderIdCache
            );
            logger.warn(
              'Consider manually deleting duplicate folders in Google Drive'
            );
          } else {
            logger.log('✅ Found existing backup folder:', backupFolderIdCache);
          }

          return backupFolderIdCache;
        }

        // Create backup folder ONLY if none exist
        logger.log('Creating backups subfolder (none found)...');
        const createResponse = await window.gapi.client.drive.files.create({
          resource: {
            name: BACKUP_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId],
          },
          fields: 'id',
        });

        backupFolderIdCache = createResponse.result.id;
        logger.log('✅ Created backup folder:', backupFolderIdCache);
        return backupFolderIdCache;
      } finally {
        // Clear the promise lock when done (success or failure)
        backupFolderCreationPromise = null;
      }
    })();

    return await backupFolderCreationPromise;
  } catch (error) {
    logger.error('❌ Error ensuring backup folder:', error);
    backupFolderCreationPromise = null; // Clear lock on error
    throw error;
  }
}

/**
 * Get budget data file metadata
 *
 * @returns {Promise<{fileId: string, lastModified: string}|null>} File metadata or null if not found
 */
export async function getBudgetFileMetadata() {
  try {
    const folderId = await ensureBudgetFolder();

    logger.log('Searching for budget data file...');

    // Search for file in BudgetTracker folder
    const response = await window.gapi.client.drive.files.list({
      q: `name='${FILE_NAME}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, modifiedTime)',
      spaces: 'drive',
    });

    if (response.result.files && response.result.files.length > 0) {
      const file = response.result.files[0];
      fileIdCache = file.id;
      logger.log('✅ Found budget data file:', file.id);
      return {
        fileId: file.id,
        lastModified: file.modifiedTime,
      };
    }

    logger.log('⚠️ Budget data file not found');
    return null;
  } catch (error) {
    logger.error('❌ Error getting file metadata:', error);
    throw error;
  }
}

/**
 * Download budget data from Google Drive
 *
 * @returns {Promise<{expenses: Array, budgetPeriods: Array, lastModified: string}|null>} Budget data or null if file doesn't exist
 */
export async function downloadBudgetData() {
  try {
    const metadata = await getBudgetFileMetadata();

    if (!metadata) {
      logger.log('No existing budget data file to download');
      return null;
    }

    logger.log('Downloading budget data...');

    // Download file content
    const response = await window.gapi.client.drive.files.get({
      fileId: metadata.fileId,
      alt: 'media',
    });

    const data = JSON.parse(response.body);

    logger.log('✅ Downloaded budget data:', {
      version: data.version,
      expensesCount: data.expenses?.length || 0,
      periodsCount: data.budgetPeriods?.length || 0,
      lastModified: metadata.lastModified,
    });

    // Validate downloaded data before returning
    const validation = validateDownloadedData(data);
    if (!validation.valid) {
      logger.error('❌ Downloaded data validation failed:', validation.errors);
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Log warnings but continue (data has been cleaned)
    if (validation.warnings?.length > 0) {
      validation.warnings.forEach(warning => logger.log(warning));
    }

    return {
      ...data,
      lastModified: metadata.lastModified,
    };
  } catch (error) {
    logger.error('❌ Error downloading budget data:', error);
    throw error;
  }
}

/**
 * Upload budget data to Google Drive
 * Creates file if it doesn't exist, updates if it does
 *
 * @param {Object} data - Budget data to upload
 * @param {Array} data.expenses - Expense array
 * @param {Array} data.budgetPeriods - Budget periods array
 * @returns {Promise<{success: boolean, fileId: string, lastModified: string}>} Upload result
 */
export async function uploadBudgetData(data) {
  try {
    const folderId = await ensureBudgetFolder();
    const metadata = await getBudgetFileMetadata();

    // Prepare data with version and timestamp
    const dataToUpload = {
      version: '1.0.0',
      lastModified: new Date().toISOString(),
      expenses: data.expenses || [],
      budgetPeriods: data.budgetPeriods || [],
    };

    const content = JSON.stringify(dataToUpload, null, 2);

    if (metadata) {
      // Update existing file
      logger.log('Updating existing budget data file...');

      const response = await window.gapi.client.request({
        path: `/upload/drive/v3/files/${metadata.fileId}`,
        method: 'PATCH',
        params: {
          uploadType: 'media',
        },
        body: content,
      });

      logger.log('✅ Budget data updated successfully');

      // Get updated metadata
      const updatedMetadata = await getBudgetFileMetadata();

      return {
        success: true,
        fileId: response.result.id,
        lastModified: updatedMetadata.lastModified,
      };
    } else {
      // Create new file
      logger.log('Creating new budget data file...');

      const boundary = '-------314159265358979323846';
      const delimiter = '\r\n--' + boundary + '\r\n';
      const closeDelimiter = '\r\n--' + boundary + '--';

      const fileMetadata = {
        name: FILE_NAME,
        mimeType: 'application/json',
        parents: [folderId],
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(fileMetadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        content +
        closeDelimiter;

      const response = await window.gapi.client.request({
        path: '/upload/drive/v3/files',
        method: 'POST',
        params: {
          uploadType: 'multipart',
          fields: 'id',
        },
        headers: {
          'Content-Type': 'multipart/related; boundary="' + boundary + '"',
        },
        body: multipartRequestBody,
      });

      fileIdCache = response.result.id;
      logger.log(
        '✅ Budget data file created successfully:',
        response.result.id
      );

      // Get new file metadata
      const newMetadata = await getBudgetFileMetadata();

      return {
        success: true,
        fileId: response.result.id,
        lastModified: newMetadata.lastModified,
      };
    }
  } catch (error) {
    logger.error('❌ Error uploading budget data:', error);
    throw error;
  }
}

/**
 * Check if there are updates in Google Drive
 * Compares lastModified timestamp
 *
 * @param {string} lastKnownModified - Last known modification timestamp (ISO 8601)
 * @returns {Promise<boolean>} True if remote file is newer
 */
export async function checkForUpdates(lastKnownModified) {
  try {
    const metadata = await getBudgetFileMetadata();

    if (!metadata) {
      logger.log('No remote file exists yet');
      return false;
    }

    if (!lastKnownModified) {
      logger.log('No local timestamp, remote has updates');
      return true;
    }

    const remoteTime = new Date(metadata.lastModified).getTime();
    const localTime = new Date(lastKnownModified).getTime();

    const hasUpdates = remoteTime > localTime;

    if (hasUpdates) {
      logger.log('🔄 Remote file is newer:', {
        remote: metadata.lastModified,
        local: lastKnownModified,
      });
    } else {
      logger.log('✅ Local file is up to date');
    }

    return hasUpdates;
  } catch (error) {
    logger.error('❌ Error checking for updates:', error);
    return false; // Assume no updates on error
  }
}

/**
 * Create timestamped backup file in /BudgetTracker/backups/ folder
 *
 * @param {Object} data - Budget data to backup
 * @param {Array} data.expenses - Expense array
 * @param {Array} data.budgetPeriods - Budget periods array
 * @returns {Promise<{success: boolean, fileId: string, filename: string, timestamp: string}>}
 */
export async function createBackup(data) {
  try {
    const backupFolderId = await ensureBackupFolder();

    // Generate timestamped filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.json`;

    logger.log(`Creating backup file: ${filename}...`);

    // Prepare backup data with metadata
    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      expenses: data.expenses || [],
      budgetPeriods: data.budgetPeriods || [],
    };

    const content = JSON.stringify(backupData, null, 2);

    // Use multipart upload (same pattern as uploadBudgetData)
    const boundary = '-------314159265358979323846';
    const delimiter = '\r\n--' + boundary + '\r\n';
    const closeDelimiter = '\r\n--' + boundary + '--';

    const fileMetadata = {
      name: filename,
      mimeType: 'application/json',
      parents: [backupFolderId],
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(fileMetadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      content +
      closeDelimiter;

    const response = await window.gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: {
        uploadType: 'multipart',
        fields: 'id',
      },
      headers: {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"',
      },
      body: multipartRequestBody,
    });

    logger.log('✅ Backup created successfully:', response.result.id);

    return {
      success: true,
      fileId: response.result.id,
      filename,
      timestamp: backupData.timestamp,
    };
  } catch (error) {
    logger.error('❌ Error creating backup:', error);
    throw error;
  }
}

/**
 * List all backups in /BudgetTracker/backups/ folder
 * Returns sorted by date (newest first)
 *
 * @returns {Promise<Array<{fileId: string, filename: string, modifiedTime: string, size: number}>>}
 */
export async function listBackups() {
  try {
    const backupFolderId = await ensureBackupFolder();

    logger.log('Listing backup files...');

    // Search for backup files
    const response = await window.gapi.client.drive.files.list({
      q: `'${backupFolderId}' in parents and trashed=false and mimeType='application/json'`,
      fields: 'files(id, name, modifiedTime, size)',
      spaces: 'drive',
      orderBy: 'modifiedTime desc', // Newest first
    });

    const files = response.result.files || [];
    logger.log(`✅ Found ${files.length} backup files`);

    return files.map(file => ({
      fileId: file.id,
      filename: file.name,
      modifiedTime: file.modifiedTime,
      size: parseInt(file.size) || 0,
    }));
  } catch (error) {
    logger.error('❌ Error listing backups:', error);
    // Return empty array on error (don't throw)
    return [];
  }
}

/**
 * Download specific backup file by ID
 * Validates data structure before returning
 *
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<{expenses: Array, budgetPeriods: Array, timestamp: string}>}
 */
export async function downloadBackup(fileId) {
  try {
    logger.log('Downloading backup file:', fileId);

    // Download file content
    const response = await window.gapi.client.drive.files.get({
      fileId,
      alt: 'media',
    });

    const data = JSON.parse(response.body);

    logger.log('✅ Downloaded backup data:', {
      version: data.version,
      expensesCount: data.expenses?.length || 0,
      periodsCount: data.budgetPeriods?.length || 0,
      timestamp: data.timestamp,
    });

    // Validate downloaded data before returning
    const validation = validateDownloadedData(data);
    if (!validation.valid) {
      logger.error('❌ Backup data validation failed:', validation.errors);
      validation.errors.forEach(error => logger.warn(error));

      // Return data anyway but log warnings (allow app to handle gracefully)
      logger.warn(
        '⚠️ Proceeding with potentially invalid backup data - check console for details'
      );
    }

    return {
      expenses: data.expenses || [],
      budgetPeriods: data.budgetPeriods || [],
      timestamp: data.timestamp || new Date().toISOString(),
    };
  } catch (error) {
    logger.error('❌ Error downloading backup:', error);
    throw error;
  }
}

/**
 * Delete oldest backups when count exceeds limit
 * Keeps only the last N backups (sorted by date)
 *
 * @param {number} keepCount - Number of backups to retain (default: 7)
 * @returns {Promise<{deleted: number, errors: number}>}
 */
export async function deleteOldBackups(keepCount = 7) {
  try {
    // Get all backups (already sorted newest first)
    const backups = await listBackups();

    if (backups.length <= keepCount) {
      logger.log(
        `Backup count (${backups.length}) within limit (${keepCount}), no cleanup needed`
      );
      return { deleted: 0, errors: 0 };
    }

    // Get backups to delete (oldest ones beyond keepCount)
    const toDelete = backups.slice(keepCount);
    logger.log(
      `Deleting ${toDelete.length} old backups (keeping ${keepCount} newest)...`
    );

    // Batch delete files in parallel
    const results = await Promise.allSettled(
      toDelete.map(backup =>
        window.gapi.client.drive.files.delete({ fileId: backup.fileId })
      )
    );

    // Count successes and failures
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const errorCount = results.filter(r => r.status === 'rejected').length;

    logger.log(
      `✅ Deleted ${successCount} old backups${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
    );

    return { deleted: successCount, errors: errorCount };
  } catch (error) {
    logger.error('❌ Error deleting old backups:', error);
    return { deleted: 0, errors: 1 };
  }
}

/**
 * Clear cache (for testing or troubleshooting)
 */
export function clearCache() {
  folderIdCache = null;
  fileIdCache = null;
  backupFolderIdCache = null;
  folderCreationPromise = null;
  backupFolderCreationPromise = null;
  logger.log('🗑️ Drive API cache cleared');
}

/**
 * Get current cache status (for debugging)
 */
export function getCacheStatus() {
  return {
    folderIdCache,
    fileIdCache,
    folderCreationInProgress: !!folderCreationPromise,
  };
}
