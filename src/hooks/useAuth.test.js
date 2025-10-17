/**
 * Tests for useAuth hook
 * Tests authentication flows, session management, and Google OAuth integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from './useAuth'

// Mock Supabase
const mockSignInWithOAuth = vi.fn()
const mockSignOut = vi.fn()
const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args) => mockSignInWithOAuth(...args),
      signOut: (...args) => mockSignOut(...args),
      getSession: (...args) => mockGetSession(...args),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args)
    }
  }
}))

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn()
  }
}))

describe('useAuth', () => {
  let unsubscribe

  beforeEach(() => {
    vi.clearAllMocks()
    unsubscribe = vi.fn()

    // Default mock implementations
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } })
    mockSignInWithOAuth.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useAuth())

      expect(result.current.loading).toBe(true)
      expect(result.current.user).toBe(null)
      expect(result.current.error).toBe(null)
    })

    it('should check for existing session on mount', async () => {
      renderHook(() => useAuth())

      await waitFor(() => {
        expect(mockGetSession).toHaveBeenCalled()
      })
    })

    it('should set up auth state change listener', async () => {
      renderHook(() => useAuth())

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled()
      })
    })

    it('should set user when session exists', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' }
      }

      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.user).toEqual(mockUser)
      })
    })

    it('should handle session error', async () => {
      const mockError = { message: 'Session error' }
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: mockError
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.error).toBe('Session error')
      })
    })
  })

  describe('Auth State Changes', () => {
    it('should update user on SIGNED_IN event', async () => {
      let authStateCallback

      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return { data: { subscription: { unsubscribe } } }
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const mockUser = {
        id: 'user-456',
        email: 'new@example.com'
      }

      // Simulate sign in
      authStateCallback('SIGNED_IN', { user: mockUser })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.loading).toBe(false)
      })
    })

    it('should clear user on SIGNED_OUT event', async () => {
      let authStateCallback

      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return { data: { subscription: { unsubscribe } } }
      })

      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockGetSession.mockResolvedValue({
        data: { session: { user: mockUser } },
        error: null
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      // Simulate sign out
      authStateCallback('SIGNED_OUT', null)

      await waitFor(() => {
        expect(result.current.user).toBe(null)
      })
    })
  })

  describe('signInWithGoogle', () => {
    it('should call Supabase OAuth with correct parameters', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await result.current.signInWithGoogle()

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining(window.location.origin),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })
    })

    it('should clear error before sign in', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Previous error' }
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.error).toBe('Previous error')
      })

      await result.current.signInWithGoogle()

      // Error should be cleared during sign in attempt
      await waitFor(() => {
        expect(result.current.error).toBe(null)
      })
    })

    it('should handle sign in errors', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const mockError = { message: 'Google OAuth failed' }
      mockSignInWithOAuth.mockResolvedValue({ error: mockError })

      await expect(result.current.signInWithGoogle()).rejects.toThrow()

      await waitFor(() => {
        expect(result.current.error).toBe('Google OAuth failed')
      })
    })

    it('should set error state on failure', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      mockSignInWithOAuth.mockResolvedValue({
        error: { message: 'Network error' }
      })

      try {
        await result.current.signInWithGoogle()
      } catch (error) {
        // Expected to throw
      }

      await waitFor(() => {
        expect(result.current.error).toBe('Network error')
      })
    })
  })

  describe('signOut', () => {
    it('should call Supabase signOut', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await result.current.signOut()

      expect(mockSignOut).toHaveBeenCalled()
    })

    it('should clear error before sign out', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Previous error' }
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.error).toBe('Previous error')
      })

      await result.current.signOut()

      // Error should be cleared
      await waitFor(() => {
        expect(result.current.error).toBe(null)
      })
    })

    it('should handle sign out errors', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const mockError = { message: 'Sign out failed' }
      mockSignOut.mockResolvedValue({ error: mockError })

      await expect(result.current.signOut()).rejects.toThrow()

      await waitFor(() => {
        expect(result.current.error).toBe('Sign out failed')
      })
    })
  })

  describe('Cleanup', () => {
    it('should unsubscribe from auth changes on unmount', async () => {
      const { unmount } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(mockOnAuthStateChange).toHaveBeenCalled()
      })

      unmount()

      expect(unsubscribe).toHaveBeenCalled()
    })
  })

  describe('Return Values', () => {
    it('should return all required properties', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current).toHaveProperty('user')
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('signInWithGoogle')
      expect(result.current).toHaveProperty('signOut')
      expect(typeof result.current.signInWithGoogle).toBe('function')
      expect(typeof result.current.signOut).toBe('function')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null session gracefully', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.user).toBe(null)
        expect(result.current.error).toBe(null)
      })
    })

    it('should handle undefined user in session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: {} },
        error: null
      })

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.user).toBe(null)
      })
    })

    it('should handle concurrent sign in attempts', async () => {
      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Call signInWithGoogle twice concurrently
      const promise1 = result.current.signInWithGoogle()
      const promise2 = result.current.signInWithGoogle()

      await Promise.all([promise1, promise2])

      // Should have been called twice
      expect(mockSignInWithOAuth).toHaveBeenCalledTimes(2)
    })
  })
})
