/**
 * Tests for useAuth hook
 * Tests authentication flows, session management, and Google OAuth integration
 *
 * The hook uses:
 * - localStorage for session persistence
 * - Google userinfo endpoint for user data
 * - initGoogleDrive for Drive API initialization
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAuth } from './useAuth';

// Mock Google Drive initialization
const mockInitGoogleDrive = vi.fn();
vi.mock('../lib/googleDrive', () => ({
  initGoogleDrive: (...args) => mockInitGoogleDrive(...args),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock localStorage
let localStorageStore = {};
const localStorageMock = {
  getItem: vi.fn(key => localStorageStore[key] || null),
  setItem: vi.fn((key, value) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn(key => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    localStorageStore = {};
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock fetch for Google userinfo endpoint
global.fetch = vi.fn();

// Mock window.location.reload
const originalLocation = window.location;
delete window.location;
window.location = { ...originalLocation, reload: vi.fn() };

describe('useAuth', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorageStore = {};
    mockInitGoogleDrive.mockResolvedValue(undefined);

    // ✅ CRITICAL: Reset module-level singleton guard before each test
    // This allows each test to initialize sessions independently
    const { resetAuthSingletons } = await import('./useAuth');
    if (resetAuthSingletons) {
      resetAuthSingletons();
    }

    // Mock token exchange endpoint (first call)
    // Mock userinfo endpoint (second call)
    global.fetch.mockImplementation(url => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: 'test-access-token',
              refresh_token: 'test-refresh-token',
              expires_in: 3600,
            }),
        });
      }
      if (url.includes('googleapis.com/oauth2/v3/userinfo')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              sub: 'user-123',
              email: 'test@example.com',
              name: 'Test User',
              picture: 'https://example.com/avatar.jpg',
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct default values', async () => {
      const { result } = renderHook(() => useAuth());

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // After loading completes with no session, user should be null
      expect(result.current.user).toBe(null);
      expect(result.current.error).toBe(null);
    });

    it('should check localStorage for existing session on mount', async () => {
      renderHook(() => useAuth());

      await waitFor(() => {
        expect(localStorageMock.getItem).toHaveBeenCalledWith(
          'google_auth_session'
        );
      });
    });

    it('should finish loading with no user when no session exists', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.user).toBe(null);
      });
    });

    it('should restore user from valid saved session', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          sub: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
        },
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      };
      localStorageStore['google_auth_session'] = JSON.stringify(mockSession);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.user).toEqual(mockSession.user);
      });
    });

    it('should clear expired session', async () => {
      const expiredSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
        accessToken: 'expired-token',
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      };
      localStorageStore['google_auth_session'] = JSON.stringify(expiredSession);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.user).toBe(null);
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'google_auth_session'
      );
    });
  });

  describe('loadingState', () => {
    it('should have loadingState object with correct properties', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.loadingState).toHaveProperty('isLoading');
      expect(result.current.loadingState).toHaveProperty('stage');
      expect(result.current.loadingState).toHaveProperty('message');
      expect(result.current.loadingState).toHaveProperty('progress');
    });

    it('should start with complete stage when no saved session', () => {
      // Clear any saved session to test default state
      localStorage.removeItem('google_auth_session');
      const { result } = renderHook(() => useAuth());

      expect(result.current.loadingState.stage).toBe('complete');
      expect(result.current.loadingState.isLoading).toBe(false);
    });

    it('should start with loading state when saved session exists', () => {
      // Add a saved session to test loading state
      localStorage.setItem(
        'google_auth_session',
        JSON.stringify({
          user: { sub: '123', email: 'test@example.com' },
          accessToken: 'test_token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        })
      );

      const { result } = renderHook(() => useAuth());

      // Stage should be either 'initializing' or 'connecting' (as it processes quickly)
      expect(['initializing', 'connecting']).toContain(
        result.current.loadingState.stage
      );
      expect(result.current.loadingState.isLoading).toBe(true);
    });
  });

  describe('handleGoogleSignIn', () => {
    it('should process token response and store session', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const codeResponse = {
        code: 'test-authorization-code',
      };

      await act(async () => {
        await result.current.handleGoogleSignIn(codeResponse);
      });

      await waitFor(() => {
        expect(result.current.user).not.toBe(null);
        expect(result.current.user.email).toBe('test@example.com');
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(mockInitGoogleDrive).toHaveBeenCalledWith('test-access-token');
    });

    it('should handle missing access token', async () => {
      // Mock token endpoint to return response without access_token
      global.fetch.mockImplementation(url => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                refresh_token: 'test-refresh-token',
                expires_in: 3600,
                // Missing access_token
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.handleGoogleSignIn({ code: 'test-code' });
      });

      // Wait for loading to complete (finally block has run)
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Now check error state
      await waitFor(() => {
        expect(result.current.error).toBe('No access token in token response');
      });
    });

    it('should handle userinfo fetch failure', async () => {
      // Mock token exchange to succeed, but userinfo to fail
      global.fetch.mockImplementation(url => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                access_token: 'test-access-token',
                refresh_token: 'test-refresh-token',
                expires_in: 3600,
              }),
          });
        }
        if (url.includes('googleapis.com/oauth2/v3/userinfo')) {
          return Promise.resolve({
            ok: false,
            status: 401,
          });
        }
        return Promise.resolve({
          ok: false,
          status: 401,
        });
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.handleGoogleSignIn({ code: 'test-code' });
      });

      // Wait for loading to complete (finally block has run)
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Now check error state
      await waitFor(() => {
        expect(result.current.error).toBe('Failed to fetch user info');
      });
    });

    it('should continue even if Google Drive init fails', async () => {
      mockInitGoogleDrive.mockRejectedValueOnce(new Error('Drive init failed'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.handleGoogleSignIn({
          code: 'test-authorization-code',
        });
      });

      await waitFor(() => {
        // User should still be set even if Drive fails
        expect(result.current.user).not.toBe(null);
        // Error should indicate Drive failure
        expect(result.current.error).toContain('Google Drive');
      });
    });
  });

  describe('signOut', () => {
    it('should clear session and user', async () => {
      // Set up an authenticated state first
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
        accessToken: 'valid-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };
      localStorageStore['google_auth_session'] = JSON.stringify(mockSession);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).not.toBe(null);
      });

      await act(async () => {
        await result.current.signOut();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'google_auth_session'
      );
    });
  });

  describe('retryAuth', () => {
    it('should reset loading state and reload', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.retryAuth();
      });

      expect(result.current.loadingState.stage).toBe('initializing');
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('Return Values', () => {
    it('should return all required properties', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('loadingState');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('handleGoogleSignIn');
      expect(result.current).toHaveProperty('signOut');
      expect(result.current).toHaveProperty('retryAuth');
      expect(typeof result.current.handleGoogleSignIn).toBe('function');
      expect(typeof result.current.signOut).toBe('function');
      expect(typeof result.current.retryAuth).toBe('function');
    });
  });
});
