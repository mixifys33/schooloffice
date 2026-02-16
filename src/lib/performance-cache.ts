/**
 * Performance Cache Utility
 * Implements caching strategies for frequently accessed data
 * Requirements: 22.2, 22.3, 22.4
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  maxSize?: number; // Maximum cache size (default: 100 entries)
}

class PerformanceCache {
  private cache: Map<string, CacheEntry<any>>;
  private readonly defaultTTL: number = 5 * 60 * 1000; // 5 minutes
  private readonly maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.ttl || this.defaultTTL;
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt,
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching pattern
   */
  invalidatePattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Create singleton instances for different cache types
export const marksCache = new PerformanceCache({ 
  ttl: 2 * 60 * 1000, // 2 minutes for marks data
  maxSize: 50 
});

export const classesCache = new PerformanceCache({ 
  ttl: 10 * 60 * 1000, // 10 minutes for class data
  maxSize: 20 
});

export const subjectsCache = new PerformanceCache({ 
  ttl: 10 * 60 * 1000, // 10 minutes for subject data
  maxSize: 30 
});

export const studentsCache = new PerformanceCache({ 
  ttl: 5 * 60 * 1000, // 5 minutes for student data
  maxSize: 50 
});

/**
 * Helper function to generate cache keys
 */
export const generateCacheKey = (...parts: (string | number)[]): string => {
  return parts.join(':');
};

/**
 * Invalidate all marks-related caches
 */
export const invalidateMarksCaches = (
  classId?: string,
  subjectId?: string,
  studentId?: string
): void => {
  if (studentId && subjectId) {
    marksCache.invalidate(generateCacheKey('marks', classId || '*', subjectId, studentId));
  } else if (subjectId) {
    marksCache.invalidatePattern(new RegExp(`marks:.*:${subjectId}:.*`));
  } else if (classId) {
    marksCache.invalidatePattern(new RegExp(`marks:${classId}:.*`));
  } else {
    marksCache.clear();
  }
};

export default PerformanceCache;
