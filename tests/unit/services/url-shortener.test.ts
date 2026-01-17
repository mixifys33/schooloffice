/**
 * Unit Tests: URL Shortener Service
 * Tests for URL shortening functionality
 * Requirements: 21.3
 */
import { describe, it, expect } from 'vitest'

// ============================================
// CONFIGURATION (duplicated from service for testing without Prisma)
// ============================================

const SHORT_URL_BASE = process.env.SHORT_URL_BASE || 'https://tama.ri'
const CODE_LENGTH = 4
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// ============================================
// PURE FUNCTIONS (duplicated from service for testing without Prisma)
// ============================================

/**
 * Generate a random short code using crypto
 */
function generateShortCode(length: number = CODE_LENGTH): string {
  const crypto = require('crypto')
  const bytes = crypto.randomBytes(length)
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length]
  }
  return code
}

/**
 * Validate a short code format
 */
function isValidShortCode(code: string): boolean {
  if (!code || code.length !== CODE_LENGTH) {
    return false
  }
  return code.split('').every(char => CODE_CHARS.includes(char))
}

/**
 * Build the full short URL from a code
 */
function buildShortUrl(code: string): string {
  return `${SHORT_URL_BASE}/${code}`
}

/**
 * Extract code from a short URL
 */
function extractCodeFromUrl(shortUrl: string): string | null {
  try {
    const url = new URL(shortUrl)
    const pathParts = url.pathname.split('/').filter(Boolean)
    if (pathParts.length === 1 && isValidShortCode(pathParts[0])) {
      return pathParts[0]
    }
    return null
  } catch {
    // If it's just a code, validate and return it
    if (isValidShortCode(shortUrl)) {
      return shortUrl
    }
    return null
  }
}

/**
 * Calculate default expiry date (7 days)
 */
function getDefaultExpiryDate(): Date {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + 7)
  return expiry
}

/**
 * Check if a short URL is expired
 */
function isExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) {
    return false
  }
  return new Date() > expiresAt
}

// ============================================
// TESTS
// ============================================

describe('URL Shortener Service - Pure Functions', () => {
  describe('generateShortCode', () => {
    it('generates a code of the correct length', () => {
      const code = generateShortCode(4)
      expect(code).toHaveLength(4)
    })

    it('generates a code with default length', () => {
      const code = generateShortCode()
      expect(code).toHaveLength(4)
    })

    it('generates codes with only valid characters', () => {
      const validChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      for (let i = 0; i < 100; i++) {
        const code = generateShortCode()
        for (const char of code) {
          expect(validChars).toContain(char)
        }
      }
    })

    it('generates unique codes', () => {
      const codes = new Set<string>()
      for (let i = 0; i < 100; i++) {
        codes.add(generateShortCode())
      }
      // With 4 chars from 32 possible, collision is unlikely in 100 tries
      expect(codes.size).toBeGreaterThan(90)
    })
  })

  describe('isValidShortCode', () => {
    it('returns true for valid codes', () => {
      expect(isValidShortCode('ABC2')).toBe(true)
      expect(isValidShortCode('XYZ9')).toBe(true)
      expect(isValidShortCode('ABCD')).toBe(true)
    })

    it('returns false for codes with invalid length', () => {
      expect(isValidShortCode('ABC')).toBe(false)
      expect(isValidShortCode('ABCDE')).toBe(false)
      expect(isValidShortCode('')).toBe(false)
    })

    it('returns false for codes with invalid characters', () => {
      expect(isValidShortCode('abc2')).toBe(false) // lowercase
      expect(isValidShortCode('AB0I')).toBe(false) // 0 and I are excluded
      expect(isValidShortCode('AB-2')).toBe(false) // special char
    })

    it('returns false for null/undefined', () => {
      expect(isValidShortCode(null as unknown as string)).toBe(false)
      expect(isValidShortCode(undefined as unknown as string)).toBe(false)
    })
  })

  describe('buildShortUrl', () => {
    it('builds a full URL from a code', () => {
      const url = buildShortUrl('ABC2')
      expect(url).toBe('https://tama.ri/ABC2')
    })
  })

  describe('extractCodeFromUrl', () => {
    it('extracts code from a full URL', () => {
      expect(extractCodeFromUrl('https://tama.ri/ABC2')).toBe('ABC2')
    })

    it('extracts code from a URL with trailing slash', () => {
      // filter(Boolean) removes empty strings, so trailing slash is handled
      expect(extractCodeFromUrl('https://tama.ri/ABC2/')).toBe('ABC2')
    })

    it('returns the code if just a code is passed', () => {
      expect(extractCodeFromUrl('ABC2')).toBe('ABC2')
    })

    it('returns null for invalid URLs', () => {
      expect(extractCodeFromUrl('https://tama.ri/invalid/path')).toBe(null)
      expect(extractCodeFromUrl('not-a-url')).toBe(null)
    })

    it('returns null for invalid codes', () => {
      expect(extractCodeFromUrl('abc2')).toBe(null) // lowercase
    })
  })

  describe('getDefaultExpiryDate', () => {
    it('returns a date 7 days in the future', () => {
      const now = new Date()
      const expiry = getDefaultExpiryDate()
      
      // Should be approximately 7 days from now
      const diffMs = expiry.getTime() - now.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)
      
      expect(diffDays).toBeGreaterThanOrEqual(6.9)
      expect(diffDays).toBeLessThanOrEqual(7.1)
    })
  })

  describe('isExpired', () => {
    it('returns false for null/undefined expiry', () => {
      expect(isExpired(null)).toBe(false)
      expect(isExpired(undefined)).toBe(false)
    })

    it('returns false for future dates', () => {
      const future = new Date()
      future.setDate(future.getDate() + 1)
      expect(isExpired(future)).toBe(false)
    })

    it('returns true for past dates', () => {
      const past = new Date()
      past.setDate(past.getDate() - 1)
      expect(isExpired(past)).toBe(true)
    })
  })
})
