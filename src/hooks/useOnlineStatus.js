/**
 * useOnlineStatus - Custom hook for monitoring online/offline status
 * Listens to browser online/offline events and provides current network status
 *
 * @example
 * const isOnline = useOnlineStatus()
 * if (!isOnline) {
 *   return <OfflineMessage />
 * }
 *
 * @returns {boolean} True if online, false if offline
 */

import { useState, useEffect } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    // Initialize with current online status
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine
    }
    // Default to true if navigator.onLine is not available (e.g., server-side)
    return true
  })

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
