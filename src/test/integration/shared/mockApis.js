/**
 * Mock API Utilities for Integration Tests
 *
 * Provides mock implementations for:
 * - Google OAuth API
 * - Google Drive API
 * - Google UserInfo API
 */

import { vi } from 'vitest';
import {
  createMockTokenResponse,
  createMockDriveFile,
  createMockSyncPayload,
} from './mockData';

/**
 * Setup comprehensive Google API mocks
 */
export const setupGoogleApiMocks = (options = {}) => {
  const {
    userInfoResponse = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    },
    tokenResponse = createMockTokenResponse(),
    driveFileResponse = createMockDriveFile(),
    syncData = createMockSyncPayload(),
    shouldFailAuth = false,
    shouldFailDrive = false,
    shouldFailSync = false,
  } = options;

  const mockFetch = vi.fn((url, config) => {
    // OAuth token endpoint
    if (url.includes('oauth2.googleapis.com/token')) {
      if (shouldFailAuth) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'invalid_grant' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(tokenResponse),
      });
    }

    // UserInfo endpoint
    if (url.includes('www.googleapis.com/oauth2/v2/userinfo')) {
      if (shouldFailAuth) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Invalid credentials' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(userInfoResponse),
      });
    }

    // Google Drive API - List files
    if (
      url.includes('drive.google.com/drive/v3/files') &&
      config?.method !== 'POST' &&
      config?.method !== 'PATCH'
    ) {
      if (shouldFailDrive) {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ error: 'Permission denied' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            files: [driveFileResponse],
          }),
      });
    }

    // Google Drive API - Upload/Create file
    if (
      url.includes('www.googleapis.com/upload/drive/v3/files') ||
      (url.includes('drive.google.com/drive/v3/files') &&
        config?.method === 'POST')
    ) {
      if (shouldFailDrive) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Upload failed' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(driveFileResponse),
      });
    }

    // Google Drive API - Update file
    if (
      url.includes('drive.google.com/drive/v3/files') &&
      config?.method === 'PATCH'
    ) {
      if (shouldFailDrive) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Update failed' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(driveFileResponse),
      });
    }

    // Google Drive API - Download file content
    if (
      url.includes('drive.google.com/drive/v3/files/') &&
      url.includes('alt=media')
    ) {
      if (shouldFailSync) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'File not found' }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(syncData),
      });
    }

    // Default: unhandled endpoint
    console.warn(`Unhandled fetch URL in mock: ${url}`);
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    });
  });

  global.fetch = mockFetch;
  return mockFetch;
};

/**
 * Setup mock for successful OAuth flow
 */
export const setupSuccessfulOAuth = () => {
  return setupGoogleApiMocks({
    shouldFailAuth: false,
    shouldFailDrive: false,
  });
};

/**
 * Setup mock for failed OAuth flow
 */
export const setupFailedOAuth = (errorType = 'invalid_grant') => {
  return setupGoogleApiMocks({
    shouldFailAuth: true,
    tokenResponse: { error: errorType },
  });
};

/**
 * Setup mock for successful Drive sync
 */
export const setupSuccessfulDriveSync = syncData => {
  return setupGoogleApiMocks({
    syncData,
    shouldFailDrive: false,
    shouldFailSync: false,
  });
};

/**
 * Setup mock for failed Drive sync
 */
export const setupFailedDriveSync = () => {
  return setupGoogleApiMocks({
    shouldFailDrive: true,
    shouldFailSync: true,
  });
};

/**
 * Mock Google Identity Services (GIS) library
 */
export const setupGoogleIdentityMock = () => {
  // Mock the google.accounts.oauth2 library
  global.google = {
    accounts: {
      oauth2: {
        initCodeClient: vi.fn(config => ({
          requestCode: vi.fn(() => {
            // Simulate successful code request
            if (config.callback) {
              config.callback({
                code: 'mock-auth-code-12345',
              });
            }
          }),
        })),
        initTokenClient: vi.fn(config => ({
          requestAccessToken: vi.fn(() => {
            // Simulate successful token request
            if (config.callback) {
              config.callback({
                access_token: 'mock-access-token-12345',
                expires_in: 3600,
              });
            }
          }),
        })),
      },
    },
  };

  return global.google;
};

/**
 * Mock localStorage for token storage
 */
export const setupLocalStorageMock = (initialData = {}) => {
  const store = {
    user: null,
    access_token: null,
    refresh_token: null,
    token_expiry: null,
    ...initialData,
  };

  const localStorageMock = {
    getItem: vi.fn(key => {
      return store[key] ? JSON.stringify(store[key]) : null;
    }),
    setItem: vi.fn((key, value) => {
      store[key] = JSON.parse(value);
    }),
    removeItem: vi.fn(key => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };

  global.localStorage = localStorageMock;
  return localStorageMock;
};

/**
 * Mock sessionStorage
 */
export const setupSessionStorageMock = (initialData = {}) => {
  const store = { ...initialData };

  const sessionStorageMock = {
    getItem: vi.fn(key => {
      return store[key] ? JSON.stringify(store[key]) : null;
    }),
    setItem: vi.fn((key, value) => {
      store[key] = JSON.parse(value);
    }),
    removeItem: vi.fn(key => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };

  global.sessionStorage = sessionStorageMock;
  return sessionStorageMock;
};

/**
 * Simulate network delay
 */
export const simulateNetworkDelay = (ms = 100) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Create mock for online/offline detection
 */
export const setupOnlineStatusMock = (isOnline = true) => {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: isOnline,
  });

  const dispatchOnlineEvent = () => {
    window.dispatchEvent(new Event('online'));
  };

  const dispatchOfflineEvent = () => {
    window.dispatchEvent(new Event('offline'));
  };

  return {
    setOnline: () => {
      navigator.onLine = true;
      dispatchOnlineEvent();
    },
    setOffline: () => {
      navigator.onLine = false;
      dispatchOfflineEvent();
    },
  };
};

/**
 * Reset all mocks
 */
export const resetAllMocks = () => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  delete global.fetch;
  delete global.google;
};
