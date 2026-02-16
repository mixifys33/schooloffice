/**
 * Secure Link Service
 * Generates and validates tokenized URLs for secure report access
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5
 */
import { prisma } from '@/lib/db'
import { SecureLink, CreateSecureLinkInput } from '@/types'
import { ISecureLinkService } from '@/types/services'
import crypto from 'crypto'
   
// ============================================
// LINK ACCESS RESULT TYPES
// ============================================

/**
 * Result of a link access validation attempt
 * Requirement 27.3, 27.4: Verify token validity and reject expired/invalid links
 */
export interface LinkAccessResult {
  success: boolean
  link?: SecureLink
  error?: LinkAccessError
}

/**
 * Detailed error information for link access failures
 * Requirement 27.4: Display error message and prompt login
 */
export interface LinkAccessError {
  code: 'INVALID_TOKEN_FORMAT' | 'LINK_NOT_FOUND' | 'LINK_EXPIRED' | 'INVALID_RESOURCE_TYPE'
  message: string
  shouldPromptLogin: boolean
}

/**
 * Access log entry for audit purposes
 * Requirement 27.5: Log access with timestamp and IP address
 */
export interface LinkAccessLog {
  linkId: string
  token: string
  guardianId: string
  resourceType: string
  resourceId: string
  accessedAt: Date
  ipAddress: string
  userAgent?: string
  wasSuccessful: boolean
  errorCode?: string
}

// ============================================
// CONFIGURATION
// ============================================

// Default expiry in days (7 days as per Requirement 27.2)
const DEFAULT_EXPIRY_DAYS = 7

// Token length in bytes (32 bytes = 64 hex characters for crypto-secure tokens)
const TOKEN_LENGTH_BYTES = 32

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a crypto-secure random token
 * Requirement 27.1: Create tokenized URL tied to parent account
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH_BYTES).toString('hex')
}

/**
 * Calculate expiry date from now
 * Requirement 27.2: Set expiry period of 7 days by default
 */
export function calculateExpiryDate(days: number = DEFAULT_EXPIRY_DAYS): Date {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + days)
  return expiry
}

/**
 * Check if a link is expired
 * Requirement 27.3: Verify token is valid and not expired
 */
export function isLinkExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

/**
 * Validate token format (64 hex characters)
 */
export function isValidTokenFormat(token: string): boolean {
  return /^[a-f0-9]{64}$/i.test(token)
}

/**
 * Create a link access error object
 * Requirement 27.4: Display error message and prompt login
 */
export function createLinkAccessError(
  code: LinkAccessError['code'],
  message: string,
  shouldPromptLogin: boolean = true
): LinkAccessError {
  return { code, message, shouldPromptLogin }
}

/**
 * Map Prisma SecureLink to domain type
 */
function mapPrismaSecureLinkToDomain(prismaLink: {
  id: string
  token: string
  guardianId: string
  resourceType: string
  resourceId: string
  expiresAt: Date
  accessedAt: Date | null
  accessIp: string | null
  createdAt: Date
}): SecureLink {
  return {
    id: prismaLink.id,
    token: prismaLink.token,
    guardianId: prismaLink.guardianId,
    resourceType: prismaLink.resourceType,
    resourceId: prismaLink.resourceId,
    expiresAt: prismaLink.expiresAt,
    accessedAt: prismaLink.accessedAt ?? undefined,
    accessIp: prismaLink.accessIp ?? undefined,
    createdAt: prismaLink.createdAt,
  }
}

// ============================================
// SECURE LINK SERVICE
// ============================================

export class SecureLinkService implements ISecureLinkService {
  /**
   * Create a secure link for a resource
   * Requirement 27.1: Generate tokenized URL tied to parent account
   * Requirement 27.2: Set expiry period of 7 days by default
   */
  async createLink(data: CreateSecureLinkInput): Promise<SecureLink> {
    // Generate crypto-secure token
    const token = generateSecureToken()
    
    // Calculate expiry date (default 7 days)
    const expiryDays = data.expiryDays ?? DEFAULT_EXPIRY_DAYS
    const expiresAt = calculateExpiryDate(expiryDays)

    const secureLink = await prisma.secureLink.create({
      data: {
        token,
        guardianId: data.guardianId,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        expiresAt,
      },
    })

    return mapPrismaSecureLinkToDomain(secureLink)
  }

  /**
   * Validate a secure link token
   * Requirement 27.3: Verify token is valid and not expired before displaying content
   * Requirement 27.4: Display error for expired/invalid links
   */
  async validateLink(token: string): Promise<{ isValid: boolean; link?: SecureLink; error?: string }> {
    // Validate token format first
    if (!isValidTokenFormat(token)) {
      return { isValid: false, error: 'Invalid token format' }
    }

    // Find the link by token
    const secureLink = await prisma.secureLink.findUnique({
      where: { token },
    })

    // Check if link exists
    if (!secureLink) {
      return { isValid: false, error: 'Link not found' }
    }

    // Check if link is expired
    if (isLinkExpired(secureLink.expiresAt)) {
      return { isValid: false, error: 'Link has expired' }
    }

    return {
      isValid: true,
      link: mapPrismaSecureLinkToDomain(secureLink),
    }
  }

  /**
   * Record access to a secure link
   * Requirement 27.5: Log access with timestamp and IP address
   * Note: userAgent is accepted for future audit logging but not stored in SecureLink model
   */
  async recordAccess(token: string, ipAddress: string, _userAgent?: string): Promise<void> {
    await prisma.secureLink.update({
      where: { token },
      data: {
        accessedAt: new Date(),
        accessIp: ipAddress,
      },
    })
  }

  /**
   * Validate and access a secure link with comprehensive logging
   * Requirement 27.3: Verify token is valid and not expired before displaying content
   * Requirement 27.4: Display error for expired/invalid links and prompt login
   * Requirement 27.5: Log access with timestamp and IP address
   */
  async validateAndAccessLink(
    token: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<LinkAccessResult> {
    // Validate token format first
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

    // Find the link by token
    const secureLink = await prisma.secureLink.findUnique({
      where: { token },
    })

    // Check if link exists
    if (!secureLink) {
      return {
        success: false,
        error: createLinkAccessError(
          'LINK_NOT_FOUND',
          'This link does not exist or has been revoked. Please log in to the parent portal to access your reports.',
          true
        ),
      }
    }

    // Check if link is expired
    if (isLinkExpired(secureLink.expiresAt)) {
      return {
        success: false,
        error: createLinkAccessError(
          'LINK_EXPIRED',
          'This link has expired. Please log in to the parent portal to request a new link.',
          true
        ),
      }
    }

    // Link is valid - record the access
    await this.recordAccess(token, ipAddress, userAgent)

    return {
      success: true,
      link: mapPrismaSecureLinkToDomain(secureLink),
    }
  }

  /**
   * Validate and access a resource with type checking
   * Requirement 27.3, 27.4, 27.5: Full validation with logging
   */
  async accessResource(
    token: string,
    expectedResourceType: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<LinkAccessResult> {
    const result = await this.validateAndAccessLink(token, ipAddress, userAgent)

    if (!result.success) {
      return result
    }

    // Verify resource type matches
    if (result.link?.resourceType !== expectedResourceType) {
      return {
        success: false,
        error: createLinkAccessError(
          'INVALID_RESOURCE_TYPE',
          'This link cannot be used to access the requested resource.',
          true
        ),
      }
    }

    return result
  }

  /**
   * Get link access log entry for audit purposes
   * Requirement 27.5: Log access with timestamp and IP address
   */
  async getAccessLog(token: string): Promise<LinkAccessLog | null> {
    const link = await prisma.secureLink.findUnique({
      where: { token },
    })

    if (!link || !link.accessedAt) {
      return null
    }

    return {
      linkId: link.id,
      token: link.token,
      guardianId: link.guardianId,
      resourceType: link.resourceType,
      resourceId: link.resourceId,
      accessedAt: link.accessedAt,
      ipAddress: link.accessIp || 'unknown',
      wasSuccessful: true,
    }
  }

  /**
   * Check if a link has been accessed
   */
  async hasBeenAccessed(token: string): Promise<boolean> {
    const link = await prisma.secureLink.findUnique({
      where: { token },
      select: { accessedAt: true },
    })

    return link?.accessedAt !== null
  }

  /**
   * Get access statistics for a guardian's links
   */
  async getGuardianAccessStats(guardianId: string): Promise<{
    totalLinks: number
    accessedLinks: number
    expiredLinks: number
    activeLinks: number
  }> {
    const links = await prisma.secureLink.findMany({
      where: { guardianId },
      select: {
        accessedAt: true,
        expiresAt: true,
      },
    })

    const now = new Date()
    let accessedLinks = 0
    let expiredLinks = 0
    let activeLinks = 0

    for (const link of links) {
      if (link.accessedAt) accessedLinks++
      if (link.expiresAt < now) {
        expiredLinks++
      } else {
        activeLinks++
      }
    }

    return {
      totalLinks: links.length,
      accessedLinks,
      expiredLinks,
      activeLinks,
    }
  }

  /**
   * Revoke a secure link (make it invalid)
   */
  async revokeLink(id: string): Promise<void> {
    // Set expiry to past date to invalidate the link
    await prisma.secureLink.update({
      where: { id },
      data: {
        expiresAt: new Date(0), // Set to epoch to mark as expired
      },
    })
  }

  /**
   * Get all expired links for a school (via guardian's students)
   * Useful for cleanup and reporting
   */
  async getExpiredLinks(schoolId: string): Promise<SecureLink[]> {
    // Get all guardians linked to students in this school
    const guardianIds = await prisma.studentGuardian.findMany({
      where: {
        student: {
          schoolId,
        },
      },
      select: {
        guardianId: true,
      },
      distinct: ['guardianId'],
    })

    const guardianIdList = guardianIds.map((g: { guardianId: string }) => g.guardianId)

    const expiredLinks = await prisma.secureLink.findMany({
      where: {
        guardianId: { in: guardianIdList },
        expiresAt: { lt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    return expiredLinks.map(mapPrismaSecureLinkToDomain)
  }

  /**
   * Get a secure link by ID
   */
  async getLinkById(id: string): Promise<SecureLink | null> {
    const secureLink = await prisma.secureLink.findUnique({
      where: { id },
    })

    if (!secureLink) return null
    return mapPrismaSecureLinkToDomain(secureLink)
  }

  /**
   * Get a secure link by token
   */
  async getLinkByToken(token: string): Promise<SecureLink | null> {
    if (!isValidTokenFormat(token)) return null

    const secureLink = await prisma.secureLink.findUnique({
      where: { token },
    })

    if (!secureLink) return null
    return mapPrismaSecureLinkToDomain(secureLink)
  }

  /**
   * Get all links for a guardian
   */
  async getLinksByGuardian(guardianId: string): Promise<SecureLink[]> {
    const links = await prisma.secureLink.findMany({
      where: { guardianId },
      orderBy: { createdAt: 'desc' },
    })

    return links.map(mapPrismaSecureLinkToDomain)
  }

  /**
   * Get all active (non-expired) links for a guardian
   */
  async getActiveLinksByGuardian(guardianId: string): Promise<SecureLink[]> {
    const links = await prisma.secureLink.findMany({
      where: {
        guardianId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    return links.map(mapPrismaSecureLinkToDomain)
  }

  /**
   * Get links for a specific resource
   */
  async getLinksByResource(resourceType: string, resourceId: string): Promise<SecureLink[]> {
    const links = await prisma.secureLink.findMany({
      where: {
        resourceType,
        resourceId,
      },
      orderBy: { createdAt: 'desc' },
    })

    return links.map(mapPrismaSecureLinkToDomain)
  }

  /**
   * Delete expired links (cleanup)
   * Returns the number of links deleted
   */
  async deleteExpiredLinks(): Promise<number> {
    const result = await prisma.secureLink.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    })

    return result.count
  }

  /**
   * Create a report card link for a guardian
   * Convenience method for creating report card access links
   * Requirement 27.1: Generate tokenized URL tied to parent account
   */
  async createReportCardLink(
    guardianId: string,
    reportCardId: string,
    expiryDays?: number
  ): Promise<SecureLink> {
    return this.createLink({
      guardianId,
      resource: "report_card",
      resourceId: reportCardId,
      expiryDays,
    })
  }

  /**
   * Validate and access a report card link
   * Combines validation and access recording
   * Requirements: 27.3, 27.4, 27.5
   */
  async accessReportCard(
    token: string,
    ipAddress: string,
    userAgent?: string
  ): Promise<{ success: boolean; reportCardId?: string; guardianId?: string; error?: LinkAccessError }> {
    const result = await this.accessResource(token, 'report_card', ipAddress, userAgent)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return {
      success: true,
      reportCardId: result.link?.resourceId,
      guardianId: result.link?.guardianId,
    }
  }

  /**
   * Get the default expiry days
   */
  getDefaultExpiryDays(): number {
    return DEFAULT_EXPIRY_DAYS
  }

  /**
   * Get the token length in bytes
   */
  getTokenLengthBytes(): number {
    return TOKEN_LENGTH_BYTES
  }
}

// Export singleton instance
export const secureLinkService = new SecureLinkService()
