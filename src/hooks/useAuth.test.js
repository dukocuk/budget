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
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageStore = {};
    mockInitGoogleDrive.mockResolvedValue(undefined);
    global.fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          sub: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
        }),
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

    it('should start with initializing stage', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.loadingState.stage).toBe('initializing');
    });
  });

  describe('handleGoogleSignIn', () => {
    it('should process token response and store session', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const tokenResponse = {
        access_token: 'test-access-token',
        expires_in: 3600,
      };

      await act(async () => {
        await result.current.handleGoogleSignIn(tokenResponse);
      });

      await waitFor(() => {
        expect(result.current.user).not.toBe(null);
        expect(result.current.user.email).toBe('test@example.com');
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(mockInitGoogleDrive).toHaveBeenCalledWith('test-access-token');
    });

    it('should handle missing access token', async () => {
      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.handleGoogleSignIn({});
      });

      await waitFor(() => {
        expect(result.current.error).toBe(
          'No access token received from Google'
        );
      });
    });

    it('should handle userinfo fetch failure', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.handleGoogleSignIn({ access_token: 'bad-token' });
      });

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
          access_token: 'test-token',
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
