/**
 * Network Status Hook for Teacher Marks Management
 * 
 * Requirements: 14.3, 14.4
 * - Add retry mechanisms for transient network errors
 * - Implement graceful degradation for service unavailability
 * - Monitor network connectivity and provide user feedback
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface NetworkStatus {
  isOnline: boolean
  isSlowConnection: boolean
  connectionType: string
  lastOnlineTime: Date | null
  retryCount: number
}

export interface UseNetworkStatusOptions {
  onOnline?: () => void
  onOffline?: () => void
  onSlowConnection?: () => void
  pingUrl?: string
  pingInterval?: number
  slowConnectionThreshold?: number
}

/**
 * Hook to monitor network status and connection quality
 */
export function useNetworkStatus(options: UseNetworkStatusOptions = {}) {
  const {
    onOnline,
    onOffline,
    onSlowConnection,
    pingUrl = '/api/health',
    pingInterval = 30000, // 30 seconds
    slowConnectionThreshold = 3000 // 3 seconds
  } = options

  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSlowConnection: false,
    connectionType: 'unknown',
    lastOnlineTime: new Date(),
    retryCount: 0
  })

  const pingTimeoutRef = useRef<NodeJS.Timeout>()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()

  // Test connection speed and availability
  const testConnection = useCallback(async (): Promise<{
    isOnline: boolean
    responseTime: number
    isSlowConnection: boolean
  }> => {
    try {
      const startTime = Date.now()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(pingUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime
      const isSlowConnection = responseTime > slowConnectionThreshold

      return {
        isOnline: response.ok,
        responseTime,
        isSlowConnection
      }
    } catch (error) {
      return {
        isOnline: false,
        responseTime: Infinity,
        isSlowConnection: true
      }
    }
  }, [pingUrl, slowConnectionThreshold])

  // Update network status
  const updateStatus = useCallback(async (isOnlineFromNavigator: boolean) => {
    if (!isOnlineFromNavigator) {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        isSlowConnection: false,
        retryCount: prev.retryCount + 1
      }))
      return
    }

    try {
      const { isOnline, responseTime, isSlowConnection } = await testConnection()
      
      setStatus(prev => {
        const wasOffline = !prev.isOnline
        const newStatus = {
          ...prev,
          isOnline,
          isSlowConnection,
          lastOnlineTime: isOnline ? new Date() : prev.lastOnlineTime,
          retryCount: isOnline ? 0 : prev.retryCount + 1
        }

        // Trigger callbacks
        if (wasOffline && isOnline) {
          onOnline?.()
        } else if (!wasOffline && !isOnline) {
          onOffline?.()
        }

        if (isSlowConnection && !prev.isSlowConnection) {
          onSlowConnection?.()
        }

        return newStatus
      })
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        retryCount: prev.retryCount + 1
      }))
    }
  }, [testConnection, onOnline, onOffline, onSlowConnection])

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => updateStatus(true)
    const handleOffline = () => updateStatus(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [updateStatus])

  // Periodic connection testing
  useEffect(() => {
    const startPinging = () => {
      pingTimeoutRef.current = setTimeout(async () => {
        await updateStatus(navigator.onLine)
        startPinging() // Schedule next ping
      }, pingInterval)
    }

    startPinging()

    return () => {
      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current)
      }
    }
  }, [updateStatus, pingInterval])

  // Auto-retry when offline
  const scheduleRetry = useCallback((delay: number = 5000) => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }

    retryTimeoutRef.current = setTimeout(() => {
      updateStatus(navigator.onLine)
    }, delay)
  }, [updateStatus])

  // Manual retry function
  const retry = useCallback(() => {
    updateStatus(navigator.onLine)
  }, [updateStatus])

  // Cleanup
  useEffect(() => {
    return () => {
      if (pingTimeoutRef.current) {
        clearTimeout(pingTimeoutRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  return {
    ...status,
    retry,
    scheduleRetry,
    testConnection
  }
}

/**
 * Hook for handling network-aware operations with retry logic
 */
export function useNetworkAwareOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number
    retryDelay?: number
    exponentialBackoff?: boolean
    onRetry?: (attempt: number, error: Error) => void
    onMaxRetriesReached?: (error: Error) => void
  } = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
    onRetry,
    onMaxRetriesReached
  } = options

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const networkStatus = useNetworkStatus()

  const execute = useCallback(async (): Promise<T | null> => {
    if (!networkStatus.isOnline) {
      const offlineError = new Error('No internet connection')
      setError(offlineError)
      return null
    }

    setIsLoading(true)
    setError(null)

    let lastError: Error | null = null
    let attempt = 0

    while (attempt <= maxRetries) {
      try {
        const result = await operation()
        setIsLoading(false)
        setRetryCount(0)
        return result
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        attempt++
        setRetryCount(attempt)

        if (attempt <= maxRetries) {
          onRetry?.(attempt, lastError)
          
          // Calculate delay with exponential backoff
          const delay = exponentialBackoff 
            ? retryDelay * Math.pow(2, attempt - 1)
            : retryDelay

          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    setIsLoading(false)
    setError(lastError)
    onMaxRetriesReached?.(lastError!)
    return null
  }, [operation, maxRetries, retryDelay, exponentialBackoff, onRetry, onMaxRetriesReached, networkStatus.isOnline])

  const reset = useCallback(() => {
    setError(null)
    setRetryCount(0)
    setIsLoading(false)
  }, [])

  return {
    execute,
    reset,
    isLoading,
    error,
    retryCount,
    canRetry: retryCount < maxRetries && networkStatus.isOnline,
    isOnline: networkStatus.isOnline
  }
}

/**
 * Hook for managing offline data and sync
 */
export function useOfflineSync<T>(
  key: string,
  syncOperation: (data: T[]) => Promise<void>
) {
  const [offlineData, setOfflineData] = useState<T[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<Error | null>(null)

  const networkStatus = useNetworkStatus({
    onOnline: () => {
      // Auto-sync when coming back online
      if (offlineData.length > 0) {
        sync()
      }
    }
  })

  // Load offline data from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`offline_${key}`)
      if (stored) {
        setOfflineData(JSON.parse(stored))
      }
    } catch (error) {
      console.warn('Failed to load offline data:', error)
    }
  }, [key])

  // Save offline data to localStorage
  const saveOfflineData = useCallback((data: T[]) => {
    try {
      localStorage.setItem(`offline_${key}`, JSON.stringify(data))
      setOfflineData(data)
    } catch (error) {
      console.warn('Failed to save offline data:', error)
    }
  }, [key])

  // Add data to offline queue
  const addToOfflineQueue = useCallback((item: T) => {
    const newData = [...offlineData, item]
    saveOfflineData(newData)
  }, [offlineData, saveOfflineData])

  // Sync offline data when online
  const sync = useCallback(async () => {
    if (!networkStatus.isOnline || offlineData.length === 0 || isSyncing) {
      return
    }

    setIsSyncing(true)
    setSyncError(null)

    try {
      await syncOperation(offlineData)
      // Clear offline data after successful sync
      localStorage.removeItem(`offline_${key}`)
      setOfflineData([])
    } catch (error) {
      setSyncError(error instanceof Error ? error : new Error(String(error)))
    } finally {
      setIsSyncing(false)
    }
  }, [networkStatus.isOnline, offlineData, isSyncing, syncOperation, key])

  // Clear offline data
  const clearOfflineData = useCallback(() => {
    localStorage.removeItem(`offline_${key}`)
    setOfflineData([])
  }, [key])

  return {
    offlineData,
    addToOfflineQueue,
    sync,
    clearOfflineData,
    isSyncing,
    syncError,
    hasOfflineData: offlineData.length > 0,
    isOnline: networkStatus.isOnline
  }
}