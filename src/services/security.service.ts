/**
 * Security Service
 * Handles rate limiting, password complexity validation, and security controls
 * Requirements: 7.1, 7.2, 7.4
 */
import { prisma } from '@/lib/db'

// ============================================
// CONFIGURATION
// ============================================

/**
 * Rate limiting configuration
 * Requirements: 7.1, 7.2
 */
export interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  lockoutDurationMs: number
}

/**
 * Default rate limiting configuration
 */
const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes lockout
}

/**
 * Password complexity configuration
 * Requirements: 7.4
 */
export interface PasswordComplexityConfig {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  specialChars: string
}

/**
 * Default password complexity configuration
 */
const DEFAULT_PASSWORD_CONFIG: PasswordComplexityConfig = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
}

// ============================================
// TYPES
// ============================================

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean
  remainingAttempts: number
  lockoutEndsAt?: Date
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
}

// ============================================
// SECURITY SERVICE CLASS
// ============================================

export class SecurityService {
  private rateLimitConfig: RateLimitConfig
  private passwordConfig: PasswordComplexityConfig

  constructor(
    rateLimitConfig: RateLimitConfig = DEFAULT_RATE_LIMIT_CONFIG,
    passwordConfig: PasswordComplexityConfig = DEFAULT_PASSWORD_CONFIG
  ) {
    this.rateLimitConfig = rateLimitConfig
    this.passwordConfig = passwordConfig
  }

  /**
   * Check if login attempt is rate limited
   * Requirements: 7.1
   * 
   * @param identifier - Email, phone, or username
   * @param ip - IP address of the request
   * @returns Rate limit check result
   */
  async checkRateLimit(identifier: string, ip: string): Promise<RateLimitResult> {
    const normalizedIdentifier = identifier.trim().toLowerCase()
    
    // Find existing login attempt record
    const loginAttempt = await prisma.loginAttempt.findUnique({
      where: {
        identifier_ipAddress: {
          identifier: normalizedIdentifier,
          ipAddress: ip,
        },
      },
    })

    // No previous attempts - allow login
    if (!loginAttempt) {
      return {
        allowed: true,
        remainingAttempts: this.rateLimitConfig.maxAttempts,
      }
    }

    // Check if currently locked out
    if (loginAttempt.lockedUntil && loginAttempt.lockedUntil > new Date()) {
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutEndsAt: loginAttempt.lockedUntil,
      }
    }

    // Check if window has expired - reset attempts
    const windowExpired = 
      new Date().getTime() - loginAttempt.firstAttempt.getTime() > this.rateLimitConfig.windowMs

    if (windowExpired) {
      // Window expired, reset the record
      await prisma.loginAttempt.delete({
        where: {
          identifier_ipAddress: {
            identifier: normalizedIdentifier,
            ipAddress: ip,
          },
        },
      })
      return {
        allowed: true,
        remainingAttempts: this.rateLimitConfig.maxAttempts,
      }
    }

    // Calculate remaining attempts
    const remainingAttempts = Math.max(0, this.rateLimitConfig.maxAttempts - loginAttempt.attempts)

    return {
      allowed: remainingAttempts > 0,
      remainingAttempts,
      lockoutEndsAt: loginAttempt.lockedUntil ?? undefined,
    }
  }

  /**
   * Record a failed login attempt
   * Requirements: 7.1, 7.2
   * 
   * @param identifier - Email, phone, or username
   * @param ip - IP address of the request
   */
  async recordFailedAttempt(identifier: string, ip: string): Promise<void> {
    const normalizedIdentifier = identifier.trim().toLowerCase()
    const now = new Date()

    // Try to find existing record
    const existing = await prisma.loginAttempt.findUnique({
      where: {
        identifier_ipAddress: {
          identifier: normalizedIdentifier,
          ipAddress: ip,
        },
      },
    })

    if (existing) {
      // Check if window has expired
      const windowExpired = 
        now.getTime() - existing.firstAttempt.getTime() > this.rateLimitConfig.windowMs

      if (windowExpired) {
        // Reset and start new window
        await prisma.loginAttempt.update({
          where: {
            identifier_ipAddress: {
              identifier: normalizedIdentifier,
              ipAddress: ip,
            },
          },
          data: {
            attempts: 1,
            firstAttempt: now,
            lastAttempt: now,
            lockedUntil: null,
          },
        })
      } else {
        // Increment attempts
        const newAttempts = existing.attempts + 1
        const shouldLock = newAttempts >= this.rateLimitConfig.maxAttempts

        await prisma.loginAttempt.update({
          where: {
            identifier_ipAddress: {
              identifier: normalizedIdentifier,
              ipAddress: ip,
            },
          },
          data: {
            attempts: newAttempts,
            lastAttempt: now,
            lockedUntil: shouldLock 
              ? new Date(now.getTime() + this.rateLimitConfig.lockoutDurationMs)
              : null,
          },
        })
      }
    } else {
      // Create new record
      await prisma.loginAttempt.create({
        data: {
          identifier: normalizedIdentifier,
          ipAddress: ip,
          attempts: 1,
          firstAttempt: now,
          lastAttempt: now,
        },
      })
    }
  }

  /**
   * Clear failed login attempts on successful login
   * 
   * @param identifier - Email, phone, or username
   */
  async clearFailedAttempts(identifier: string): Promise<void> {
    const normalizedIdentifier = identifier.trim().toLowerCase()

    // Delete all login attempt records for this identifier
    await prisma.loginAttempt.deleteMany({
      where: {
        identifier: normalizedIdentifier,
      },
    })
  }

  /**
   * Validate password complexity
   * Requirements: 7.4
   * 
   * @param password - Password to validate
   * @returns Validation result with specific errors
   */
  validatePasswordComplexity(password: string): PasswordValidationResult {
    const errors: string[] = []

    // Check minimum length
    if (password.length < this.passwordConfig.minLength) {
      errors.push(`Password must be at least ${this.passwordConfig.minLength} characters long`)
    }

    // Check uppercase requirement
    if (this.passwordConfig.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    // Check lowercase requirement
    if (this.passwordConfig.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    // Check numbers requirement
    if (this.passwordConfig.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    // Check special characters requirement
    if (this.passwordConfig.requireSpecialChars) {
      const specialCharsRegex = new RegExp(`[${this.escapeRegex(this.passwordConfig.specialChars)}]`)
      if (!specialCharsRegex.test(password)) {
        errors.push('Password must contain at least one special character')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Check for suspicious activity patterns
   * Requirements: 7.5
   * 
   * @param userId - User ID to check
   * @returns Whether suspicious activity was detected
   */
  async detectSuspiciousActivity(userId: string): Promise<boolean> {
    // Check for multiple failed login attempts from different IPs
    const recentAttempts = await prisma.authAuditLog.findMany({
      where: {
        userId,
        eventType: 'LOGIN_FAILED',
        timestamp: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
      select: {
        ipAddress: true,
      },
    })

    // Get unique IPs
    const uniqueIps = new Set(recentAttempts.map(a => a.ipAddress))

    // Suspicious if more than 3 different IPs attempted login in the last hour
    return uniqueIps.size > 3
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Get current rate limit configuration
   */
  getRateLimitConfig(): RateLimitConfig {
    return { ...this.rateLimitConfig }
  }

  /**
   * Get current password complexity configuration
   */
  getPasswordConfig(): PasswordComplexityConfig {
    return { ...this.passwordConfig }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const securityService = new SecurityService()
