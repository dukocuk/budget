/**
 * Custom hook for localStorage with error handling
 */

import { useState, useCallback } from 'react'
import { STORAGE_KEY } from '../utils/constants'

/**
 * Hook for managing localStorage
 * @param {string} key - Storage key
 * @param {*} initialValue - Initial value if no stored data
 * @returns {Array} [storedValue, setValue, loadValue, clearValue]
 */
export const useLocalStorage = (key = STORAGE_KEY, initialValue = null) => {
  const [storedValue, setStoredValue] = useState(initialValue)
  const [error, setError] = useState(null)

  const setValue = useCallback((value) => {
    try {
      setStoredValue(value)
      localStorage.setItem(key, JSON.stringify(value))
      setError(null)
      return { success: true, error: null }
    } catch (err) {
      console.error('localStorage save error:', err)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [key])

  const loadValue = useCallback(() => {
    try {
      const item = localStorage.getItem(key)
      if (item) {
        const parsed = JSON.parse(item)
        setStoredValue(parsed)
        setError(null)
        return { success: true, data: parsed, error: null }
      }
      return { success: false, data: null, error: 'No data found' }
    } catch (err) {
      console.error('localStorage load error:', err)
      setError(err.message)
      return { success: false, data: null, error: err.message }
    }
  }, [key])

  const clearValue = useCallback(() => {
    try {
      localStorage.removeItem(key)
      setStoredValue(initialValue)
      setError(null)
      return { success: true, error: null }
    } catch (err) {
      console.error('localStorage clear error:', err)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [key, initialValue])

  return {
    storedValue,
    setValue,
    loadValue,
    clearValue,
    error
  }
}
