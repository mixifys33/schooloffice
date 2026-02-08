/**
 * URL Shortener Service
 * Generates shortened tracking URLs for SMS messages
 * Requirements: 21.3
 */
import { prisma } from '@/lib/db'
import { MessageChannel } from '@/types/enums'
import crypto from 'crypto'

// ============================================
// TYPES
// ============================================

export interface ShortUrl {
  id: string
  code: string
  originalUrl: string
  schoolId?: string
  studentId?: string
  messageId?: string
  channel?: string
  clickCount: number
  lastClickAt?: Date
  expiresAt?: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateShortUrlInput {
  originalUrl: string
  schoolId?: string
  studentId?: string
  messageId?: string
  channel?: MessageChannel
  expiresAt?: Date
}

export interface ShortUrlClick {
  id: string
  shortUrlId: string
  ipAddress?: string
  userAgent?: string
  referer?: string
  clickedAt: Date
}

export interface ClickTrackingData {
  ipAddress?: string
  userAgent?: string
  referer?: string
}

export interface ShortUrlStats {
  totalClicks: number
  uniqueClicks: number
  lastClickAt?: Date
  clicksByDay: { date: string; count: number }[]
}

// ============================================
// CONFIGURATION
// ============================================

// Base URL for short links (configurable via environment)
const SHORT_URL_BASE = process.env.SHORT_URL_BASE || 'https://tama.ri'

// Code length for short URLs
const CODE_LENGTH = 4

// Characters used for generating codes (alphanumeric, excluding confusing chars)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

// Default expiry in days (7 days as per Requirement 27.2)
const DEFAULT_EXPIRY_DAYS = 7

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate a random short code
 * Uses crypto-secure random generation
 */
export function generateShortCode(length: number = CODE_LENGTH): string {
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
export function isValidShortCode(code: string): boolean {
  if (!code || code.length !== CODE_LENGTH) {
    return false
  }
  return code.split('').every(char => CODE_CHARS.includes(char))
}

/**
 * Build the full short URL from a code
 */
export function buildShortUrl(code: string): string {
  return `${SHORT_URL_BASE}/${code}`
}

/**
 * Extract code from a short URL
 */
export function extractCodeFromUrl(shortUrl: string): string | null {
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
 * Calculate default expiry date
 */
export function getDefaultExpiryDate(): Date {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + DEFAULT_EXPIRY_DAYS)
  return expiry
}

/**
 * Check if a short URL is expired
 */
export function isExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) {
    return false // No expiry means never expires
  }
  return new Date() > expiresAt
}

/**
 * Map Prisma ShortUrl to domain type
 */
function mapPrismaShortUrlToDomain(prismaShortUrl: {
  id: string
  code: string
  originalUrl: string
  schoolId: string | null
  studentId: string | null
  messageId: string | null
  channel: string | null
  clickCount: number
  lastClickAt: Date | null
  expiresAt: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): ShortUrl {
  return {
    id: prismaShortUrl.id,
    code: prismaShortUrl.code,
    originalUrl: prismaShortUrl.originalUrl,
    schoolId: prismaShortUrl.schoolId ?? undefined,
    studentId: prismaShortUrl.studentId ?? undefined,
    messageId: prismaShortUrl.messageId ?? undefined,
    channel: prismaShortUrl.channel ?? undefined,
    clickCount: prismaShortUrl.clickCount,
    lastClickAt: prismaShortUrl.lastClickAt ?? undefined,
    expiresAt: prismaShortUrl.expiresAt ?? undefined,
    isActive: prismaShortUrl.isActive,
    createdAt: prismaShortUrl.createdAt,
    updatedAt: prismaShortUrl.updatedAt,
  }
}

// ============================================
// URL SHORTENER SERVICE
// ============================================

export class UrlShortenerService {
  /**
   * Create a shortened URL
   * Requirement 21.3: Generate shortened tracking URLs
   */
  async createShortUrl(input: CreateShortUrlInput): Promise<ShortUrl> {
    // Generate a unique code
    let code: string
    let attempts = 0
    const maxAttempts = 10

    do {
      code = generateShortCode()
      const existing = await prisma.shortUrl.findUnique({
        where: { code },
      })
      if (!existing) break
      attempts++
    } while (attempts < maxAttempts)

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique short code after maximum attempts')
    }

    // Set default expiry if not provided
    const expiresAt = input.expiresAt ?? getDefaultExpiryDate()

    const shortUrl = await prisma.shortUrl.create({
      data: {
        code,
        originalUrl: input.originalUrl,
        schoolId: input.schoolId,
        studentId: input.studentId,
        messageId: input.messageId,
        channel: input.channel,
        expiresAt,
        isActive: true,
      },
    })

    return mapPrismaShortUrlToDomain(shortUrl)
  }

  /**
   * Create a short URL with a specific code (for testing)
   */
  async createShortUrlWithCode(
    code: string,
    input: CreateShortUrlInput
  ): Promise<ShortUrl> {
    if (!isValidShortCode(code)) {
      throw new Error(`Invalid short code format: ${code}`)
    }

    const existing = await prisma.shortUrl.findUnique({
      where: { code },
    })

    if (existing) {
      throw new Error(`Short code already exists: ${code}`)
    }

    const expiresAt = input.expiresAt ?? getDefaultExpiryDate()

    const shortUrl = await prisma.shortUrl.create({
      data: {
        code,
        originalUrl: input.originalUrl,
        schoolId: input.schoolId,
        studentId: input.studentId,
        messageId: input.messageId,
        channel: input.channel,
        expiresAt,
        isActive: true,
      },
    })

    return mapPrismaShortUrlToDomain(shortUrl)
  }

  /**
   * Get a short URL by code
   */
  async getByCode(code: string): Promise<ShortUrl | null> {
    const shortUrl = await prisma.shortUrl.findUnique({
      where: { code },
    })

    if (!shortUrl) return null
    return mapPrismaShortUrlToDomain(shortUrl)
  }

  /**
   * Get a short URL by ID
   */
  async getById(id: string): Promise<ShortUrl | null> {
    const shortUrl = await prisma.shortUrl.findUnique({
      where: { id },
    })

    if (!shortUrl) return null
    return mapPrismaShortUrlToDomain(shortUrl)
  }

  /**
   * Resolve a short URL to its original URL
   * Returns null if expired or inactive
   */
  async resolveUrl(code: string): Promise<string | null> {
    const shortUrl = await prisma.shortUrl.findUnique({
      where: { code },
    })

    if (!shortUrl) return null
    if (!shortUrl.isActive) return null
    if (isExpired(shortUrl.expiresAt)) return null

    return shortUrl.originalUrl
  }

  /**
   * Record a click on a short URL
   * Requirement 21.3: Track clicks for analytics
   */
  async recordClick(
    code: string,
    trackingData?: ClickTrackingData
  ): Promise<{ success: boolean; originalUrl?: string; error?: string }> {
    const shortUrl = await prisma.shortUrl.findUnique({
      where: { code },
    })

    if (!shortUrl) {
      return { success: false, error: 'Short URL not found' }
    }

    if (!shortUrl.isActive) {
      return { success: false, error: 'Short URL is inactive' }
    }

    if (isExpired(shortUrl.expiresAt)) {
      return { success: false, error: 'Short URL has expired' }
    }

    // Record the click
    await prisma.$transaction([
      prisma.shortUrlClick.create({
        data: {
          shortUrlId: shortUrl.id,
          ipAddress: trackingData?.ipAddress,
          userAgent: trackingData?.userAgent,
          referer: trackingData?.referer,
        },
      }),
      prisma.shortUrl.update({
        where: { id: shortUrl.id },
        data: {
          clickCount: { increment: 1 },
          lastClickAt: new Date(),
        },
      }),
    ])

    return { success: true, originalUrl: shortUrl.originalUrl }
  }

  /**
   * Get click statistics for a short URL
   */
  async getStats(code: string): Promise<ShortUrlStats | null> {
    const shortUrl = await prisma.shortUrl.findUnique({
      where: { code },
      include: {
        clicks: {
          orderBy: { clickedAt: 'desc' },
        },
      },
    })

    if (!shortUrl) return null

    // Calculate unique clicks by IP
    const uniqueIps = new Set(
      shortUrl.clicks
        .filter((c: any) => c.ipAddress)
        .map((c: any) => c.ipAddress)
    )

    // Group clicks by day
    const clicksByDay = new Map<string, number>()
    for (const click of shortUrl.clicks) {
      const day = click.clickedAt.toISOString().split('T')[0]
      clicksByDay.set(day, (clicksByDay.get(day) || 0) + 1)
    }

    return {
      totalClicks: shortUrl.clickCount,
      uniqueClicks: uniqueIps.size,
      lastClickAt: shortUrl.lastClickAt ?? undefined,
      clicksByDay: Array.from(clicksByDay.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }
  }

  /**
   * Deactivate a short URL
   */
  async deactivate(code: string): Promise<boolean> {
    const result = await prisma.shortUrl.updateMany({
      where: { code },
      data: { isActive: false },
    })

    return result.count > 0
  }

  /**
   * Reactivate a short URL
   */
  async reactivate(code: string): Promise<boolean> {
    const result = await prisma.shortUrl.updateMany({
      where: { code },
      data: { isActive: true },
    })

    return result.count > 0
  }

  /**
   * Extend expiry of a short URL
   */
  async extendExpiry(code: string, days: number): Promise<ShortUrl | null> {
    const shortUrl = await prisma.shortUrl.findUnique({
      where: { code },
    })

    if (!shortUrl) return null

    const newExpiry = new Date(shortUrl.expiresAt || new Date())
    newExpiry.setDate(newExpiry.getDate() + days)

    const updated = await prisma.shortUrl.update({
      where: { code },
      data: { expiresAt: newExpiry },
    })

    return mapPrismaShortUrlToDomain(updated)
  }

  /**
   * Get all short URLs for a school
   */
  async getBySchool(
    schoolId: string,
    options?: { includeExpired?: boolean; includeInactive?: boolean }
  ): Promise<ShortUrl[]> {
    const where: Record<string, unknown> = { schoolId }

    if (!options?.includeInactive) {
      where.isActive = true
    }

    if (!options?.includeExpired) {
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ]
    }

    const shortUrls = await prisma.shortUrl.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return shortUrls.map(mapPrismaShortUrlToDomain)
  }

  /**
   * Get all short URLs for a student
   */
  async getByStudent(studentId: string): Promise<ShortUrl[]> {
    const shortUrls = await prisma.shortUrl.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    })

    return shortUrls.map(mapPrismaShortUrlToDomain)
  }

  /**
   * Get all short URLs for a message
   */
  async getByMessage(messageId: string): Promise<ShortUrl[]> {
    const shortUrls = await prisma.shortUrl.findMany({
      where: { messageId },
      orderBy: { createdAt: 'desc' },
    })

    return shortUrls.map(mapPrismaShortUrlToDomain)
  }

  /**
   * Clean up expired short URLs
   * Returns the number of URLs deactivated
   */
  async cleanupExpired(): Promise<number> {
    const result = await prisma.shortUrl.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true,
      },
      data: { isActive: false },
    })

    return result.count
  }

  /**
   * Delete old click data (for data retention)
   * Returns the number of clicks deleted
   */
  async deleteOldClicks(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const result = await prisma.shortUrlClick.deleteMany({
      where: {
        clickedAt: { lt: cutoffDate },
      },
    })

    return result.count
  }

  /**
   * Generate a short URL for SMS message
   * Convenience method that creates a short URL and returns the full URL string
   * Requirement 21.3: Generate shortened tracking URLs (e.g., https://tama.ri/ABC1)
   */
  async shortenForSms(
    originalUrl: string,
    context: {
      schoolId?: string
      studentId?: string
      messageId?: string
    }
  ): Promise<string> {
    const shortUrl = await this.createShortUrl({
      originalUrl,
      schoolId: context.schoolId,
      studentId: context.studentId,
      messageId: context.messageId,
      channel: MessageChannel.SMS,
    })

    return buildShortUrl(shortUrl.code)
  }

  /**
   * Generate a short URL for SMS message
   */
  async shortenForSMS(
    originalUrl: string,
    context: {
      schoolId?: string
      studentId?: string
      messageId?: string
    }
  ): Promise<string> {
    const shortUrl = await this.createShortUrl({
      originalUrl,
      schoolId: context.schoolId,
      studentId: context.studentId,
      messageId: context.messageId,
      channel: MessageChannel.SMS,
    })

    return buildShortUrl(shortUrl.code)
  }

  /**
   * Generate a short URL for Email
   */
  async shortenForEmail(
    originalUrl: string,
    context: {
      schoolId?: string
      studentId?: string
      messageId?: string
    }
  ): Promise<string> {
    const shortUrl = await this.createShortUrl({
      originalUrl,
      schoolId: context.schoolId,
      studentId: context.studentId,
      messageId: context.messageId,
      channel: MessageChannel.EMAIL,
    })

    return buildShortUrl(shortUrl.code)
  }

  /**
   * Get the base URL for short links
   */
  getBaseUrl(): string {
    return SHORT_URL_BASE
  }

  /**
   * Get the code length
   */
  getCodeLength(): number {
    return CODE_LENGTH
  }
}

// Export singleton instance
export const urlShortenerService = new UrlShortenerService()
