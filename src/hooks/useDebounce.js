/**
 * useDebounce - Custom hook for debouncing values and callbacks
 * Delays execution until after a specified wait period has elapsed since the last invocation
 *
 * @example
 * // Debounce a value (e.g., search input)
 * const debouncedSearchTerm = useDebounce(searchTerm, 300)
 *
 * @example
 * // Debounce a callback
 * const debouncedSave = useDebounceCallback(saveToDB, 1000)
 * debouncedSave(data) // Will execute after 1000ms of inactivity
 */

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Debounce a value - returns the value after a delay
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} The debounced value
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Debounce a callback - returns a debounced version of the callback
 * @param {Function} callback - The callback to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} The debounced callback
 */
export function useDebounceCallback(callback, delay) {
  const timeoutRef = useRef(null)
  const callbackRef = useRef(callback)

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Return debounced callback
  return useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay]
  )
}
