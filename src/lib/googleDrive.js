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
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
];

// File metadata cache
let folderIdCache = null;
let fileIdCache = null;

// Promise lock to prevent concurrent folder creation
let folderCreationPromise = null;

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
    console.error('💥 Full error details:', {
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
 * @returns {Promise<{expenses: Array, budgetPeriods: Array, settings: Object, lastModified: string}|null>} Budget data or null if file doesn't exist
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
      validation.errors.forEach(error => logger.warn(error));

      // Return data anyway but log warnings (allow app to handle gracefully)
      logger.warn(
        '⚠️ Proceeding with potentially invalid data - check console for details'
      );
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
 * @param {Object} data.settings - Settings object (optional, for backward compatibility)
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
      settings: data.settings || {}, // For backward compatibility
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
 * Clear cache (for testing or troubleshooting)
 */
export function clearCache() {
  folderIdCache = null;
  fileIdCache = null;
  folderCreationPromise = null;
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
