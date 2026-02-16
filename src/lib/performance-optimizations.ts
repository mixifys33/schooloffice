/**
 * Performance Optimization Utilities for Teacher Marks Management System
 * 
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7
 * - Optimize database queries for large datasets
 * - Implement caching strategies for frequently accessed data
 * - Test system performance with realistic data volumes
 * - Verify all accessibility requirements are met
 * - Conduct final cross-browser compatibility testing
 */

/**
 * Database Query Optimization Helpers
 */
export const queryOptimizations = {
  /**
   * Batch size for paginated queries
   */
  BATCH_SIZE: 50,
  
  /**
   * Maximum items to fetch in a single query
   */
  MAX_FETCH_SIZE: 1000,
  
  /**
   * Debounce delay for search queries (ms)
   */
  SEARCH_DEBOUNCE: 300,
  
  /**
   * Cache TTL for frequently accessed data (ms)
   */
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
}

/**
 * In-memory cache for frequently accessed data
 */
class DataCache<T> {
  private cache: Map<string, { data: T; timestamp: number }> = new Map()
  private ttl: number

  constructor(ttl: number = queryOptimizations.CACHE_TTL) {
    this.ttl = ttl
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const isExpired = Date.now() - entry.timestamp > this.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  clear(): void {
    this.cache.clear()
  }

  clearExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

/**
 * Global caches for different data types
 */
export const caches = {
  classes: new DataCache<any>(),
  streams: new DataCache<any>(),
  subjects: new DataCache<any>(),
  students: new DataCache<any>(),
  marks: new DataCache<any>(),
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  Object.values(caches).forEach(cache => cache.clear())
}

/**
 * Clear expired entries from all caches
 */
export function clearExpiredCaches(): void {
  Object.values(caches).forEach(cache => cache.clearExpired())
}

/**
 * Optimized fetch with caching
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  cacheKey?: string
): Promise<T> {
  const key = cacheKey || url
  
  // Check cache first
  const cached = caches.marks.get(key)
  if (cached) {
    return cached as T
  }

  // Fetch from server
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  
  // Store in cache
  caches.marks.set(key, data)
  
  return data
}

/**
 * Batch processing utility for large datasets
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  batchSize: number = queryOptimizations.BATCH_SIZE
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await processor(batch)
    results.push(...batchResults)
  }
  
  return results
}

/**
 * Debounce function for search and input handlers
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = queryOptimizations.SEARCH_DEBOUNCE
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function for scroll and resize handlers
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number = 100
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Lazy loading utility for images and components
 */
export function lazyLoad(
  element: HTMLElement,
  callback: () => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback()
        observer.unobserve(element)
      }
    })
  }, options)

  observer.observe(element)
  return observer
}

/**
 * Virtual scrolling helper for large lists
 */
export function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 5
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const end = Math.min(totalItems, start + visibleCount + overscan * 2)

  return { start, end }
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map()
  private measures: Map<string, number> = new Map()

  mark(name: string): void {
    this.marks.set(name, performance.now())
  }

  measure(name: string, startMark: string): number {
    const startTime = this.marks.get(startMark)
    if (!startTime) {
      console.warn(`Start mark "${startMark}" not found`)
      return 0
    }

    const duration = performance.now() - startTime
    this.measures.set(name, duration)
    
    if (duration > 1000) {
      console.warn(`Performance warning: ${name} took ${duration.toFixed(2)}ms`)
    }

    return duration
  }

  getMeasure(name: string): number | undefined {
    return this.measures.get(name)
  }

  clear(): void {
    this.marks.clear()
    this.measures.clear()
  }

  report(): void {
    console.group('Performance Report')
    this.measures.forEach((duration, name) => {
      console.log(`${name}: ${duration.toFixed(2)}ms`)
    })
    console.groupEnd()
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor()

/**
 * Optimize images for faster loading
 */
export function optimizeImageUrl(
  url: string,
  width?: number,
  quality?: number
): string {
  // Add query parameters for image optimization
  const params = new URLSearchParams()
  if (width) params.append('w', width.toString())
  if (quality) params.append('q', quality.toString())
  
  const separator = url.includes('?') ? '&' : '?'
  return params.toString() ? `${url}${separator}${params.toString()}` : url
}

/**
 * Preload critical resources
 */
export function preloadResource(url: string, as: string): void {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = url
  link.as = as
  document.head.appendChild(link)
}

/**
 * Check if browser supports modern features
 */
export const browserSupport = {
  intersectionObserver: typeof IntersectionObserver !== 'undefined',
  requestIdleCallback: typeof requestIdleCallback !== 'undefined',
  webWorkers: typeof Worker !== 'undefined',
  serviceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
  localStorage: (() => {
    try {
      if (typeof localStorage === 'undefined') return false
      const test = '__test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  })(),
}

/**
 * Request idle callback polyfill
 */
export const requestIdleCallbackPolyfill = 
  browserSupport.requestIdleCallback
    ? requestIdleCallback
    : (callback: IdleRequestCallback) => setTimeout(callback, 1)

/**
 * Optimize component re-renders with memoization
 */
export function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true
  
  if (typeof obj1 !== 'object' || obj1 === null ||
      typeof obj2 !== 'object' || obj2 === null) {
    return false
  }

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false
  }

  return true
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage(): {
  used: number;
  total: number;
  percentage: number;
} | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
    }
  }
  return null
}

/**
 * Cleanup expired cache entries periodically
 */
if (typeof window !== 'undefined') {
  setInterval(clearExpiredCaches, 60000) // Every minute
}
