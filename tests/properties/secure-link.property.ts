/**
 * Property Tests: Secure Link Token Validity and Expired Link Rejection
 * 
 * **Feature: school-office, Property 25: Secure Link Token Validity**
 * **Validates: Requirements 27.1, 27.2**
 * 
 * **Feature: school-office, Property 26: Expired Link Rejection**
 * **Validates: Requirements 27.3, 27.4**
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import crypto from 'crypto'

// ============================================
// HELPER FUNCTIONS (duplicated from service to avoid Prisma import)
// ============================================

// Default expiry in days (7 days as per Requirement 27.2)
const DEFAULT_EXPIRY_DAYS = 7

// Token length in bytes (32 bytes = 64 hex characters for crypto-secure tokens)
const TOKEN_LENGTH_BYTES = 32

/**
 * Generate a crypto-secure random token
 * Requirement 27.1: Create tokenized URL tied to parent account
 */
function generateSecureToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH_BYTES).toString('hex')
}

/**
 * Calculate expiry date from now
 * Requirement 27.2: Set expiry period of 7 days by default
 */
function calculateExpiryDate(days: number = DEFAULT_EXPIRY_DAYS): Date {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + days)
  return expiry
}

/**
 * Check if a link is expired
 * Requirement 27.3: Verify token is valid and not expired
 */
function isLinkExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

/**
 * Validate token format (64 hex characters)
 */
function isValidTokenFormat(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token)
}

/**
 * Link access error type
 */
interface LinkAccessError {
  code: 'INVALID_TOKEN_FORMAT' | 'LINK_NOT_FOUND' | 'LINK_EXPIRED' | 'INVALID_RESOURCE_TYPE'
  message: string
  shouldPromptLogin: boolean
}

/**
 * Create a link access error object
 * Requirement 27.4: Display error message and prompt login
 */
function createLinkAccessError(
  code: LinkAccessError['code'],
  message: string,
  shouldPromptLogin: boolean = true
): LinkAccessError {
  return { code, message, shouldPromptLogin }
}

// ============================================
// TYPES FOR TESTING
// ============================================

interface SecureLink {
  id: string
  token: string
  guardianId: string
  resourceType: string
  resourceId: string
  expiresAt: Date
  accessedAt?: Date
  accessIp?: string
  createdAt: Date
}

interface LinkAccessResult {
  success: boolean
  link?: SecureLink
  error?: {
    code: string
    message: string
    shouldPromptLogin: boolean
  }
}

// ============================================
// SIMULATED SECURE LINK STORE FOR TESTING
// ============================================

class SecureLinkStore {
  private links: Map<string, SecureLink> = new Map()

  createLink(guardianId: string, resourceType: string, resourceId: string, expiryDays: number = 7): SecureLink {
    const token = generateSecureToken()
    const link: SecureLink = {
      id: `link-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      token,
      guardianId,
      resourceType,
      resourceId,
      expiresAt: calculateExpiryDate(expiryDays),
      createdAt: new Date(),
    }
    this.links.set(token, link)
    return link
  }

  createLinkWithExpiry(guardianId: string, resourceType: string, resourceId: string, expiresAt: Date): SecureLink {
    const token = generateSecureToken()
    const link: SecureLink = {
      id: `link-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      token,
      guardianId,
      resourceType,
      resourceId,
      expiresAt,
      createdAt: new Date(),
    }
    this.links.set(token, link)
    return link
  }

  validateAndAccessLink(token: string, ipAddress: string): LinkAccessResult {
    // Validate token format
    if (!isValidTokenFormat(token)) {
      return {
        success: false,
        error: createLinkAccessError(
          'INVALID_TOKEN_FORMAT',
          'The link format is invalid. Please request a new link from your school.',
          true
        ),
      }
    }

    // Find the link
    const link = this.links.get(token)
    if (!link) {
      return {
        success: false,
        error: createLinkAccessError(
          'LINK_NOT_FOUND',
          'This link does not exist or has been revoked. Please log in to the parent portal to access your reports.',
          true
        ),
      }
    }

    // Check expiry
    if (isLinkExpired(link.expiresAt)) {
      return {
        success: false,
        error: createLinkAccessError(
          'LINK_EXPIRED',
          'This link has expired. Please log in to the parent portal to request a new link.',
          true
        ),
      }
    }

    // Record access
    link.accessedAt = new Date()
    link.accessIp = ipAddress

    return {
      success: true,
      link,
    }
  }

  getLinkByToken(token: string): SecureLink | undefined {
    return this.links.get(token)
  }
}

// ============================================
// ARBITRARIES
// ============================================

const guardianIdArbitrary = fc.uuid()
const resourceTypeArbitrary = fc.constantFrom('report_card', 'fee_statement', 'attendance_report', 'document')
const resourceIdArbitrary = fc.uuid()
const ipAddressArbitrary = fc.tuple(
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 })
).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`)

// Expiry days: 1-30 days
const expiryDaysArbitrary = fc.integer({ min: 1, max: 30 })

// ============================================
// PROPERTY 25: SECURE LINK TOKEN VALIDITY
// ============================================

describe('Property 25: Secure Link Token Validity', () => {
  /**
   * Property: For any report link, the token SHALL be unique
   * Requirement 27.1: Generate tokenized URL tied to parent account
   */
  it('generated tokens are unique across multiple link creations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }),
        (numLinks) => {
          const tokens = new Set<string>()
          
          for (let i = 0; i < numLinks; i++) {
            const token = generateSecureToken()
            // Token should not already exist
            if (tokens.has(token)) {
              return false
            }
            tokens.add(token)
          }
          
          // All tokens should be unique
          return tokens.size === numLinks
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: For any report link, the token SHALL be tied to a specific parent account
   * Requirement 27.1: Generate tokenized URL tied to parent account
   */
  it('each link is tied to a specific guardian account', () => {
    fc.assert(
      fc.property(
        guardianIdArbitrary,
        resourceTypeArbitrary,
        resourceIdArbitrary,
        (guardianId, resourceType, resourceId) => {
          const store = new SecureLinkStore()
          const link = store.createLink(guardianId, resourceType, resourceId)
          
          // Link should be tied to the guardian
          return link.guardianId === guardianId
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: For any report link, it SHALL be valid for exactly 7 days from creation by default
   * Requirement 27.2: Set expiry period of 7 days by default
   */
  it('default expiry is exactly 7 days from creation', () => {
    fc.assert(
      fc.property(
        guardianIdArbitrary,
        resourceTypeArbitrary,
        resourceIdArbitrary,
        (guardianId, resourceType, resourceId) => {
          const store = new SecureLinkStore()
          const beforeCreation = new Date()
          const link = store.createLink(guardianId, resourceType, resourceId)
          const afterCreation = new Date()
          
          // Calculate expected expiry range (7 days from creation)
          const expectedMinExpiry = new Date(beforeCreation)
          expectedMinExpiry.setDate(expectedMinExpiry.getDate() + 7)
          
          const expectedMaxExpiry = new Date(afterCreation)
          expectedMaxExpiry.setDate(expectedMaxExpiry.getDate() + 7)
          
          // Expiry should be within the expected range
          return link.expiresAt >= expectedMinExpiry && link.expiresAt <= expectedMaxExpiry
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: For any custom expiry days, the link SHALL be valid for exactly that many days
   * Requirement 27.2: Set expiry period (configurable)
   */
  it('custom expiry days are respected', () => {
    fc.assert(
      fc.property(
        guardianIdArbitrary,
        resourceTypeArbitrary,
        resourceIdArbitrary,
        expiryDaysArbitrary,
        (guardianId, resourceType, resourceId, expiryDays) => {
          const store = new SecureLinkStore()
          const beforeCreation = new Date()
          const link = store.createLink(guardianId, resourceType, resourceId, expiryDays)
          const afterCreation = new Date()
          
          // Calculate expected expiry range
          const expectedMinExpiry = new Date(beforeCreation)
          expectedMinExpiry.setDate(expectedMinExpiry.getDate() + expiryDays)
          
          const expectedMaxExpiry = new Date(afterCreation)
          expectedMaxExpiry.setDate(expectedMaxExpiry.getDate() + expiryDays)
          
          // Expiry should be within the expected range
          return link.expiresAt >= expectedMinExpiry && link.expiresAt <= expectedMaxExpiry
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Generated tokens SHALL be crypto-secure (64 hex characters)
   * Requirement 27.1: Crypto-secure token generation
   */
  it('generated tokens are 64 hex characters (crypto-secure)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (numTokens) => {
          for (let i = 0; i < numTokens; i++) {
            const token = generateSecureToken()
            
            // Token should be exactly 64 characters
            if (token.length !== 64) {
              return false
            }
            
            // Token should only contain hex characters
            if (!/^[a-f0-9]{64}$/i.test(token)) {
              return false
            }
          }
          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Valid tokens can be used to access links within expiry period
   * Requirement 27.1, 27.2: Token tied to account and valid within expiry
   */
  it('valid tokens can access links within expiry period', () => {
    fc.assert(
      fc.property(
        guardianIdArbitrary,
        resourceTypeArbitrary,
        resourceIdArbitrary,
        ipAddressArbitrary,
        (guardianId, resourceType, resourceId, ipAddress) => {
          const store = new SecureLinkStore()
          const link = store.createLink(guardianId, resourceType, resourceId)
          
          // Access the link immediately (within expiry)
          const result = store.validateAndAccessLink(link.token, ipAddress)
          
          // Should succeed
          return result.success === true && 
                 result.link?.guardianId === guardianId &&
                 result.link?.resourceType === resourceType &&
                 result.link?.resourceId === resourceId
        }
      ),
      { numRuns: 20 }
    )
  })
})

// ============================================
// PROPERTY 26: EXPIRED LINK REJECTION
// ============================================

describe('Property 26: Expired Link Rejection', () => {
  /**
   * Property: For any report link access attempt with an expired token, 
   * the system SHALL reject access
   * Requirement 27.3: Verify token is valid and not expired
   */
  it('expired links are rejected', () => {
    fc.assert(
      fc.property(
        guardianIdArbitrary,
        resourceTypeArbitrary,
        resourceIdArbitrary,
        ipAddressArbitrary,
        (guardianId, resourceType, resourceId, ipAddress) => {
          const store = new SecureLinkStore()
          
          // Create a link that expired in the past
          const expiredDate = new Date()
          expiredDate.setDate(expiredDate.getDate() - 1) // 1 day ago
          
          const link = store.createLinkWithExpiry(guardianId, resourceType, resourceId, expiredDate)
          
          // Try to access the expired link
          const result = store.validateAndAccessLink(link.token, ipAddress)
          
          // Should fail with LINK_EXPIRED error
          return result.success === false && 
                 result.error?.code === 'LINK_EXPIRED'
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: For any invalid token format, the system SHALL reject access
   * Requirement 27.4: Display error for invalid links
   */
  it('invalid token formats are rejected', () => {
    fc.assert(
      fc.property(
        // Generate invalid tokens (not 64 hex chars)
        fc.oneof(
          fc.string({ minLength: 0, maxLength: 63 }), // Too short
          fc.string({ minLength: 65, maxLength: 100 }), // Too long
          fc.string({ minLength: 64, maxLength: 64 }).filter(s => !/^[a-f0-9]{64}$/i.test(s)), // Wrong chars
        ),
        ipAddressArbitrary,
        (invalidToken, ipAddress) => {
          const store = new SecureLinkStore()
          
          // Try to access with invalid token
          const result = store.validateAndAccessLink(invalidToken, ipAddress)
          
          // Should fail with INVALID_TOKEN_FORMAT error
          return result.success === false && 
                 result.error?.code === 'INVALID_TOKEN_FORMAT'
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: For any non-existent token, the system SHALL reject access
   * Requirement 27.4: Display error for invalid links
   */
  it('non-existent tokens are rejected', () => {
    fc.assert(
      fc.property(
        ipAddressArbitrary,
        (ipAddress) => {
          const store = new SecureLinkStore()
          
          // Generate a valid-format token that doesn't exist in the store
          const nonExistentToken = generateSecureToken()
          
          // Try to access with non-existent token
          const result = store.validateAndAccessLink(nonExistentToken, ipAddress)
          
          // Should fail with LINK_NOT_FOUND error
          return result.success === false && 
                 result.error?.code === 'LINK_NOT_FOUND'
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Expired/invalid link errors SHALL prompt login
   * Requirement 27.4: Display error message and prompt login to parent portal
   */
  it('expired and invalid link errors prompt login', () => {
    fc.assert(
      fc.property(
        guardianIdArbitrary,
        resourceTypeArbitrary,
        resourceIdArbitrary,
        ipAddressArbitrary,
        (guardianId, resourceType, resourceId, ipAddress) => {
          const store = new SecureLinkStore()
          
          // Test expired link
          const expiredDate = new Date()
          expiredDate.setDate(expiredDate.getDate() - 1)
          const expiredLink = store.createLinkWithExpiry(guardianId, resourceType, resourceId, expiredDate)
          const expiredResult = store.validateAndAccessLink(expiredLink.token, ipAddress)
          
          // Test non-existent token
          const nonExistentToken = generateSecureToken()
          const notFoundResult = store.validateAndAccessLink(nonExistentToken, ipAddress)
          
          // Test invalid format
          const invalidResult = store.validateAndAccessLink('invalid-token', ipAddress)
          
          // All errors should prompt login
          return expiredResult.error?.shouldPromptLogin === true &&
                 notFoundResult.error?.shouldPromptLogin === true &&
                 invalidResult.error?.shouldPromptLogin === true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Links that are not yet expired SHALL be accessible
   * Requirement 27.3: Verify token is valid and not expired before displaying content
   */
  it('non-expired links are accessible', () => {
    fc.assert(
      fc.property(
        guardianIdArbitrary,
        resourceTypeArbitrary,
        resourceIdArbitrary,
        ipAddressArbitrary,
        fc.integer({ min: 1, max: 30 }), // days until expiry
        (guardianId, resourceType, resourceId, ipAddress, daysUntilExpiry) => {
          const store = new SecureLinkStore()
          
          // Create a link that expires in the future
          const futureDate = new Date()
          futureDate.setDate(futureDate.getDate() + daysUntilExpiry)
          
          const link = store.createLinkWithExpiry(guardianId, resourceType, resourceId, futureDate)
          
          // Try to access the valid link
          const result = store.validateAndAccessLink(link.token, ipAddress)
          
          // Should succeed
          return result.success === true && result.link !== undefined
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: isLinkExpired function correctly identifies expired vs valid links
   * Requirement 27.3: Verify token is not expired
   * 
   * Note: A link is expired when current time is AFTER the expiry time (strictly greater).
   * A link that expires "right now" is not yet expired - it becomes expired a moment later.
   */
  it('isLinkExpired correctly identifies expiry status', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -30, max: 30 }).filter(d => d !== 0), // days offset from now, excluding 0 (boundary case)
        (daysOffset) => {
          const testDate = new Date()
          testDate.setDate(testDate.getDate() + daysOffset)
          
          const isExpired = isLinkExpired(testDate)
          
          // If daysOffset is negative (past), should be expired
          // If daysOffset is positive (future), should not be expired
          if (daysOffset < 0) {
            return isExpired === true
          } else {
            return isExpired === false
          }
        }
      ),
      { numRuns: 20 }
    )
  })
})
