/**
 * Tests for useTheme hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from './useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    localStorage.getItem.mockClear()
    localStorage.setItem.mockClear()
    localStorage.getItem.mockReturnValue(null) // Ensure null by default

    // Clear document attributes
    document.documentElement.removeAttribute('data-theme')

    // Reset matchMedia mock to default (light mode)
    window.matchMedia.mockImplementation((query) => ({
      matches: false, // Default to light mode
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with light theme by default', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')
    expect(result.current.isLight).toBe(true)
    expect(result.current.isDark).toBe(false)
  })

  it('loads saved theme from localStorage', () => {
    localStorage.getItem.mockReturnValue('dark')

    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(result.current.isDark).toBe(true)
  })

  it('toggles between light and dark', () => {
    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe('light')

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.theme).toBe('dark')
    expect(result.current.isDark).toBe(true)

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.theme).toBe('light')
    expect(result.current.isLight).toBe(true)
  })

  it('sets specific theme', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setSpecificTheme('dark')
    })

    expect(result.current.theme).toBe('dark')

    act(() => {
      result.current.setSpecificTheme('light')
    })

    expect(result.current.theme).toBe('light')
  })

  it('ignores invalid theme values', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setSpecificTheme('invalid')
    })

    expect(result.current.theme).toBe('light') // unchanged
  })

  it('applies theme to document root', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.setSpecificTheme('dark')
    })

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('saves theme to localStorage on change', () => {
    const { result } = renderHook(() => useTheme())

    act(() => {
      result.current.toggleTheme()
    })

    expect(localStorage.setItem).toHaveBeenCalledWith('budgetTheme', 'dark')
  })

  it('handles localStorage errors gracefully', () => {
    // Mock console.error before setting up the error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Render hook first with normal localStorage
    const { result } = renderHook(() => useTheme())

    // Now mock localStorage.setItem to throw error for the next call
    localStorage.setItem.mockImplementationOnce(() => {
      throw new Error('Storage error')
    })

    // This should trigger the error
    act(() => {
      result.current.toggleTheme()
    })

    // Should not crash, just log error
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error saving theme to localStorage:',
      expect.any(Error)
    )

    consoleErrorSpy.mockRestore()
  })

  it('detects system dark mode preference when no saved theme', () => {
    // Mock matchMedia to return dark mode
    window.matchMedia.mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    localStorage.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useTheme())

    // Should auto-detect dark mode
    expect(result.current.theme).toBe('dark')
  })

  it('respects manual theme choice over system preference', () => {
    localStorage.getItem.mockReturnValue('light')

    // Mock matchMedia to return dark mode
    window.matchMedia.mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    const { result } = renderHook(() => useTheme())

    // Should use manual choice, not system preference
    expect(result.current.theme).toBe('light')
  })

  it('provides boolean helpers isDark and isLight', () => {
    const { result } = renderHook(() => useTheme())

    expect(result.current.isLight).toBe(true)
    expect(result.current.isDark).toBe(false)

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.isLight).toBe(false)
    expect(result.current.isDark).toBe(true)
  })
})
