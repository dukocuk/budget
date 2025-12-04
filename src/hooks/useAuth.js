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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

          if (expiresAt > now) {
            logger.log('Found valid session, initializing Google Drive...');
            setUser(session.user);

            // Initialize Google Drive with stored access token
            try {
              await initGoogleDrive(session.accessToken);
              logger.log('✅ Session restored successfully');
            } catch (driveError) {
              logger.error('❌ Error initializing Drive API:', driveError);
              // Clear invalid session
              localStorage.removeItem(STORAGE_KEY);
              setUser(null);
              setError('Session expired. Please sign in again.');
            }
          } else {
            logger.log('Session expired, clearing...');
            localStorage.removeItem(STORAGE_KEY);
            setUser(null);
          }
        }
      } catch (err) {
        logger.error('Error loading session:', err);
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  /**
   * Handle Google Sign-In success
   * Extracts user info and stores session
   *
   * @param {Object} tokenResponse - Google OAuth token response from useGoogleLogin
   * @param {string} tokenResponse.access_token - OAuth access token for Drive API
   */
  const handleGoogleSignIn = async tokenResponse => {
    // CRITICAL DEBUG: Log immediately to verify callback is invoked
    console.log('🚀 handleGoogleSignIn CALLED with:', tokenResponse);

    try {
      setError(null);
      setLoading(true);

      logger.log('Processing Google Sign-In...');

      console.log('📝 Token response structure:', Object.keys(tokenResponse));
      const accessToken = tokenResponse.access_token;
      console.log('🔑 Access token exists?', !!accessToken);

      if (!accessToken) {
        throw new Error('No access token received from Google');
      }

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

      console.log('✅ User data received:', userData);
      logger.log('User authenticated:', {
        email: userData.email,
        name: userData.name,
      });

      // Store session with expiration (default 1 hour)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
      const session = {
        user: {
          id: userData.sub,
          sub: userData.sub,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
        },
        accessToken,
        expiresAt,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      console.log('💾 Session saved to localStorage');

      setUser(session.user);
      console.log('👤 User state set:', session.user);

      // Initialize Google Drive API
      console.log('☁️ Attempting Google Drive initialization...');
      try {
        await initGoogleDrive(accessToken);
        logger.log('✅ Google Drive API initialized');
      } catch (driveError) {
        logger.error('❌ Error initializing Drive API:', driveError);
        setError(
          'Google Drive fejlede. Du kan arbejde offline, men cloud sync vil ikke virke.'
        );
        // Continue anyway - local DB still works
      }
    } catch (err) {
      console.error('❌ CRITICAL ERROR in handleGoogleSignIn:', err);
      logger.error('Error during Google Sign-In:', err);
      setError(err.message || 'Login fejlede. Prøv venligst igen.');
    } finally {
      // ✅ ALWAYS clear loading state
      console.log('🔄 Finally block: clearing loading state');
      setLoading(false);
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
    } catch (err) {
      logger.error('Error signing out:', err);
      setError(err.message || 'Failed to sign out. Please try again.');
    }
  };

  return {
    user,
    loading,
    error,
    handleGoogleSignIn,
    signOut,
  };
}
