/**
 * Performance Optimization Utilities
 * 
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7
 * - Load the initial page within 2 seconds on standard internet connections
 * - Implement lazy loading for large student lists and data tables
 * - Provide optimistic UI updates for immediate user feedback
 * - Cache frequently accessed data to reduce server requests
 * - Implement efficient pagination for large datasets
 * - Provide offline capability for viewing previously loaded data
 * - Optimize images and assets for fast loading across all devices
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// Debounce utility for performance optimization
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

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

// Throttle utility for scroll and resize events
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const throttleRef = useRef<NodeJS.Timeout | null>(null)
  const lastCallRef = useRef<number>(0)

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now()
      
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now
        callback(...args)
      } else if (!throttleRef.current) {
        throttleRef.current = setTimeout(() => {
          lastCallRef.current = Date.now()
          callback(...args)
          throttleRef.current = null
        }, delay - (now - lastCallRef.current))
      }
    }) as T,
    [callback, delay]
  )
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefCallback<Element>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [element, setElement] = useState<Element | null>(null)

  const ref = useCallback((node: Element | null) => {
    setElement(node)
  }, [])

  useEffect(() => {
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [element, options])

  return [ref, isIntersecting]
}

// Virtual scrolling hook for large lists
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[]
  itemHeight: number
  containerHeight: number
  overscan?: number
}) {
  const [scrollTop, setScrollTop] = useState(0)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = items.slice(startIndex, endIndex + 1)
  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight

  const handleScroll = useThrottle((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, 16) // ~60fps

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    handleScroll,
  }
}

// Memory-efficient data cache with LRU eviction
class LRUCache<K, V> {
  private cache = new Map<K, V>()
  private maxSize: number

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Global cache instances
const apiCache = new LRUCache<string, any>(50)
const imageCache = new LRUCache<string, string>(20)

// API response caching hook
export function useApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number // Time to live in milliseconds
    staleWhileRevalidate?: boolean
  } = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const { ttl = 5 * 60 * 1000, staleWhileRevalidate = true } = options // Default 5 minutes

  const fetchData = useCallback(async (useCache = true) => {
    const cacheKey = `${key}-${Date.now()}`
    const cachedData = useCache ? apiCache.get(key) : null
    
    if (cachedData && useCache) {
      const { data: cachedValue, timestamp } = cachedData
      const isStale = Date.now() - timestamp > ttl
      
      if (!isStale) {
        setData(cachedValue)
        setLoading(false)
        return cachedValue
      } else if (staleWhileRevalidate) {
        setData(cachedValue) // Return stale data immediately
      }
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetcher()
      const cacheEntry = {
        data: result,
        timestamp: Date.now(),
      }
      
      apiCache.set(key, cacheEntry)
      setData(result)
      return result
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [key, fetcher, ttl, staleWhileRevalidate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(() => fetchData(false), [fetchData])
  const invalidate = useCallback(() => {
    apiCache.set(key, null as any) // Invalidate cache
    fetchData(false)
  }, [key, fetchData])

  return { data, loading, error, refetch, invalidate }
}

// Optimistic updates hook
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T, optimisticUpdate: Partial<T>) => Promise<T>
) {
  const [data, setData] = useState<T>(initialData)
  const [isOptimistic, setIsOptimistic] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const update = useCallback(
    async (optimisticUpdate: Partial<T>) => {
      // Apply optimistic update immediately
      const optimisticData = { ...data, ...optimisticUpdate }
      setData(optimisticData)
      setIsOptimistic(true)
      setError(null)

      try {
        // Perform actual update
        const result = await updateFn(data, optimisticUpdate)
        setData(result)
        setIsOptimistic(false)
        return result
      } catch (err) {
        // Revert optimistic update on error
        setData(data)
        setIsOptimistic(false)
        setError(err instanceof Error ? err : new Error('Update failed'))
        throw err
      }
    },
    [data, updateFn]
  )

  return { data, isOptimistic, error, update }
}

// Image optimization and lazy loading
export function useImageOptimization(src: string, options: {
  placeholder?: string
  quality?: number
  format?: 'webp' | 'avif' | 'auto'
} = {}) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(false)
  const { placeholder, quality = 75, format = 'auto' } = options

  // Generate optimized image URL (would integrate with image optimization service)
  const optimizedSrc = useMemo(() => {
    if (!src) return placeholder || ''
    
    // In a real implementation, this would generate URLs for image optimization services
    // like Next.js Image, Cloudinary, or similar
    const params = new URLSearchParams()
    if (quality !== 75) params.set('q', quality.toString())
    if (format !== 'auto') params.set('f', format)
    
    return params.toString() ? `${src}?${params.toString()}` : src
  }, [src, quality, format, placeholder])

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    setError(false)
  }, [])

  const handleError = useCallback(() => {
    setError(true)
    setIsLoaded(false)
  }, [])

  return {
    src: optimizedSrc,
    isLoaded,
    error,
    onLoad: handleLoad,
    onError: handleError,
  }
}

// Pagination hook with performance optimizations
export function usePagination<T>({
  data,
  pageSize = 20,
  prefetchPages = 1,
}: {
  data: T[]
  pageSize?: number
  prefetchPages?: number
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [prefetchedPages, setPrefetchedPages] = useState<Set<number>>(new Set())

  const totalPages = Math.ceil(data.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentData = data.slice(startIndex, endIndex)

  // Prefetch adjacent pages
  useEffect(() => {
    const pagesToPrefetch = []
    for (let i = 1; i <= prefetchPages; i++) {
      if (currentPage + i <= totalPages) pagesToPrefetch.push(currentPage + i)
      if (currentPage - i >= 1) pagesToPrefetch.push(currentPage - i)
    }

    pagesToPrefetch.forEach(page => {
      if (!prefetchedPages.has(page)) {
        // Simulate prefetching (in real implementation, this would prefetch data)
        setPrefetchedPages(prev => new Set(prev).add(page))
      }
    })
  }, [currentPage, prefetchPages, totalPages, prefetchedPages])

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }, [totalPages])

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1)
  }, [currentPage, goToPage])

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1)
  }, [currentPage, goToPage])

  return {
    currentData,
    currentPage,
    totalPages,
    pageSize,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    goToPage,
    nextPage,
    prevPage,
  }
}

// Performance monitoring utilities
export const performanceUtils = {
  // Measure component render time
  measureRender: (componentName: string) => {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      if (renderTime > 16) { // Longer than one frame at 60fps
        console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`)
      }
      
      return renderTime
    }
  },

  // Measure API call performance
  measureApiCall: async <T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await apiCall()
      const endTime = performance.now()
      const duration = endTime - startTime
      
      if (duration > 1000) { // Longer than 1 second
        console.warn(`Slow API call: ${endpoint} took ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      console.error(`Failed API call: ${endpoint} failed after ${duration.toFixed(2)}ms`, error)
      throw error
    }
  },

  // Bundle size analysis (development only)
  analyzeBundleSize: () => {
    if (process.env.NODE_ENV === 'development') {
      // This would integrate with webpack-bundle-analyzer or similar
      console.log('Bundle analysis would run here in development')
    }
  },
}

// Offline capability utilities
export function useOfflineCapability<T>(
  key: string,
  data: T | null,
  options: {
    syncOnReconnect?: boolean
    maxAge?: number // Maximum age in milliseconds
  } = {}
) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [lastSync, setLastSync] = useState<number | null>(null)
  const { syncOnReconnect = true, maxAge = 24 * 60 * 60 * 1000 } = options // Default 24 hours

  // Store data offline
  useEffect(() => {
    if (data && isOnline) {
      const offlineData = {
        data,
        timestamp: Date.now(),
      }
      localStorage.setItem(`offline-${key}`, JSON.stringify(offlineData))
      setLastSync(Date.now())
    }
  }, [data, key, isOnline])

  // Load offline data
  const loadOfflineData = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(`offline-${key}`)
      if (!stored) return null

      const { data: offlineData, timestamp } = JSON.parse(stored)
      const age = Date.now() - timestamp

      if (age > maxAge) {
        localStorage.removeItem(`offline-${key}`)
        return null
      }

      return offlineData
    } catch {
      return null
    }
  }, [key, maxAge])

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (syncOnReconnect) {
        // Trigger data sync when coming back online
        window.dispatchEvent(new CustomEvent('sync-data'))
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncOnReconnect])

  return {
    isOnline,
    lastSync,
    loadOfflineData,
    hasOfflineData: !!localStorage.getItem(`offline-${key}`),
  }
}

// Export cache utilities for external use
export { LRUCache, apiCache, imageCache }

// React.memo with custom comparison for performance
export function createMemoComponent<P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) {
  return React.memo(Component, areEqual)
}

// Custom hook for measuring component performance
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0)
  const lastRenderTime = useRef<number>(0)

  useEffect(() => {
    renderCount.current += 1
    const now = performance.now()
    
    if (lastRenderTime.current > 0) {
      const timeSinceLastRender = now - lastRenderTime.current
      
      if (timeSinceLastRender < 16 && renderCount.current > 1) {
        console.warn(
          `Potential over-rendering: ${componentName} rendered ${renderCount.current} times in ${timeSinceLastRender.toFixed(2)}ms`
        )
      }
    }
    
    lastRenderTime.current = now
  })

  return {
    renderCount: renderCount.current,
  }
}