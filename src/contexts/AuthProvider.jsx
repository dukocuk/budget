/**
 * AuthProvider - Centralized authentication state management
 * Provides auth state and methods to all child components via context
 *
 * MIGRATION: Refactored from useAuth hook to fix state sharing bug
 * where each useAuth() call had its own isolated state
 */

import { useState, useEffect, useCallback } from 'react';
import { initGoogleDrive } from '../lib/googleDrive';
import { logger } from '../utils/logger';
import { AuthContext } from './AuthContext';
import { getSessionInitialized, setSessionInitialized } from './authUtils';

const STORAGE_KEY = 'google_auth_session';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // Check if we have a saved session to restore
  const hasSavedSession = localStorage.getItem(STORAGE_KEY) !== null;

  const [loadingState, setLoadingState] = useState({
    isLoading: hasSavedSession,
    stage: hasSavedSession ? 'initializing' : 'complete',
    message: hasSavedSession ? 'Forbereder applikationen...' : '',
    progress: hasSavedSession ? 10 : 100,
    errorMessage: null,
  });
  const [error, setError] = useState(null);

  /**
   * Refresh access token using refresh token
   */
  const refreshAccessToken = useCallback(async refreshToken => {
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
  }, []);

  // Load session on mount
  useEffect(() => {
    const loadSession = async () => {
      // Guard against double-loading in Strict Mode
      if (getSessionInitialized()) {
        logger.log(
          '⏭️ Skipping duplicate session load (Strict Mode protection)'
        );
        return;
      }
      setSessionInitialized(true);

      try {
        const savedSession = localStorage.getItem(STORAGE_KEY);

        if (savedSession) {
          const session = JSON.parse(savedSession);
          const expiresAt = new Date(session.expiresAt).getTime();
          const now = Date.now();

          // If expired but has refresh token → refresh automatically
          if (expiresAt < now && session.refreshToken) {
            logger.log('Token expired, refreshing automatically...');

            setLoadingState({
              isLoading: true,
              stage: 'verifying',
              message: 'Fornyer din session...',
              progress: 35,
              errorMessage: null,
            });

            try {
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

              setLoadingState({
                isLoading: true,
                stage: 'complete',
                message: 'Klar!',
                progress: 100,
                errorMessage: null,
              });
            } catch (refreshError) {
              logger.error('❌ Token refresh failed:', refreshError);
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

            setLoadingState({
              isLoading: true,
              stage: 'verifying',
              message: 'Verificerer din session...',
              progress: 35,
              errorMessage: null,
            });

            setUser(session.user);

            try {
              setLoadingState({
                isLoading: true,
                stage: 'connecting',
                message: 'Forbinder til Google Drive...',
                progress: 70,
                errorMessage: null,
              });

              await initGoogleDrive(session.accessToken);
              logger.log('✅ Session restored successfully');

              setLoadingState({
                isLoading: true,
                stage: 'complete',
                message: 'Klar!',
                progress: 100,
                errorMessage: null,
              });
            } catch (driveError) {
              logger.error('❌ Error initializing Drive API:', driveError);
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
        setLoadingState(prev => ({
          ...prev,
          isLoading: false,
        }));
      }
    };

    loadSession();
  }, [refreshAccessToken]);

  /**
   * Handle Google Sign-In success
   */
  const handleGoogleSignIn = useCallback(async codeResponse => {
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
        logger.error('❌ Token exchange failed:', {
          status: tokenResponse.status,
          statusText: tokenResponse.statusText,
          error: errorData.error,
          error_description: errorData.error_description,
        });
        throw new Error(
          `Token exchange failed: ${errorData.error_description || errorData.error}`
        );
      }

      const tokens = await tokenResponse.json();
      const accessToken = tokens.access_token;
      const refreshToken = tokens.refresh_token;
      const expiresIn = tokens.expires_in;

      if (!accessToken) {
        throw new Error('No access token in token response');
      }

      logger.log('✅ Token exchange successful');

      // Fetch user info
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

      // Store session
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
        refreshToken,
        expiresAt,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setUser(session.user);

      // Initialize Google Drive API
      logger.log('☁️ Attempting Google Drive initialization...');
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
      }
    } catch (err) {
      logger.error('❌ CRITICAL ERROR in handleGoogleSignIn:', err);
      setError(err.message || 'Login fejlede. Prøv venligst igen.');
      setLoadingState({
        isLoading: false,
        stage: 'error',
        message: 'Der opstod en fejl',
        progress: 0,
        errorMessage: err.message || 'Login fejlede. Prøv venligst igen.',
      });
    } finally {
      logger.log('🔄 Finally block: clearing loading state');
      setLoadingState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, []);

  /**
   * Sign out current user
   */
  const signOut = useCallback(async () => {
    try {
      setError(null);
      logger.log('Signing out...');

      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      logger.log('✅ Signed out successfully');

      window.location.reload();
    } catch (err) {
      logger.error('Error signing out:', err);
      setError(err.message || 'Failed to sign out. Please try again.');
    }
  }, []);

  /**
   * Retry authentication after error
   */
  const retryAuth = useCallback(() => {
    setLoadingState({
      isLoading: true,
      stage: 'initializing',
      message: 'Forbereder applikationen...',
      progress: 10,
      errorMessage: null,
    });
    setError(null);
    window.location.reload();
  }, []);

  // Background token refresh timer
  useEffect(() => {
    if (!user) return;

    logger.log('🕐 Starting background token refresh timer');

    const timer = setInterval(() => {
      const savedSession = localStorage.getItem(STORAGE_KEY);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        const expiresAt = new Date(session.expiresAt).getTime();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (expiresAt - now < fiveMinutes && session.refreshToken) {
          logger.log('⏰ Token expiring soon, refreshing in background...');
          refreshAccessToken(session.refreshToken).catch(error => {
            logger.error('❌ Background refresh failed:', error);
          });
        }
      }
    }, 60000);

    return () => {
      logger.log('🛑 Stopping background token refresh timer');
      clearInterval(timer);
    };
  }, [user, refreshAccessToken]);

  const value = {
    user,
    loading: loadingState.isLoading,
    loadingState,
    error,
    handleGoogleSignIn,
    signOut,
    retryAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
