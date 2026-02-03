/**
 * Integration Tests for AuthProvider
 * Comprehensive coverage of authentication flows and session management
 *
 * Priority: HIGH (0% → 75%+ coverage target)
 * Critical: OAuth authentication, token refresh, session restoration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup, act } from '@testing-library/react';
import { useContext } from 'react';
import { AuthProvider } from './AuthProvider';
import { AuthContext } from './AuthContext';
import { resetAuthSession } from './authUtils';
import * as googleDrive from '../lib/googleDrive';

// Mock dependencies
vi.mock('../utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../lib/googleDrive', () => ({
  initGoogleDrive: vi.fn(),
}));

describe('AuthProvider Integration Tests', () => {
  let mockFetch;

  const mockTokenResponse = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
  };

  const mockUserInfo = {
    sub: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://example.com/photo.jpg',
  };

  const mockSession = {
    user: {
      id: 'user-123',
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/photo.jpg',
    },
    accessToken: 'stored-access-token',
    refreshToken: 'stored-refresh-token',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };

  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();

    // ⚠️ CRITICAL: Reset singleton guard
    resetAuthSession();

    // Clear localStorage
    localStorage.clear();

    // Mock window.gapi (prevents 10s timeout)
    global.window.gapi = {
      load: vi.fn((name, callback) => callback()),
      client: {
        init: vi.fn().mockResolvedValue(undefined),
        setToken: vi.fn(),
        drive: { files: {} },
      },
    };

    // Mock fetch for all Google endpoints
    mockFetch = vi.fn(url => {
      if (url.includes('oauth2.googleapis.com/token')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        });
      }
      if (url.includes('userinfo')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUserInfo),
        });
      }
      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
    global.fetch = mockFetch;

    // Mock initGoogleDrive
    googleDrive.initGoogleDrive.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ===== 1. Authentication Flow (6 tests) =====
  describe('Authentication Flow', () => {
    it('should complete OAuth code exchange and fetch user info', async () => {
      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      const mockCodeResponse = { code: 'auth-code-123' };

      await act(async () => {
        await result.current.handleGoogleSignIn(mockCodeResponse);
      });

      await waitFor(
        () => {
          // Check token endpoint was called
          const tokenCalls = mockFetch.mock.calls.filter(call =>
            call[0].includes('oauth2.googleapis.com/token')
          );
          expect(tokenCalls.length).toBeGreaterThan(0);
          expect(tokenCalls[0][1].method).toBe('POST');
        },
        { timeout: 5000 }
      );

      await waitFor(
        () => {
          // Check userinfo endpoint was called
          const userInfoCalls = mockFetch.mock.calls.filter(call =>
            call[0].includes('userinfo')
          );
          expect(userInfoCalls.length).toBeGreaterThan(0);
          expect(userInfoCalls[0][1].headers.Authorization).toBe(
            'Bearer mock-access-token'
          );
        },
        { timeout: 5000 }
      );
    });

    it('should store user session in localStorage', async () => {
      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      const mockCodeResponse = { code: 'auth-code-123' };

      await act(async () => {
        await result.current.handleGoogleSignIn(mockCodeResponse);
      });

      await waitFor(
        () => {
          const storedSession = JSON.parse(
            localStorage.getItem('google_auth_session')
          );
          expect(storedSession).toMatchObject({
            user: {
              id: 'user-123',
              email: 'test@example.com',
              name: 'Test User',
            },
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
          });
          expect(storedSession.expiresAt).toBeDefined();
        },
        { timeout: 3000 }
      );
    });

    it('should initialize Google Drive after successful login', async () => {
      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      const mockCodeResponse = { code: 'auth-code-123' };

      await act(async () => {
        await result.current.handleGoogleSignIn(mockCodeResponse);
      });

      await waitFor(
        () => {
          expect(googleDrive.initGoogleDrive).toHaveBeenCalledWith(
            'mock-access-token'
          );
        },
        { timeout: 3000 }
      );
    });

    it('should update loading state through auth stages', async () => {
      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      expect(result.current.loading).toBe(false);

      const mockCodeResponse = { code: 'auth-code-123' };

      act(() => {
        result.current.handleGoogleSignIn(mockCodeResponse);
      });

      // Should start loading
      await waitFor(
        () => {
          expect(result.current.loading).toBe(true);
        },
        { timeout: 1000 }
      );

      // Should complete loading
      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
          expect(result.current.user).toBeTruthy();
        },
        { timeout: 3000 }
      );
    });

    it('should set user state after successful authentication', async () => {
      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      const mockCodeResponse = { code: 'auth-code-123' };

      await act(async () => {
        await result.current.handleGoogleSignIn(mockCodeResponse);
      });

      await waitFor(
        () => {
          expect(result.current.user).toMatchObject({
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
          });
        },
        { timeout: 3000 }
      );
    });

    it('should tolerate Google Drive initialization failure', async () => {
      googleDrive.initGoogleDrive.mockRejectedValueOnce(
        new Error('Drive init failed')
      );

      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      const mockCodeResponse = { code: 'auth-code-123' };

      await act(async () => {
        await result.current.handleGoogleSignIn(mockCodeResponse);
      });

      await waitFor(
        () => {
          expect(result.current.user).toBeTruthy();
          expect(result.current.error).toContain('Google Drive fejlede');
        },
        { timeout: 3000 }
      );
    });
  });

  // ===== 2. Session Restoration (5 tests) =====
  describe('Session Restoration', () => {
    it('should restore valid session from localStorage', async () => {
      localStorage.setItem('google_auth_session', JSON.stringify(mockSession));

      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(result.current.user).toMatchObject({
            id: 'user-123',
            email: 'test@example.com',
          });
        },
        { timeout: 3000 }
      );
    });

    it('should initialize Google Drive when restoring session', async () => {
      localStorage.setItem('google_auth_session', JSON.stringify(mockSession));

      renderHook(() => useContext(AuthContext), { wrapper });

      await waitFor(
        () => {
          expect(googleDrive.initGoogleDrive).toHaveBeenCalledWith(
            'stored-access-token'
          );
        },
        { timeout: 3000 }
      );
    });

    it('should not double-load session in Strict Mode', async () => {
      localStorage.setItem('google_auth_session', JSON.stringify(mockSession));

      renderHook(() => useContext(AuthContext), { wrapper });

      await waitFor(
        () => {
          expect(googleDrive.initGoogleDrive).toHaveBeenCalledTimes(1);
        },
        { timeout: 3000 }
      );
    });

    it('should clear expired session without refresh token', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 10000).toISOString(), // Expired
        refreshToken: undefined,
      };

      localStorage.setItem(
        'google_auth_session',
        JSON.stringify(expiredSession)
      );

      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(result.current.user).toBeNull();
          expect(localStorage.getItem('google_auth_session')).toBeNull();
        },
        { timeout: 3000 }
      );
    });

    it('should handle Drive init failure during session restore', async () => {
      googleDrive.initGoogleDrive.mockRejectedValueOnce(
        new Error('Drive failed')
      );

      localStorage.setItem('google_auth_session', JSON.stringify(mockSession));

      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(result.current.user).toBeNull();
          expect(result.current.error).toBe(
            'Session udløbet. Log venligst ind igen.'
          );
        },
        { timeout: 3000 }
      );
    });
  });

  // ===== 3. Token Refresh (5 tests) =====
  describe('Token Refresh', () => {
    it('should refresh token when expired with valid refresh token', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 10000).toISOString(), // Expired
      };

      localStorage.setItem(
        'google_auth_session',
        JSON.stringify(expiredSession)
      );

      renderHook(() => useContext(AuthContext), { wrapper });

      await waitFor(
        () => {
          // Check token refresh endpoint was called
          const tokenCalls = mockFetch.mock.calls.filter(call =>
            call[0].includes('oauth2.googleapis.com/token')
          );
          expect(tokenCalls.length).toBeGreaterThan(0);
          expect(tokenCalls[0][1].method).toBe('POST');
        },
        { timeout: 5000 }
      );
    });

    it('should update localStorage with new access token after refresh', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 10000).toISOString(),
      };

      localStorage.setItem(
        'google_auth_session',
        JSON.stringify(expiredSession)
      );

      renderHook(() => useContext(AuthContext), { wrapper });

      await waitFor(
        () => {
          const updatedSession = JSON.parse(
            localStorage.getItem('google_auth_session')
          );
          expect(updatedSession.accessToken).toBe('mock-access-token');
        },
        { timeout: 3000 }
      );
    });

    it('should re-initialize Google Drive with new token', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 10000).toISOString(),
      };

      localStorage.setItem(
        'google_auth_session',
        JSON.stringify(expiredSession)
      );

      renderHook(() => useContext(AuthContext), { wrapper });

      await waitFor(
        () => {
          expect(googleDrive.initGoogleDrive).toHaveBeenCalledWith(
            'mock-access-token'
          );
        },
        { timeout: 3000 }
      );
    });

    it('should restore user after successful token refresh', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 10000).toISOString(),
      };

      localStorage.setItem(
        'google_auth_session',
        JSON.stringify(expiredSession)
      );

      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(result.current.user).toMatchObject({
            id: 'user-123',
            email: 'test@example.com',
          });
        },
        { timeout: 3000 }
      );
    });

    it('should clear session when token refresh fails', async () => {
      mockFetch.mockImplementationOnce(url => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({
                error: 'invalid_grant',
                error_description: 'Token expired',
              }),
          });
        }
      });

      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 10000).toISOString(),
      };

      localStorage.setItem(
        'google_auth_session',
        JSON.stringify(expiredSession)
      );

      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      await waitFor(
        () => {
          expect(result.current.user).toBeNull();
          expect(localStorage.getItem('google_auth_session')).toBeNull();
        },
        { timeout: 3000 }
      );
    });
  });

  // ===== 4. Error Scenarios (5 tests) =====
  describe('Error Scenarios', () => {
    it('should handle missing authorization code', async () => {
      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      const mockCodeResponse = {}; // No code

      await act(async () => {
        await result.current.handleGoogleSignIn(mockCodeResponse);
      });

      await waitFor(
        () => {
          expect(result.current.error).toContain(
            'No authorization code received'
          );
        },
        { timeout: 3000 }
      );
    });

    it('should handle token exchange failure', async () => {
      mockFetch.mockImplementationOnce(url => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({
                error: 'invalid_request',
                error_description: 'Invalid code',
              }),
          });
        }
      });

      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      const mockCodeResponse = { code: 'invalid-code' };

      await act(async () => {
        await result.current.handleGoogleSignIn(mockCodeResponse);
      });

      await waitFor(
        () => {
          expect(result.current.error).toContain('Token exchange failed');
        },
        { timeout: 3000 }
      );
    });

    it('should handle user info fetch failure', async () => {
      mockFetch.mockImplementation(url => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTokenResponse),
          });
        }
        if (url.includes('userinfo')) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'Unauthorized' }),
          });
        }
      });

      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      const mockCodeResponse = { code: 'auth-code-123' };

      await act(async () => {
        await result.current.handleGoogleSignIn(mockCodeResponse);
      });

      await waitFor(
        () => {
          expect(result.current.error).toContain('Failed to fetch user info');
        },
        { timeout: 3000 }
      );
    });

    it('should set error state for Danish error messages', async () => {
      mockFetch.mockImplementationOnce(url => {
        if (url.includes('oauth2.googleapis.com/token')) {
          return Promise.resolve({
            ok: false,
            json: () =>
              Promise.resolve({
                error: 'invalid_grant',
              }),
          });
        }
      });

      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      const mockCodeResponse = { code: 'invalid-code' };

      await act(async () => {
        await result.current.handleGoogleSignIn(mockCodeResponse);
      });

      await waitFor(
        () => {
          expect(result.current.error).toBeTruthy();
        },
        { timeout: 3000 }
      );
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      const mockCodeResponse = { code: 'auth-code-123' };

      await act(async () => {
        await result.current.handleGoogleSignIn(mockCodeResponse);
      });

      await waitFor(
        () => {
          expect(result.current.error).toBeTruthy();
        },
        { timeout: 3000 }
      );
    });
  });

  // ===== 5. Sign Out (3 tests) =====
  describe('Sign Out', () => {
    it('should clear localStorage on sign out', async () => {
      localStorage.setItem('google_auth_session', JSON.stringify(mockSession));

      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      // Mock window.location.reload
      delete window.location;
      window.location = { reload: vi.fn() };

      await act(async () => {
        await result.current.signOut();
      });

      expect(localStorage.getItem('google_auth_session')).toBeNull();
    });

    it('should reset user state on sign out', async () => {
      localStorage.setItem('google_auth_session', JSON.stringify(mockSession));

      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      delete window.location;
      window.location = { reload: vi.fn() };

      await act(async () => {
        await result.current.signOut();
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });

    it('should reload window after sign out', async () => {
      localStorage.setItem('google_auth_session', JSON.stringify(mockSession));

      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      delete window.location;
      window.location = { reload: vi.fn() };

      await act(async () => {
        await result.current.signOut();
      });

      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  // ===== 6. Retry Mechanism (3 tests) =====
  describe('Retry Mechanism', () => {
    it('should reload window on retryAuth', async () => {
      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      delete window.location;
      window.location = { reload: vi.fn() };

      act(() => {
        result.current.retryAuth();
      });

      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should reset loading state on retryAuth', async () => {
      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      delete window.location;
      window.location = { reload: vi.fn() };

      act(() => {
        result.current.retryAuth();
      });

      await waitFor(() => {
        expect(result.current.loadingState.stage).toBe('initializing');
      });
    });

    it('should clear error state on retryAuth', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useContext(AuthContext), {
        wrapper,
      });

      const mockCodeResponse = { code: 'auth-code-123' };

      await act(async () => {
        await result.current.handleGoogleSignIn(mockCodeResponse);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      delete window.location;
      window.location = { reload: vi.fn() };

      act(() => {
        result.current.retryAuth();
      });

      await waitFor(() => {
        expect(result.current.loadingState.errorMessage).toBeNull();
      });
    });
  });
});
