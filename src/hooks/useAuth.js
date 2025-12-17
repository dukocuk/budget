/**
 * useAuth - Consumer hook for Auth Context
 * Provides access to centralized authentication state and methods
 *
 * MIGRATION: Refactored from standalone hook to context consumer
 * to fix state sharing bug where each hook call had isolated state
 *
 * @returns {Object} Authentication state and methods
 * @returns {Object|null} returns.user - Currently authenticated user object
 * @returns {boolean} returns.loading - Loading state during auth operations
 * @returns {Object} returns.loadingState - Detailed loading state
 * @returns {string|null} returns.error - Error message if auth operation failed
 * @returns {Function} returns.handleGoogleSignIn - Google OAuth callback handler
 * @returns {Function} returns.signOut - Sign out current user
 * @returns {Function} returns.retryAuth - Retry auth after error
 *
 * @example
 * const { user, loading, handleGoogleSignIn, signOut } = useAuth()
 *
 * if (user) {
 *   console.log('User ID:', user.sub)
 * }
 */

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

// Re-export resetAuthSession for testing compatibility
export { resetAuthSession as resetAuthSingletons } from '../contexts/authUtils';

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
