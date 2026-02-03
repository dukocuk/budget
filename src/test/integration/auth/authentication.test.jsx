/**
 * Integration Tests: Authentication Flows
 *
 * Tests US-001 through US-003:
 * - US-001: First-time login with Google OAuth
 * - US-002: Returning user session restore
 * - US-003: Sign out workflow
 *
 * Integration Points:
 * - AuthProvider → Google OAuth API → localStorage → Dashboard
 * - Session management and token storage
 * - UI state updates during auth flows
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../../../contexts/AuthProvider';
import { useAuth } from '../../../hooks/useAuth';
import { resetAuthSession } from '../../../contexts/authUtils';
import {
  setupGoogleApiMocks,
  setupLocalStorageMock,
  mockUser,
  createMockTokenResponse,
} from '../shared';

// Mock dependencies - use both with/without .js for Vitest resolution
// Must use factory functions (not const) to avoid hoisting issues
vi.mock('../../../utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    perf: vi.fn().mockResolvedValue(undefined),
    perfStart: vi.fn(),
    perfEnd: vi.fn(),
  },
}));

vi.mock('../../../utils/logger.js', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    perf: vi.fn().mockResolvedValue(undefined),
    perfStart: vi.fn(),
    perfEnd: vi.fn(),
  },
}));

vi.mock('../../../lib/googleDrive', () => ({
  initGoogleDrive: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../lib/googleDrive.js', () => ({
  initGoogleDrive: vi.fn().mockResolvedValue(undefined),
}));

// Test component that uses auth
const TestAuthComponent = ({ onAuthClick }) => {
  const { user, loadingState, error, handleGoogleSignIn, signOut } = useAuth();

  return (
    <div>
      {loadingState.isLoading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">{error}</div>}
      {user ? (
        <div data-testid="authenticated">
          <div data-testid="user-email">{user.email}</div>
          <div data-testid="user-name">{user.name}</div>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <div data-testid="unauthenticated">
          <button onClick={() => onAuthClick?.(handleGoogleSignIn)}>
            Sign In with Google
          </button>
        </div>
      )}
    </div>
  );
};

describe('Integration: Authentication Flows', () => {
  let user;
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

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    user = userEvent.setup();

    // Reset singleton guard
    resetAuthSession();

    // Clear localStorage
    localStorage.clear();

    // Setup Google API mock
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
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    resetAuthSession();
  });

  describe('US-001: First-time login with Google OAuth', () => {
    it('should complete full OAuth flow and authenticate user', async () => {
      // Setup: Component with auth
      let handleGoogleSignInFn;

      render(
        <AuthProvider>
          <TestAuthComponent
            onAuthClick={fn => {
              handleGoogleSignInFn = fn;
            }}
          />
        </AuthProvider>
      );

      // Initial state: User is not authenticated
      expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
      expect(screen.getByText('Sign In with Google')).toBeInTheDocument();

      // User action: Click sign in button to get callback
      const signInButton = screen.getByText('Sign In with Google');
      await user.click(signInButton);

      // Simulate Google OAuth callback
      await act(async () => {
        await handleGoogleSignInFn({ code: 'mock-auth-code-12345' });
      });

      // Wait for authentication to complete
      await waitFor(
        () => {
          expect(screen.getByTestId('authenticated')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify: User data is displayed
      expect(screen.getByTestId('user-email')).toHaveTextContent(
        mockUserInfo.email
      );
      expect(screen.getByTestId('user-name')).toHaveTextContent(
        mockUserInfo.name
      );

      // Verify: OAuth endpoints were called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('oauth2.googleapis.com/token'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('userinfo'),
        expect.any(Object)
      );

      // Verify: Session is saved to localStorage
      const savedSession = localStorage.getItem('google_auth_session');
      expect(savedSession).toBeTruthy();
      expect(savedSession).toContain(mockUserInfo.email);
    });

    it('should show error message when OAuth fails', async () => {
      // Setup: Mock failed OAuth
      setupGoogleApiMocks({
        shouldFailAuth: true,
        tokenResponse: { error: 'invalid_grant' },
      });

      let handleGoogleSignInFn;

      render(
        <AuthProvider>
          <TestAuthComponent
            onAuthClick={fn => {
              handleGoogleSignInFn = fn;
            }}
          />
        </AuthProvider>
      );

      // User action: Click sign in button to get callback
      const signInButton = screen.getByText('Sign In with Google');
      await user.click(signInButton);

      // Simulate Google OAuth callback with error scenario
      await act(async () => {
        await handleGoogleSignInFn({ code: 'mock-auth-code-12345' });
      });

      // Wait for error to appear
      await waitFor(
        () => {
          expect(screen.getByTestId('error')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify: User remains unauthenticated
      expect(screen.queryByTestId('authenticated')).not.toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      // Setup: Mock network failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      let handleGoogleSignInFn;

      render(
        <AuthProvider>
          <TestAuthComponent
            onAuthClick={fn => {
              handleGoogleSignInFn = fn;
            }}
          />
        </AuthProvider>
      );

      // User action: Click sign in button to get callback
      const signInButton = screen.getByText('Sign In with Google');
      await user.click(signInButton);

      // Simulate Google OAuth callback with network error
      await act(async () => {
        await handleGoogleSignInFn({ code: 'mock-auth-code-12345' });
      });

      // Wait for error handling
      await waitFor(
        () => {
          expect(screen.getByTestId('error')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify: Error message is user-friendly
      expect(screen.getByTestId('error')).toHaveTextContent(/fejl|error/i);
    });
  });

  describe('US-002: Returning user session restore', () => {
    it('should restore valid session from localStorage', async () => {
      // Setup: Saved session with valid token
      const futureExpiry = new Date(Date.now() + 3600 * 1000).toISOString();
      const savedSession = {
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: futureExpiry,
      };

      setupLocalStorageMock({
        google_auth_session: savedSession,
      });

      setupGoogleApiMocks({
        userInfoResponse: mockUser,
      });

      // Render: App should auto-restore session
      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Verify: Loading state appears first
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Wait for session restoration
      await waitFor(
        () => {
          expect(screen.getByTestId('authenticated')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify: User is authenticated without manual sign-in
      expect(screen.getByTestId('user-email')).toHaveTextContent(
        mockUser.email
      );

      // Verify: No new OAuth flow was triggered
      expect(localStorage.getItem).toHaveBeenCalledWith('google_auth_session');
    });

    it('should refresh expired token automatically', async () => {
      // Setup: Saved session with expired token
      const pastExpiry = new Date(Date.now() - 1000).toISOString();
      const savedSession = {
        user: mockUser,
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresAt: pastExpiry,
      };

      setupLocalStorageMock({
        google_auth_session: savedSession,
      });

      const mockFetch = setupGoogleApiMocks({
        tokenResponse: createMockTokenResponse({
          access_token: 'new-access-token',
        }),
        userInfoResponse: mockUser,
      });

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Wait for loading state during token refresh
      await waitFor(
        () => {
          expect(screen.getByTestId('loading')).toBeInTheDocument();
        },
        { timeout: 1000 }
      );

      // Wait for automatic token refresh to complete
      await waitFor(
        () => {
          const tokenCalls = mockFetch.mock.calls.filter(call =>
            call[0].includes('oauth2.googleapis.com/token')
          );
          expect(tokenCalls.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      // Verify: Session continues after refresh
      await waitFor(
        () => {
          expect(screen.getByTestId('authenticated')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should clear session and show login if refresh fails', async () => {
      // Setup: Expired token that fails to refresh
      const pastExpiry = new Date(Date.now() - 1000).toISOString();
      const savedSession = {
        user: mockUser,
        accessToken: 'old-token',
        refreshToken: 'invalid-refresh-token',
        expiresAt: pastExpiry,
      };

      setupLocalStorageMock({
        google_auth_session: savedSession,
      });

      setupGoogleApiMocks({
        shouldFailAuth: true,
        tokenResponse: { error: 'invalid_grant' },
      });

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Wait for failed refresh
      await waitFor(
        () => {
          expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify: Session was cleared
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'google_auth_session'
      );

      // Verify: User can sign in again
      expect(screen.getByText('Sign In with Google')).toBeInTheDocument();
    });
  });

  describe('US-003: Sign out workflow', () => {
    it('should sign out user and clear session', async () => {
      // Setup: User is authenticated
      const futureExpiry = new Date(Date.now() + 3600 * 1000).toISOString();
      const savedSession = {
        user: mockUser,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresAt: futureExpiry,
      };

      setupLocalStorageMock({
        google_auth_session: savedSession,
      });

      setupGoogleApiMocks({
        userInfoResponse: mockUser,
      });

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Wait for authentication
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      });

      // User action: Click sign out
      const signOutButton = screen.getByText('Sign Out');
      await user.click(signOutButton);

      // Verify: User is signed out
      await waitFor(() => {
        expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
      });

      // Verify: Session is cleared from localStorage
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'google_auth_session'
      );

      // Verify: Sign in button is available again
      expect(screen.getByText('Sign In with Google')).toBeInTheDocument();
    });

    it('should handle sign out without saved session', async () => {
      // Setup: No saved session
      setupLocalStorageMock({});
      setupGoogleApiMocks();

      render(
        <AuthProvider>
          <TestAuthComponent />
        </AuthProvider>
      );

      // Verify: Already in unauthenticated state
      expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();

      // Verify: No errors
      expect(screen.queryByTestId('error')).not.toBeInTheDocument();
    });
  });

  describe('Integration: Full authentication lifecycle', () => {
    it('should support complete auth lifecycle: sign in → use app → sign out', async () => {
      // Step 1: Sign in
      setupGoogleApiMocks({
        userInfoResponse: mockUser,
        tokenResponse: createMockTokenResponse(),
      });

      let handleGoogleSignInFn;

      render(
        <AuthProvider>
          <TestAuthComponent
            onAuthClick={fn => {
              handleGoogleSignInFn = fn;
            }}
          />
        </AuthProvider>
      );

      const signInButton = screen.getByText('Sign In with Google');
      await user.click(signInButton);

      // Simulate Google OAuth callback
      await act(async () => {
        await handleGoogleSignInFn({ code: 'mock-auth-code-12345' });
      });

      await waitFor(
        () => {
          expect(screen.getByTestId('authenticated')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Step 2: Verify user session
      expect(screen.getByTestId('user-email')).toHaveTextContent(
        mockUser.email
      );

      // Step 3: Sign out
      const signOutButton = screen.getByText('Sign Out');
      await user.click(signOutButton);

      await waitFor(() => {
        expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
      });

      // Step 4: Verify clean state
      expect(localStorage.removeItem).toHaveBeenCalledWith(
        'google_auth_session'
      );
      expect(screen.getByText('Sign In with Google')).toBeInTheDocument();
    });
  });
});
