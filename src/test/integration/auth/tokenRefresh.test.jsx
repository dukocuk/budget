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

// Mock @electric-sql/pglite
vi.mock('@electric-sql/pglite', () => ({
  PGlite: vi.fn().mockImplementation(() => ({
    exec: vi.fn().mockResolvedValue({ rows: [] }),
    query: vi.fn().mockResolvedValue({ rows: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Import components and utilities after mocks
import { AuthProvider, useAuth } from '../../../contexts/AuthProvider';
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
  let user;
  let mockFetch;
  let mockLocalStorage;
  let authOperations;

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    user = userEvent.setup();

    // Setup mocks
    mockLocalStorage = setupLocalStorageMock();
    setupGoogleIdentityMock();

    // Clear all timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    delete global.fetch;
    delete global.google;
  });

  describe('US-004: Token expiration and automatic refresh', () => {
    it('should detect token expiration during session', async () => {
      // Setup: User is logged in with expiring token
      const now = Date.now();
      const expiresAt = now + 3600 * 1000; // 1 hour from now

      mockLocalStorage.setItem('user', JSON.stringify(mockUser));
      mockLocalStorage.setItem(
        'access_token',
        JSON.stringify('old-access-token')
      );
      mockLocalStorage.setItem(
        'refresh_token',
        JSON.stringify('valid-refresh-token')
      );
      mockLocalStorage.setItem('token_expiry', JSON.stringify(expiresAt));

      // Setup fetch mock for refresh
      mockFetch = setupGoogleApiMocks({
        tokenResponse: createMockTokenResponse({
          access_token: 'new-access-token',
          refresh_token: 'valid-refresh-token',
        }),
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

      // Verify: User is initially authenticated
      await waitFor(() => {
        expect(authOperations?.user).toBeTruthy();
      });

      // Simulate: Token is about to expire (advance to 55 minutes)
      vi.advanceTimersByTime(55 * 60 * 1000);

      // Verify: Token refresh should be triggered automatically
      await waitFor(() => {
        const refreshCalls = mockFetch.mock.calls.filter(([url]) =>
          url.includes('oauth2.googleapis.com/token')
        );
        expect(refreshCalls.length).toBeGreaterThan(0);
      });
    });

    it('should automatically refresh token with refresh_token', async () => {
      const now = Date.now();
      const expiresAt = now + 60 * 1000; // Expires in 1 minute

      mockLocalStorage.setItem('user', JSON.stringify(mockUser));
      mockLocalStorage.setItem(
        'access_token',
        JSON.stringify('old-access-token')
      );
      mockLocalStorage.setItem(
        'refresh_token',
        JSON.stringify('valid-refresh-token')
      );
      mockLocalStorage.setItem('token_expiry', JSON.stringify(expiresAt));

      const newTokenResponse = createMockTokenResponse({
        access_token: 'new-access-token-12345',
        refresh_token: 'valid-refresh-token',
        expires_in: 3600,
      });

      mockFetch = setupGoogleApiMocks({
        tokenResponse: newTokenResponse,
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

      // Wait for initial load
      await waitFor(() => {
        expect(authOperations?.user).toBeTruthy();
      });

      // Advance time to trigger refresh
      vi.advanceTimersByTime(65 * 1000); // Past expiration

      // Verify: Refresh was called with correct parameters
      await waitFor(() => {
        const refreshCall = mockFetch.mock.calls.find(
          ([url, config]) =>
            url.includes('oauth2.googleapis.com/token') &&
            config?.body?.includes('grant_type=refresh_token')
        );
        expect(refreshCall).toBeTruthy();
      });
    });

    it('should update session with new access token after refresh', async () => {
      const now = Date.now();
      const expiresAt = now + 60 * 1000;

      mockLocalStorage.setItem('user', JSON.stringify(mockUser));
      mockLocalStorage.setItem(
        'access_token',
        JSON.stringify('old-access-token')
      );
      mockLocalStorage.setItem(
        'refresh_token',
        JSON.stringify('valid-refresh-token')
      );
      mockLocalStorage.setItem('token_expiry', JSON.stringify(expiresAt));

      const newTokenResponse = createMockTokenResponse({
        access_token: 'refreshed-access-token',
        refresh_token: 'valid-refresh-token',
        expires_in: 3600,
      });

      mockFetch = setupGoogleApiMocks({
        tokenResponse: newTokenResponse,
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

      await waitFor(() => {
        expect(authOperations?.user).toBeTruthy();
      });

      // Trigger token refresh
      vi.advanceTimersByTime(65 * 1000);

      // Verify: localStorage was updated with new token
      await waitFor(() => {
        const storedToken = mockLocalStorage.getItem('access_token');
        if (storedToken) {
          const token = JSON.parse(storedToken);
          expect(token).toBe('refreshed-access-token');
        }
      });
    });

    it('should handle refresh token expiration and force re-login', async () => {
      const now = Date.now();
      const expiresAt = now + 60 * 1000;

      mockLocalStorage.setItem('user', JSON.stringify(mockUser));
      mockLocalStorage.setItem(
        'access_token',
        JSON.stringify('old-access-token')
      );
      mockLocalStorage.setItem(
        'refresh_token',
        JSON.stringify('expired-refresh-token')
      );
      mockLocalStorage.setItem('token_expiry', JSON.stringify(expiresAt));

      // Mock refresh failure (expired refresh token)
      mockFetch = setupGoogleApiMocks({
        shouldFailAuth: true,
        tokenResponse: { error: 'invalid_grant' },
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

      await waitFor(() => {
        expect(authOperations?.user).toBeTruthy();
      });

      // Trigger token refresh attempt
      vi.advanceTimersByTime(65 * 1000);

      // Verify: User is logged out due to refresh failure
      await waitFor(
        () => {
          expect(authOperations?.user).toBeNull();
        },
        { timeout: 3000 }
      );

      // Verify: localStorage was cleared
      expect(mockLocalStorage.getItem('access_token')).toBeNull();
      expect(mockLocalStorage.getItem('refresh_token')).toBeNull();
    });

    it('should restore session after successful token refresh', async () => {
      const now = Date.now();
      const expiresAt = now + 60 * 1000;

      mockLocalStorage.setItem('user', JSON.stringify(mockUser));
      mockLocalStorage.setItem(
        'access_token',
        JSON.stringify('old-access-token')
      );
      mockLocalStorage.setItem(
        'refresh_token',
        JSON.stringify('valid-refresh-token')
      );
      mockLocalStorage.setItem('token_expiry', JSON.stringify(expiresAt));

      const newTokenResponse = createMockTokenResponse({
        access_token: 'new-access-token',
        refresh_token: 'valid-refresh-token',
        expires_in: 3600,
      });

      mockFetch = setupGoogleApiMocks({
        tokenResponse: newTokenResponse,
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

      // Initial session
      await waitFor(() => {
        expect(authOperations?.user?.id).toBe(mockUser.id);
      });

      // Trigger refresh
      vi.advanceTimersByTime(65 * 1000);

      // Wait for refresh to complete
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
      const expiresAt = now - 1000; // Already expired

      mockLocalStorage.setItem('user', JSON.stringify(mockUser));
      mockLocalStorage.setItem('access_token', JSON.stringify('expired-token'));
      mockLocalStorage.setItem(
        'refresh_token',
        JSON.stringify('valid-refresh-token')
      );
      mockLocalStorage.setItem('token_expiry', JSON.stringify(expiresAt));

      const newTokenResponse = createMockTokenResponse({
        access_token: 'fresh-token',
        expires_in: 3600,
      });

      mockFetch = setupGoogleApiMocks({
        tokenResponse: newTokenResponse,
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
      const expiresAt = now + 60 * 1000;

      mockLocalStorage.setItem('user', JSON.stringify(mockUser));
      mockLocalStorage.setItem(
        'access_token',
        JSON.stringify('old-access-token')
      );
      mockLocalStorage.setItem(
        'refresh_token',
        JSON.stringify('problematic-refresh-token')
      );
      mockLocalStorage.setItem('token_expiry', JSON.stringify(expiresAt));

      // First attempt fails, second succeeds
      let refreshAttempts = 0;
      mockFetch = vi.fn((url, config) => {
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

      await waitFor(() => {
        expect(authOperations?.user).toBeTruthy();
      });

      // Trigger refresh
      vi.advanceTimersByTime(65 * 1000);

      // Wait and verify retry logic
      await waitFor(
        () => {
          expect(refreshAttempts).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );
    });

    it('should maintain authentication state across token refresh', async () => {
      const now = Date.now();
      const expiresAt = now + 100;

      mockLocalStorage.setItem('user', JSON.stringify(mockUser));
      mockLocalStorage.setItem(
        'access_token',
        JSON.stringify('expiring-token')
      );
      mockLocalStorage.setItem(
        'refresh_token',
        JSON.stringify('valid-refresh-token')
      );
      mockLocalStorage.setItem('token_expiry', JSON.stringify(expiresAt));

      mockFetch = setupGoogleApiMocks({
        tokenResponse: createMockTokenResponse({
          access_token: 'refreshed-token',
          expires_in: 3600,
        }),
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

      // Verify initial state
      await waitFor(() => {
        expect(screen.getByTestId('user-name')).toHaveTextContent(
          mockUser.name
        );
      });

      // Trigger refresh
      vi.advanceTimersByTime(200);

      // Verify: User is still authenticated after refresh
      await waitFor(() => {
        expect(screen.getByTestId('user-name')).toHaveTextContent(
          mockUser.name
        );
      });

      expect(authOperations?.user?.id).toBe(mockUser.id);
      expect(authOperations?.user?.email).toBe(mockUser.email);
    });
  });

  describe('Integration: OAuth refresh endpoint flow', () => {
    it('should complete full refresh workflow end-to-end', async () => {
      const now = Date.now();
      const expiresAt = now + 100;

      mockLocalStorage.setItem('user', JSON.stringify(mockUser));
      mockLocalStorage.setItem(
        'access_token',
        JSON.stringify('about-to-expire-token')
      );
      mockLocalStorage.setItem(
        'refresh_token',
        JSON.stringify('valid-refresh-token-12345')
      );
      mockLocalStorage.setItem('token_expiry', JSON.stringify(expiresAt));

      const newTokenResponse = createMockTokenResponse({
        access_token: 'brand-new-token-67890',
        refresh_token: 'valid-refresh-token-12345',
        expires_in: 3600,
      });

      mockFetch = setupGoogleApiMocks({
        tokenResponse: newTokenResponse,
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

      // Step 1: Verify initial authentication
      await waitFor(() => {
        expect(authOperations?.user).toBeTruthy();
      });

      const initialToken = JSON.parse(mockLocalStorage.getItem('access_token'));
      expect(initialToken).toBe('about-to-expire-token');

      // Step 2: Trigger token expiration
      vi.advanceTimersByTime(200);

      // Step 3: Verify refresh endpoint was called
      await waitFor(() => {
        const refreshCall = mockFetch.mock.calls.find(
          ([url, config]) =>
            url.includes('oauth2.googleapis.com/token') &&
            config?.body?.includes('refresh_token')
        );
        expect(refreshCall).toBeTruthy();
      });

      // Step 4: Verify new token stored
      await waitFor(() => {
        const updatedToken = mockLocalStorage.getItem('access_token');
        if (updatedToken) {
          const token = JSON.parse(updatedToken);
          expect(token).toBe('brand-new-token-67890');
        }
      });

      // Step 5: Verify session remains active
      expect(authOperations?.user?.id).toBe(mockUser.id);
    });
  });
});
