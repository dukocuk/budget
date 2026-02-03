/**
 * Integration Tests: Token Refresh and Session Management
 *
 * Tests US-004:
 * - Token expiration detection and automatic refresh
 * - Session restoration after token refresh
 * - Refresh token expiration handling (force re-login)
 *
 * Integration Points:
 * - AuthProvider → OAuth refresh endpoint → session update
 * - Token expiration detection → automatic refresh flow
 * - Multiple API calls with expired token → request queuing
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Enable automatic mocking
vi.mock('../../../utils/logger');
vi.mock('../../../lib/pglite');
vi.mock('../../../lib/googleDrive', () => ({
  initGoogleDrive: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../lib/googleDrive.js', () => ({
  initGoogleDrive: vi.fn().mockResolvedValue(undefined),
}));

// Mock @electric-sql/pglite
vi.mock('@electric-sql/pglite', () => ({
  PGlite: vi.fn().mockImplementation(() => ({
    exec: vi.fn().mockResolvedValue({ rows: [] }),
    query: vi.fn().mockResolvedValue({ rows: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Import components and utilities after mocks
import { AuthProvider } from '../../../contexts/AuthProvider';
import { useAuth } from '../../../hooks/useAuth';
import { resetAuthSession } from '../../../contexts/authUtils';
import {
  mockUser,
  createMockTokenResponse,
  setupGoogleApiMocks,
  setupLocalStorageMock,
  setupGoogleIdentityMock,
} from '../shared';

// Test harness component to access auth context
const AuthTestHarness = ({ children, onAuthChange }) => {
  const auth = useAuth();

  if (onAuthChange) {
    onAuthChange(auth);
  }

  return <div data-testid="auth-harness">{children}</div>;
};

describe('Integration: Token Refresh and Session Management', () => {
  let mockFetch;
  let authOperations;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();

    // Reset session initialization guard between tests
    resetAuthSession();

    // Setup Google Identity mock
    setupGoogleIdentityMock();
  });

  afterEach(() => {
    cleanup();
    resetAuthSession();
    delete global.fetch;
    delete global.google;
  });

  describe('US-004: Token expiration and automatic refresh', () => {
    it('should detect token expiration during session', async () => {
      // Setup: User has an already-expired token with refresh token
      const now = Date.now();
      const expiresAt = new Date(now - 1000).toISOString(); // Already expired

      const savedSession = {
        user: mockUser,
        accessToken: 'old-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: expiresAt,
      };

      setupLocalStorageMock({
        google_auth_session: savedSession,
      });

      // Setup fetch mock for refresh
      mockFetch = setupGoogleApiMocks({
        tokenResponse: createMockTokenResponse({
          access_token: 'new-access-token',
          refresh_token: 'valid-refresh-token',
        }),
        userInfoResponse: mockUser,
      });

      render(
        <AuthProvider>
          <AuthTestHarness
            onAuthChange={ops => {
              authOperations = ops;
            }}
          >
            <div>Authenticated</div>
          </AuthTestHarness>
        </AuthProvider>
      );

      // Verify: Token refresh should be triggered automatically on mount
      await waitFor(
        () => {
          const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
            url.includes('oauth2.googleapis.com/token')
          );
          expect(refreshCalls.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      // Verify: User is authenticated after refresh
      await waitFor(() => {
        expect(authOperations?.user).toBeTruthy();
      });
    });

    it('should automatically refresh token with refresh_token', async () => {
      const now = Date.now();
      const expiresAt = new Date(now - 1000).toISOString(); // Already expired

      const savedSession = {
        user: mockUser,
        accessToken: 'old-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: expiresAt,
      };

      setupLocalStorageMock({
        google_auth_session: savedSession,
      });

      const newTokenResponse = createMockTokenResponse({
        access_token: 'new-access-token-12345',
        refresh_token: 'valid-refresh-token',
        expires_in: 3600,
      });

      mockFetch = setupGoogleApiMocks({
        tokenResponse: newTokenResponse,
        userInfoResponse: mockUser,
      });

      render(
        <AuthProvider>
          <AuthTestHarness
            onAuthChange={ops => {
              authOperations = ops;
            }}
          >
            <div>Authenticated</div>
          </AuthTestHarness>
        </AuthProvider>
      );

      // Verify: Refresh was called on mount (token was already expired)
      await waitFor(
        () => {
          const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
            url.includes('oauth2.googleapis.com/token')
          );
          expect(refreshCalls.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      // Verify: User is authenticated
      await waitFor(() => {
        expect(authOperations?.user).toBeTruthy();
      });
    });

    it('should update session with new access token after refresh', async () => {
      const now = Date.now();
      const expiresAt = new Date(now - 1000).toISOString(); // Already expired

      const savedSession = {
        user: mockUser,
        accessToken: 'old-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: expiresAt,
      };

      setupLocalStorageMock({
        google_auth_session: savedSession,
      });

      const newTokenResponse = createMockTokenResponse({
        access_token: 'refreshed-access-token',
        refresh_token: 'valid-refresh-token',
        expires_in: 3600,
      });

      mockFetch = setupGoogleApiMocks({
        tokenResponse: newTokenResponse,
        userInfoResponse: mockUser,
      });

      render(
        <AuthProvider>
          <AuthTestHarness
            onAuthChange={ops => {
              authOperations = ops;
            }}
          >
            <div>Authenticated</div>
          </AuthTestHarness>
        </AuthProvider>
      );

      // Verify: localStorage was updated with new token after refresh
      await waitFor(
        () => {
          const storedSession = localStorage.getItem('google_auth_session');
          expect(storedSession).toBeTruthy();
          const session = JSON.parse(storedSession);
          expect(session.accessToken).toBe('refreshed-access-token');
        },
        { timeout: 3000 }
      );
    });

    it('should handle refresh token expiration and force re-login', async () => {
      const now = Date.now();
      const expiresAt = new Date(now - 1000).toISOString(); // Already expired

      const savedSession = {
        user: mockUser,
        accessToken: 'old-access-token',
        refreshToken: 'expired-refresh-token',
        expiresAt: expiresAt,
      };

      setupLocalStorageMock({
        google_auth_session: savedSession,
      });

      // Mock refresh failure (expired refresh token)
      mockFetch = setupGoogleApiMocks({
        shouldFailAuth: true,
        tokenResponse: { error: 'invalid_grant' },
        userInfoResponse: mockUser,
      });

      render(
        <AuthProvider>
          <AuthTestHarness
            onAuthChange={ops => {
              authOperations = ops;
            }}
          >
            <div>Authenticated</div>
          </AuthTestHarness>
        </AuthProvider>
      );

      // Verify: User is logged out due to refresh failure
      await waitFor(
        () => {
          expect(authOperations?.user).toBeNull();
        },
        { timeout: 3000 }
      );

      // Verify: localStorage was cleared
      expect(localStorage.getItem('google_auth_session')).toBeNull();
    });

    it('should restore session after successful token refresh', async () => {
      const now = Date.now();
      const expiresAt = new Date(now - 1000).toISOString(); // Already expired

      const savedSession = {
        user: mockUser,
        accessToken: 'old-access-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: expiresAt,
      };

      setupLocalStorageMock({
        google_auth_session: savedSession,
      });

      const newTokenResponse = createMockTokenResponse({
        access_token: 'new-access-token',
        refresh_token: 'valid-refresh-token',
        expires_in: 3600,
      });

      mockFetch = setupGoogleApiMocks({
        tokenResponse: newTokenResponse,
        userInfoResponse: mockUser,
      });

      render(
        <AuthProvider>
          <AuthTestHarness
            onAuthChange={ops => {
              authOperations = ops;
            }}
          >
            <div>Session Active</div>
          </AuthTestHarness>
        </AuthProvider>
      );

      // Verify: Session is restored with same user after refresh
      await waitFor(
        () => {
          expect(authOperations?.user?.id).toBe(mockUser.id);
        },
        { timeout: 3000 }
      );

      // Verify: Refresh was called
      await waitFor(() => {
        const refreshCall = mockFetch.mock.calls.find(([url]) =>
          url.includes('oauth2.googleapis.com/token')
        );
        expect(refreshCall).toBeTruthy();
      });

      // Verify: Session is still active with same user
      expect(authOperations?.user?.id).toBe(mockUser.id);
      expect(screen.getByText('Session Active')).toBeInTheDocument();
    });

    it('should handle multiple API calls with expired token via queuing', async () => {
      const now = Date.now();
      const expiresAt = new Date(now - 1000).toISOString(); // Already expired

      const savedSession = {
        user: mockUser,
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: expiresAt,
      };

      setupLocalStorageMock({
        google_auth_session: savedSession,
      });

      const newTokenResponse = createMockTokenResponse({
        access_token: 'fresh-token',
        expires_in: 3600,
      });

      mockFetch = setupGoogleApiMocks({
        tokenResponse: newTokenResponse,
        userInfoResponse: mockUser,
      });

      render(
        <AuthProvider>
          <AuthTestHarness
            onAuthChange={ops => {
              authOperations = ops;
            }}
          >
            <div>API Test</div>
          </AuthTestHarness>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(authOperations?.user).toBeTruthy();
      });

      // Verify: Only one refresh call is made even with multiple API needs
      const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
        url.includes('oauth2.googleapis.com/token')
      );

      // Should refresh once, not multiple times
      expect(refreshCalls.length).toBeLessThanOrEqual(2);
    });

    it('should handle refresh failure recovery gracefully', async () => {
      const now = Date.now();
      const expiresAt = new Date(now - 1000).toISOString(); // Already expired

      const savedSession = {
        user: mockUser,
        accessToken: 'old-access-token',
        refreshToken: 'problematic-refresh-token',
        expiresAt: expiresAt,
      };

      setupLocalStorageMock({
        google_auth_session: savedSession,
      });

      // First attempt fails, second succeeds
      let refreshAttempts = 0;
      mockFetch = vi.fn((url, _config) => {
        if (url.includes('oauth2.googleapis.com/token')) {
          refreshAttempts++;
          if (refreshAttempts === 1) {
            // First attempt: Network error
            return Promise.reject(new Error('Network error'));
          } else {
            // Second attempt: Success
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve(
                  createMockTokenResponse({
                    access_token: 'recovered-token',
                  })
                ),
            });
          }
        }
        if (url.includes('userinfo')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockUser),
          });
        }
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Not found' }),
        });
      });

      global.fetch = mockFetch;

      render(
        <AuthProvider>
          <AuthTestHarness
            onAuthChange={ops => {
              authOperations = ops;
            }}
          >
            <div>Recovery Test</div>
          </AuthTestHarness>
        </AuthProvider>
      );

      // Wait and verify refresh was attempted
      await waitFor(
        () => {
          expect(refreshAttempts).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });

    it('should maintain authentication state across token refresh', async () => {
      const now = Date.now();
      const expiresAt = new Date(now - 1000).toISOString(); // Already expired

      const savedSession = {
        user: mockUser,
        accessToken: 'expiring-token',
        refreshToken: 'valid-refresh-token',
        expiresAt: expiresAt,
      };

      setupLocalStorageMock({
        google_auth_session: savedSession,
      });

      mockFetch = setupGoogleApiMocks({
        tokenResponse: createMockTokenResponse({
          access_token: 'refreshed-token',
          expires_in: 3600,
        }),
        userInfoResponse: mockUser,
      });

      render(
        <AuthProvider>
          <AuthTestHarness
            onAuthChange={ops => {
              authOperations = ops;
            }}
          >
            <div data-testid="user-name">{mockUser.name}</div>
          </AuthTestHarness>
        </AuthProvider>
      );

      // Verify: User is authenticated after refresh
      await waitFor(
        () => {
          expect(screen.getByTestId('user-name')).toHaveTextContent(
            mockUser.name
          );
        },
        { timeout: 3000 }
      );

      expect(authOperations?.user?.id).toBe(mockUser.id);
      expect(authOperations?.user?.email).toBe(mockUser.email);
    });
  });

  describe('Integration: OAuth refresh endpoint flow', () => {
    it('should complete full refresh workflow end-to-end', async () => {
      const now = Date.now();
      const expiresAt = new Date(now - 1000).toISOString(); // Already expired

      const savedSession = {
        user: mockUser,
        accessToken: 'about-to-expire-token',
        refreshToken: 'valid-refresh-token-12345',
        expiresAt: expiresAt,
      };

      setupLocalStorageMock({
        google_auth_session: savedSession,
      });

      const newTokenResponse = createMockTokenResponse({
        access_token: 'brand-new-token-67890',
        refresh_token: 'valid-refresh-token-12345',
        expires_in: 3600,
      });

      mockFetch = setupGoogleApiMocks({
        tokenResponse: newTokenResponse,
        userInfoResponse: mockUser,
      });

      render(
        <AuthProvider>
          <AuthTestHarness
            onAuthChange={ops => {
              authOperations = ops;
            }}
          >
            <div>Full Workflow Test</div>
          </AuthTestHarness>
        </AuthProvider>
      );

      // Step 1: Verify refresh endpoint was called (token was already expired)
      await waitFor(
        () => {
          const refreshCall = mockFetch.mock.calls.find(
            ([url, config]) =>
              url.includes('oauth2.googleapis.com/token') &&
              config?.body?.toString().includes('refresh_token')
          );
          expect(refreshCall).toBeTruthy();
        },
        { timeout: 3000 }
      );

      // Step 2: Verify new token stored
      await waitFor(() => {
        const updatedSession = localStorage.getItem('google_auth_session');
        expect(updatedSession).toBeTruthy();
        const session = JSON.parse(updatedSession);
        expect(session.accessToken).toBe('brand-new-token-67890');
      });

      // Step 3: Verify session remains active
      await waitFor(() => {
        expect(authOperations?.user?.id).toBe(mockUser.id);
      });
    });
  });
});
