/**
 * Custom hook for authentication management with Supabase
 * Handles Google OAuth sign-in/sign-out and session management
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'

/**
 * Hook for managing user authentication
 *
 * Features:
 * - Google OAuth authentication
 * - Automatic session persistence
 * - Real-time auth state synchronization
 * - Error handling for auth operations
 *
 * @returns {Object} Authentication state and methods
 * @returns {Object|null} returns.user - Currently authenticated user object (null if not logged in)
 * @returns {boolean} returns.loading - Loading state during auth operations
 * @returns {string|null} returns.error - Error message if auth operation failed
 * @returns {Function} returns.signInWithGoogle - Initiate Google OAuth sign-in (async)
 * @returns {Function} returns.signOut - Sign out current user (async)
 *
 * @example
 * const { user, loading, signInWithGoogle, signOut } = useAuth()
 *
 * // Check if user is logged in
 * if (user) {
 *   console.log('User ID:', user.id)
 *   console.log('Email:', user.email)
 * }
 *
 * // Sign in with Google
 * try {
 *   await signInWithGoogle()
 * } catch (error) {
 *   console.error('Sign-in failed:', error)
 * }
 *
 * // Sign out
 * await signOut()
 */
export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logger.error('Error getting session:', error)
        setError(error.message)
      }
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth state changes
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      logger.log('Auth state changed:', _event)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })

      if (error) {
        logger.error('Error signing in with Google:', error)
        setError(error.message)
      }
    } catch (err) {
      logger.error('Error signing in with Google:', err)
      setError(err.message)
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) {
        logger.error('Error signing out:', error)
        setError(error.message)
      }
    } catch (err) {
      logger.error('Error signing out:', err)
      setError(err.message)
    }
  }

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    signOut
  }
}
