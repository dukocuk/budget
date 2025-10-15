/**
 * Tests for useDebounce and useDebounceCallback hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDebounce, useDebounceCallback } from './useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))
    expect(result.current).toBe('initial')
  })

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    expect(result.current).toBe('initial')

    // Change value
    rerender({ value: 'updated', delay: 500 })

    // Value should not change immediately
    expect(result.current).toBe('initial')

    // Fast-forward time
    act(() => {
      vi.runAllTimers()
    })

    // Now value should be updated
    expect(result.current).toBe('updated')
  })

  it('should reset timer if value changes before delay expires', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // First change
    rerender({ value: 'change1', delay: 500 })

    // Advance time partially
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Second change before first delay completes
    rerender({ value: 'change2', delay: 500 })

    // Advance remaining time of first delay
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Should still show initial value (first timer was cancelled)
    expect(result.current).toBe('initial')

    // Complete second delay
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Now should show second change
    expect(result.current).toBe('change2')
  })

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 1000 } }
    )

    rerender({ value: 'updated', delay: 1000 })

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(result.current).toBe('initial')

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current).toBe('updated')
  })

  it('should handle rapid value changes (debouncing)', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    )

    // Simulate rapid typing
    rerender({ value: 'a', delay: 300 })
    act(() => {
      vi.advanceTimersByTime(50)
    })

    rerender({ value: 'ab', delay: 300 })
    act(() => {
      vi.advanceTimersByTime(50)
    })

    rerender({ value: 'abc', delay: 300 })
    act(() => {
      vi.advanceTimersByTime(50)
    })

    // Should still be at initial value
    expect(result.current).toBe('initial')

    // Complete the delay
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Should now have the final value
    expect(result.current).toBe('abc')
  })
})

describe('useDebounceCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('should debounce callback execution', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebounceCallback(callback, 500))

    // Call debounced function
    act(() => {
      result.current('test')
    })

    // Callback should not be called immediately
    expect(callback).not.toHaveBeenCalled()

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Now callback should be called
    expect(callback).toHaveBeenCalledWith('test')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should cancel previous callback if called again', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebounceCallback(callback, 500))

    // First call
    act(() => {
      result.current('first')
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Second call before first completes
    act(() => {
      result.current('second')
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should only call with 'second' (first was cancelled)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('second')
  })

  it('should handle multiple rapid calls (debouncing)', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebounceCallback(callback, 300))

    // Simulate rapid clicks
    act(() => {
      result.current('call1')
      vi.advanceTimersByTime(50)
      result.current('call2')
      vi.advanceTimersByTime(50)
      result.current('call3')
    })

    // Complete the delay
    act(() => {
      vi.advanceTimersByTime(300)
    })

    // Should only call once with the last value
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('call3')
  })

  it('should pass all arguments to callback', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebounceCallback(callback, 500))

    act(() => {
      result.current('arg1', 'arg2', { key: 'value' })
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2', { key: 'value' })
  })

  it('should cleanup timeout on unmount', () => {
    const callback = vi.fn()
    const { result, unmount } = renderHook(() => useDebounceCallback(callback, 500))

    act(() => {
      result.current('test')
    })

    // Unmount before timeout completes
    unmount()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Callback should not be called after unmount
    expect(callback).not.toHaveBeenCalled()
  })

  it('should update callback reference without breaking debounce', () => {
    const callback1 = vi.fn()
    const callback2 = vi.fn()

    const { result, rerender } = renderHook(
      ({ cb, delay }) => useDebounceCallback(cb, delay),
      { initialProps: { cb: callback1, delay: 500 } }
    )

    // Start debounce with first callback
    act(() => {
      result.current('test')
    })

    // Update callback before timeout completes
    rerender({ cb: callback2, delay: 500 })

    // Complete timeout
    act(() => {
      vi.advanceTimersByTime(500)
    })

    // Should call the updated callback
    expect(callback1).not.toHaveBeenCalled()
    expect(callback2).toHaveBeenCalledWith('test')
  })

  it('should handle different delay values', () => {
    const callback = vi.fn()
    const { result } = renderHook(() => useDebounceCallback(callback, 1000))

    act(() => {
      result.current('test')
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(callback).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(callback).toHaveBeenCalledWith('test')
  })
})
