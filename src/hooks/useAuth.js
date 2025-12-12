/**
 * Custom hook for authentication management with Google OAuth
 * Handles Google Sign-In and session management via Google Identity Services
 *
 * MIGRATION: Replaced Supabase Auth with Google OAuth + Drive API
 */

import { useState, useEffect } from 'react';
import { initGoogleDrive } from '../lib/googleDrive';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'google_auth_session';

/**
 * Hook for managing user authentication with Google
 *
 * Features:
 * - Google OAuth authentication
 * - Token management and refresh
 * - Session persistence in localStorage
 * - Automatic Google Drive API initialization
 *
 * @returns {Object} Authentication state and methods
 * @returns {Object|null} returns.user - Currently authenticated user object (null if not logged in)
 * @returns {boolean} returns.loading - Loading state during auth operations
 * @returns {string|null} returns.error - Error message if auth operation failed
 * @returns {Function} returns.handleGoogleSignIn - Google OAuth callback handler
 * @returns {Function} returns.signOut - Sign out current user (async)
 *
 * @example
 * const { user, loading, handleGoogleSignIn, signOut } = useAuth()
 *
 * // Check if user is logged in
 * if (user) {
 *   console.log('User ID:', user.sub)
 *   console.log('Email:', user.email)
 *   console.log('Name:', user.name)
 * }
 *
 * // Handle Google Sign-In response
 * <GoogleLogin onSuccess={handleGoogleSignIn} />
 *
 * // Sign out
 * await signOut()
 */
export function useAuth() {
  const [user, setUser] = useState(null);

  // Check if we have a saved session to restore
  // Only show loading screen if there's a session to restore
  const hasSavedSession = localStorage.getItem(STORAGE_KEY) !== null;

  const [loadingState, setLoadingState] = useState({
    isLoading: hasSavedSession, // Only show loading if restoring session
    stage: hasSavedSession ? 'initializing' : 'complete',
    message: hasSavedSession ? 'Forbereder applikationen...' : '',
    progress: hasSavedSession ? 10 : 100,
    errorMessage: null,
  });
  const [error, setError] = useState(null);

  /**
   * Refresh access token using refresh token
   * Updates session with new access token and re-initializes Google Drive
   *
   * @param {string} refreshToken - Refresh token from original authentication
   * @returns {Promise<string>} New access token
   */
  const refreshAccessToken = async refreshToken => {
    try {
      logger.log('🔄 Refreshing access token...');

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(
          `Token refresh failed: ${errorData.error_description || errorData.error}`
        );
      }

      const tokens = await tokenResponse.json();
      const newAccessToken = tokens.access_token;
      const expiresIn = tokens.expires_in;

      // Update session with new access token
      const savedSession = localStorage.getItem(STORAGE_KEY);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        session.accessToken = newAccessToken;
        session.expiresAt = new Date(
          Date.now() + expiresIn * 1000
        ).toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      }

      // Re-initialize Google Drive with new token
      await initGoogleDrive(newAccessToken);

      logger.log('✅ Token refreshed successfully');
      return newAccessToken;
    } catch (error) {
      logger.error('❌ Token refresh failed:', error);
      throw error;
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedSession = localStorage.getItem(STORAGE_KEY);

        if (savedSession) {
          const session = JSON.parse(savedSession);

          // Check if token is still valid (not expired)
          const expiresAt = new Date(session.expiresAt).getTime();
          const now = Date.now();

          // If expired but has refresh token → refresh automatically
          if (expiresAt < now && session.refreshToken) {
            logger.log('Token expired, refreshing automatically...');

            // Update to verifying stage
            setLoadingState({
              isLoading: true,
              stage: 'verifying',
              message: 'Fornyer din session...',
              progress: 35,
              errorMessage: null,
            });

            try {
              // Update to connecting stage
              setLoadingState({
                isLoading: true,
                stage: 'connecting',
                message: 'Forbinder til Google Drive...',
                progress: 70,
                errorMessage: null,
              });

              await refreshAccessToken(session.refreshToken);
              setUser(session.user);
              logger.log('✅ Token refreshed and session restored');

              // Complete stage
              setLoadingState({
                isLoading: true,
                stage: 'complete',
                message: 'Klar!',
                progress: 100,
                errorMessage: null,
              });
            } catch (refreshError) {
              logger.error('❌ Token refresh failed:', refreshError);
              // Clear invalid session
              localStorage.removeItem(STORAGE_KEY);
              setUser(null);
              setError('Session udløbet. Log venligst ind igen.');
              setLoadingState({
                isLoading: false,
                stage: 'error',
                message: 'Session udløbet',
                progress: 0,
                errorMessage: 'Session udløbet. Log venligst ind igen.',
              });
            }
          } else if (expiresAt > now) {
            // Still valid
            logger.log('Found valid session, initializing Google Drive...');

            // Update to verifying stage
            setLoadingState({
              isLoading: true,
              stage: 'verifying',
              message: 'Verificerer din session...',
              progress: 35,
              errorMessage: null,
            });

            setUser(session.user);

            // Initialize Google Drive with stored access token
            try {
              // Update to connecting stage
              setLoadingState({
                isLoading: true,
                stage: 'connecting',
                message: 'Forbinder til Google Drive...',
                progress: 70,
                errorMessage: null,
              });

              await initGoogleDrive(session.accessToken);
              logger.log('✅ Session restored successfully');

              // Complete stage
              setLoadingState({
                isLoading: true,
                stage: 'complete',
                message: 'Klar!',
                progress: 100,
                errorMessage: null,
              });
            } catch (driveError) {
              logger.error('❌ Error initializing Drive API:', driveError);
              // Clear invalid session
              localStorage.removeItem(STORAGE_KEY);
              setUser(null);
              setError('Session udløbet. Log venligst ind igen.');
              setLoadingState({
                isLoading: false,
                stage: 'error',
                message: 'Der opstod en fejl',
                progress: 0,
                errorMessage: 'Session udløbet. Log venligst ind igen.',
              });
            }
          } else {
            // Expired and no refresh token
            logger.log('Session expired with no refresh token, clearing...');
            localStorage.removeItem(STORAGE_KEY);
            setUser(null);
          }
        }
      } catch (err) {
        logger.error('Error loading session:', err);
        localStorage.removeItem(STORAGE_KEY);
        setLoadingState({
          isLoading: false,
          stage: 'error',
          message: 'Der opstod en fejl',
          progress: 0,
          errorMessage: 'Error loading session',
        });
      } finally {
        // Always clear loading state immediately
        setLoadingState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    };

    loadSession();
  }, []);

  /**
   * Handle Google Sign-In success
   * Exchanges authorization code for tokens (including refresh token)
   *
   * @param {Object} codeResponse - Google OAuth authorization code response
   * @param {string} codeResponse.code - Authorization code to exchange for tokens
   */
  const handleGoogleSignIn = async codeResponse => {
    try {
      setError(null);
      setLoadingState({
        isLoading: true,
        stage: 'verifying',
        message: 'Verificerer din session...',
        progress: 25,
        errorMessage: null,
      });

      logger.log('Processing Google Sign-In (Authorization Code Flow)...');

      const authCode = codeResponse.code;

      if (!authCode) {
        throw new Error('No authorization code received from Google');
      }

      // Exchange authorization code for tokens
      const basePath = import.meta.env.BASE_URL || '/';
      const redirectUri = window.location.origin + basePath.replace(/\/$/, '');

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: authCode,
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('❌ Token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorData.error,
          error_description: errorData.error_description,
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          hasClientSecret: !!import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
          redirectUri:
            window.location.origin +
            (import.meta.env.BASE_URL || '/').replace(/\/$/, ''),
        });
        throw new Error(
          `Token exchange failed: ${errorData.error_description || errorData.error}\n\n` +
            `Status: ${tokenResponse.status}\n` +
            `Redirect URI: ${window.location.origin + (import.meta.env.BASE_URL || '/').replace(/\/$/, '')}\n` +
            `Has Client Secret: ${!!import.meta.env.VITE_GOOGLE_CLIENT_SECRET}`
        );
      }

      const tokens = await tokenResponse.json();
      const accessToken = tokens.access_token;
      const refreshToken = tokens.refresh_token;
      const expiresIn = tokens.expires_in;

      if (!accessToken) {
        throw new Error('No access token in token response');
      }

      logger.log('✅ Token exchange successful:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        expiresIn,
      });

      // Fetch user info from Google's userinfo endpoint
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userData = await userInfoResponse.json();

      logger.log('User authenticated:', {
        email: userData.email,
        name: userData.name,
      });

      // Store session with refresh token and actual expiration
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      const session = {
        user: {
          id: userData.sub,
          sub: userData.sub,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
        },
        accessToken,
        refreshToken, // NEW: Store refresh token for automatic renewal
        expiresAt,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

      setUser(session.user);

      // Initialize Google Drive API
      console.log('☁️ Attempting Google Drive initialization...');
      setLoadingState({
        isLoading: true,
        stage: 'connecting',
        message: 'Forbinder til Google Drive...',
        progress: 70,
        errorMessage: null,
      });

      try {
        await initGoogleDrive(accessToken);
        logger.log('✅ Google Drive API initialized');

        // Complete stage
        setLoadingState({
          isLoading: true,
          stage: 'complete',
          message: 'Klar!',
          progress: 100,
          errorMessage: null,
        });
      } catch (driveError) {
        logger.error('❌ Error initializing Drive API:', driveError);
        setError(
          'Google Drive fejlede. Du kan arbejde offline, men cloud sync vil ikke virke.'
        );
        setLoadingState({
          isLoading: false,
          stage: 'error',
          message: 'Der opstod en fejl',
          progress: 0,
          errorMessage:
            'Google Drive fejlede. Du kan arbejde offline, men cloud sync vil ikke virke.',
        });
        // Continue anyway - local DB still works
      }
    } catch (err) {
      console.error('❌ CRITICAL ERROR in handleGoogleSignIn:', err);
      logger.error('Error during Google Sign-In:', err);
      setError(err.message || 'Login fejlede. Prøv venligst igen.');
      setLoadingState({
        isLoading: false,
        stage: 'error',
        message: 'Der opstod en fejl',
        progress: 0,
        errorMessage: err.message || 'Login fejlede. Prøv venligst igen.',
      });
    } finally {
      // ✅ Always clear loading state immediately after login
      console.log('🔄 Finally block: clearing loading state');
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
      }));
      console.log('✅ Loading state cleared');
    }
  };

  /**
   * Sign out current user
   * Clears session from localStorage and revokes Google token
   */
  const signOut = async () => {
    try {
      setError(null);
      logger.log('Signing out...');

      // Clear localStorage session
      localStorage.removeItem(STORAGE_KEY);

      // Revoke Google token (optional but recommended)
      // Google Identity Services will handle token revocation automatically
      // when user signs out on next sign-in

      setUser(null);
      logger.log('✅ Signed out successfully');

      // Reload page to return to login screen
      window.location.reload();
    } catch (err) {
      logger.error('Error signing out:', err);
      setError(err.message || 'Failed to sign out. Please try again.');
    }
  };

  /**
   * Retry authentication after error
   */
  const retryAuth = () => {
    setLoadingState({
      isLoading: true,
      stage: 'initializing',
      message: 'Forbereder applikationen...',
      progress: 10,
      errorMessage: null,
    });
    setError(null);
    // Reload the page to restart auth flow
    window.location.reload();
  };

  // Background token refresh timer - refreshes 5 minutes before expiration
  useEffect(() => {
    if (!user) return;

    logger.log('🕐 Starting background token refresh timer');

    // Check token expiration every minute
    const checkTokenExpiry = setInterval(() => {
      const savedSession = localStorage.getItem(STORAGE_KEY);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        const expiresAt = new Date(session.expiresAt).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        // Refresh if expiring within 5 minutes and has refresh token
        if (expiresAt - now < fiveMinutes && session.refreshToken) {
          logger.log('⏰ Token expiring soon, refreshing in background...');
          refreshAccessToken(session.refreshToken).catch(error => {
            logger.error('❌ Background refresh failed:', error);
            // If refresh fails, user will need to re-login on next action
          });
        }
      }
    }, 60000); // Check every minute

    return () => {
      logger.log('🛑 Stopping background token refresh timer');
      clearInterval(checkTokenExpiry);
    };
  }, [user]);

  return {
    user,
    loading: loadingState.isLoading, // For backward compatibility
    loadingState,
    error,
    handleGoogleSignIn,
    signOut,
    retryAuth,
  };
}
