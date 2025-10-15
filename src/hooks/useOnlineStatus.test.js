/**
 * Tests for useOnlineStatus hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOnlineStatus } from './useOnlineStatus'

describe('useOnlineStatus', () => {
  let onlineGetter
  let originalNavigator

  beforeEach(() => {
    // Store original navigator
    originalNavigator = global.navigator

    // Create a mock navigator with configurable onLine property
    onlineGetter = vi.fn(() => true)
    Object.defineProperty(global, 'navigator', {
      value: {
        onLine: true
      },
      configurable: true,
      writable: true
    })

    // Make onLine property configurable
    Object.defineProperty(global.navigator, 'onLine', {
      get: onlineGetter,
      configurable: true
    })
  })

  afterEach(() => {
    // Restore original navigator
    global.navigator = originalNavigator
    vi.restoreAllMocks()
  })

  it('should return true when online', () => {
    onlineGetter.mockReturnValue(true)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(true)
  })

  it('should return false when offline', () => {
    onlineGetter.mockReturnValue(false)
    const { result } = renderHook(() => useOnlineStatus())
    expect(result.current).toBe(false)
  })

  it('should update when going offline', () => {
    onlineGetter.mockReturnValue(true)
    const { result } = renderHook(() => useOnlineStatus())

    expect(result.current).toBe(true)

    // Simulate going offline
    act(() => {
      onlineGetter.mockReturnValue(false)
      window.dispatchEvent(new Event('offline'))
    })

    expect(result.current).toBe(false)
  })

  it('should update when going online', () => {
    onlineGetter.mockReturnValue(false)
    const { result } = renderHook(() => useOnlineStatus())

    expect(result.current).toBe(false)

    // Simulate going online
    act(() => {
      onlineGetter.mockReturnValue(true)
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current).toBe(true)
  })

  it('should handle multiple online/offline transitions', () => {
    onlineGetter.mockReturnValue(true)
    const { result } = renderHook(() => useOnlineStatus())

    expect(result.current).toBe(true)

    // Go offline
    act(() => {
      onlineGetter.mockReturnValue(false)
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe(false)

    // Go online
    act(() => {
      onlineGetter.mockReturnValue(true)
      window.dispatchEvent(new Event('online'))
    })
    expect(result.current).toBe(true)

    // Go offline again
    act(() => {
      onlineGetter.mockReturnValue(false)
      window.dispatchEvent(new Event('offline'))
    })
    expect(result.current).toBe(false)
  })

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useOnlineStatus())

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('should not update after unmount', () => {
    onlineGetter.mockReturnValue(true)
    const { result, unmount } = renderHook(() => useOnlineStatus())

    expect(result.current).toBe(true)

    unmount()

    // Try to trigger event after unmount
    act(() => {
      onlineGetter.mockReturnValue(false)
      window.dispatchEvent(new Event('offline'))
    })

    // State should not change (still true from before unmount)
    expect(result.current).toBe(true)
  })

  it('should handle navigator.onLine being undefined (SSR)', () => {
    // Simulate server-side rendering where navigator.onLine might not exist
    Object.defineProperty(global.navigator, 'onLine', {
      value: undefined,
      configurable: true
    })

    const { result } = renderHook(() => useOnlineStatus())

    // Should default to true when navigator.onLine is unavailable
    expect(result.current).toBe(true)
  })

  it('should add event listeners on mount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    renderHook(() => useOnlineStatus())

    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function))
  })

  it('should reflect initial online status correctly', () => {
    // Test starting online
    onlineGetter.mockReturnValue(true)
    const { result: result1 } = renderHook(() => useOnlineStatus())
    expect(result1.current).toBe(true)

    // Test starting offline
    onlineGetter.mockReturnValue(false)
    const { result: result2 } = renderHook(() => useOnlineStatus())
    expect(result2.current).toBe(false)
  })
})
