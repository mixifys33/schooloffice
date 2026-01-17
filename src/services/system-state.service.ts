/**
 * System State Service
 * Handles system state checks including school suspension, term closure, results publication, and financial period locks
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7
 */
import { prisma } from '@/lib/db'
import { LockType } from '@prisma/client'

// ============================================
// TYPES
// ============================================

/**
 * Data types that can be modified
 */
export type ModifiableDataType = 'attendance' | 'marks' | 'results' | 'fees'

/**
 * Result of a modification check
 */
export interface ModificationCheckResult {
  allowed: boolean
  reason?: string
}

/**
 * Unlock operation result
 */
export interface UnlockResult {
  success: boolean
  recordType: LockType
  recordId: string
  unlockedBy: string
  unlockedAt: Date
}

/**
 * System state error codes
 */
export type SystemStateError =
  | 'SCHOOL_SUSPENDED'
  | 'TERM_CLOSED'
  | 'RESULTS_PUBLISHED'
  | 'FINANCIAL_PERIOD_LOCKED'
  | 'DATA_LOCKED'

/**
 * System state error messages
 * Requirements: 20.2, 20.6 - Clear error messages explaining lock reasons
 */
export const SYSTEM_STATE_ERROR_MESSAGES: Record<SystemStateError, string> = {
  SCHOOL_SUSPENDED: 'Account suspended. Please contact support.',
  TERM_CLOSED: 'This term is closed. Data cannot be modified.',
  RESULTS_PUBLISHED: 'Results have been published. Marks cannot be changed.',
  FINANCIAL_PERIOD_LOCKED: 'This financial period is locked.',
  DATA_LOCKED: 'This data is locked and cannot be modified.',
}

// ============================================
// SYSTEM STATE SERVICE CLASS
// ============================================

export class SystemStateService {
  /**
   * Check if a school is suspended
   * Requirements: 20.1
   * 
   * @param schoolId - The school ID to check
   * @returns Whether the school is suspended
   */
  async isSchoolSuspended(schoolId: string): Promise<boolean> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { isActive: true },
    })

    // If school not found, treat as suspended for safety
    if (!school) {
      return true
    }

    return !school.isActive
  }

  /**
   * Check if a term is closed
   * A term is considered closed if there's a TERM_CLOSED lock for it
   * Requirements: 20.3
   * 
   * @param termId - The term ID to check
   * @returns Whether the term is closed
   */
  async isTermClosed(termId: string): Promise<boolean> {
    // First, get the term to find its school
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: {
        academicYear: {
          select: { schoolId: true },
        },
      },
    })

    if (!term) {
      // Term not found - treat as closed for safety
      return true
    }

    // Check for an active lock
    const lock = await prisma.systemLock.findUnique({
      where: {
        schoolId_lockType_recordId: {
          schoolId: term.academicYear.schoolId,
          lockType: LockType.TERM_CLOSED,
          recordId: termId,
        },
      },
    })

    // Term is closed if there's a lock that hasn't been unlocked
    return lock !== null && lock.unlockedAt === null
  }

  /**
   * Check if results are published for a term
   * Requirements: 20.4
   * 
   * @param termId - The term ID to check
   * @returns Whether results are published
   */
  async areResultsPublished(termId: string): Promise<boolean> {
    // First, get the term to find its school
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: {
        academicYear: {
          select: { schoolId: true },
        },
      },
    })

    if (!term) {
      // Term not found - treat as published for safety (prevent modifications)
      return true
    }

    // Check for an active lock
    const lock = await prisma.systemLock.findUnique({
      where: {
        schoolId_lockType_recordId: {
          schoolId: term.academicYear.schoolId,
          lockType: LockType.RESULTS_PUBLISHED,
          recordId: termId,
        },
      },
    })

    // Results are published if there's a lock that hasn't been unlocked
    return lock !== null && lock.unlockedAt === null
  }

  /**
   * Check if a financial period is locked
   * Requirements: 20.5
   * 
   * @param schoolId - The school ID
   * @param periodId - The financial period ID (typically termId)
   * @returns Whether the financial period is locked
   */
  async isFinancialPeriodLocked(schoolId: string, periodId: string): Promise<boolean> {
    const lock = await prisma.systemLock.findUnique({
      where: {
        schoolId_lockType_recordId: {
          schoolId,
          lockType: LockType.FINANCIAL_PERIOD_LOCKED,
          recordId: periodId,
        },
      },
    })

    // Financial period is locked if there's a lock that hasn't been unlocked
    return lock !== null && lock.unlockedAt === null
  }

  /**
   * Check if data modification is allowed
   * Requirements: 20.3, 20.4, 20.5, 20.6
   * 
   * @param schoolId - The school ID
   * @param dataType - The type of data being modified
   * @param termId - Optional term ID for term-specific checks
   * @returns Whether modification is allowed and reason if not
   */
  async canModifyData(
    schoolId: string,
    dataType: ModifiableDataType,
    termId?: string
  ): Promise<ModificationCheckResult> {
    // Check school suspension first
    // Requirements: 20.1
    const schoolSuspended = await this.isSchoolSuspended(schoolId)
    if (schoolSuspended) {
      return {
        allowed: false,
        reason: SYSTEM_STATE_ERROR_MESSAGES.SCHOOL_SUSPENDED,
      }
    }

    // If no termId provided, allow modification (no term-specific locks to check)
    if (!termId) {
      return { allowed: true }
    }

    // Check term-specific locks based on data type
    switch (dataType) {
      case 'attendance':
      case 'marks': {
        // Check if term is closed
        // Requirements: 20.3
        const termClosed = await this.isTermClosed(termId)
        if (termClosed) {
          return {
            allowed: false,
            reason: SYSTEM_STATE_ERROR_MESSAGES.TERM_CLOSED,
          }
        }

        // For marks, also check if results are published
        // Requirements: 20.4
        if (dataType === 'marks') {
          const resultsPublished = await this.areResultsPublished(termId)
          if (resultsPublished) {
            return {
              allowed: false,
              reason: SYSTEM_STATE_ERROR_MESSAGES.RESULTS_PUBLISHED,
            }
          }
        }
        break
      }

      case 'results': {
        // Check if term is closed
        // Requirements: 20.3
        const termClosed = await this.isTermClosed(termId)
        if (termClosed) {
          return {
            allowed: false,
            reason: SYSTEM_STATE_ERROR_MESSAGES.TERM_CLOSED,
          }
        }

        // Check if results are already published
        // Requirements: 20.4
        const resultsPublished = await this.areResultsPublished(termId)
        if (resultsPublished) {
          return {
            allowed: false,
            reason: SYSTEM_STATE_ERROR_MESSAGES.RESULTS_PUBLISHED,
          }
        }
        break
      }

      case 'fees': {
        // Check if financial period is locked
        // Requirements: 20.5
        const financialLocked = await this.isFinancialPeriodLocked(schoolId, termId)
        if (financialLocked) {
          return {
            allowed: false,
            reason: SYSTEM_STATE_ERROR_MESSAGES.FINANCIAL_PERIOD_LOCKED,
          }
        }
        break
      }
    }

    return { allowed: true }
  }

  /**
   * Create a system lock
   * 
   * @param schoolId - The school ID
   * @param lockType - The type of lock
   * @param recordId - The record ID being locked
   * @param lockedBy - The user ID creating the lock
   * @returns The created lock
   */
  async createLock(
    schoolId: string,
    lockType: LockType,
    recordId: string,
    lockedBy: string
  ): Promise<{ id: string; lockType: LockType; recordId: string; lockedAt: Date }> {
    const lock = await prisma.systemLock.create({
      data: {
        schoolId,
        lockType,
        recordId,
        lockedBy,
      },
    })

    return {
      id: lock.id,
      lockType: lock.lockType,
      recordId: lock.recordId,
      lockedAt: lock.lockedAt,
    }
  }

  /**
   * Close a term (create TERM_CLOSED lock)
   * Requirements: 20.3
   * 
   * @param termId - The term ID to close
   * @param closedBy - The user ID closing the term
   */
  async closeTerm(termId: string, closedBy: string): Promise<void> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: {
        academicYear: {
          select: { schoolId: true },
        },
      },
    })

    if (!term) {
      throw new Error(`Term with id ${termId} not found`)
    }

    await this.createLock(
      term.academicYear.schoolId,
      LockType.TERM_CLOSED,
      termId,
      closedBy
    )
  }

  /**
   * Publish results for a term (create RESULTS_PUBLISHED lock)
   * Requirements: 20.4
   * 
   * @param termId - The term ID
   * @param publishedBy - The user ID publishing results
   */
  async publishResults(termId: string, publishedBy: string): Promise<void> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: {
        academicYear: {
          select: { schoolId: true },
        },
      },
    })

    if (!term) {
      throw new Error(`Term with id ${termId} not found`)
    }

    await this.createLock(
      term.academicYear.schoolId,
      LockType.RESULTS_PUBLISHED,
      termId,
      publishedBy
    )
  }

  /**
   * Lock a financial period (create FINANCIAL_PERIOD_LOCKED lock)
   * Requirements: 20.5
   * 
   * @param schoolId - The school ID
   * @param periodId - The financial period ID
   * @param lockedBy - The user ID locking the period
   */
  async lockFinancialPeriod(schoolId: string, periodId: string, lockedBy: string): Promise<void> {
    await this.createLock(
      schoolId,
      LockType.FINANCIAL_PERIOD_LOCKED,
      periodId,
      lockedBy
    )
  }

  /**
   * Unlock a record (Super Admin only)
   * Requirements: 20.7 - Super Admin unlock with full audit logging
   * 
   * @param recordType - The type of lock to remove
   * @param recordId - The record ID to unlock
   * @param unlockedBy - The Super Admin user ID performing the unlock
   * @param reason - The reason for unlocking (required for audit)
   * @returns The unlock result
   */
  async unlockRecord(
    recordType: LockType,
    recordId: string,
    unlockedBy: string,
    reason: string
  ): Promise<UnlockResult> {
    // Validate reason is provided
    if (!reason || reason.trim().length === 0) {
      throw new Error('Unlock reason is required for audit purposes')
    }

    // Find the lock
    const lock = await prisma.systemLock.findFirst({
      where: {
        lockType: recordType,
        recordId,
        unlockedAt: null, // Only find active locks
      },
    })

    if (!lock) {
      throw new Error(`No active lock found for ${recordType} on record ${recordId}`)
    }

    const now = new Date()

    // Update the lock with unlock information
    await prisma.systemLock.update({
      where: { id: lock.id },
      data: {
        unlockedAt: now,
        unlockedBy,
        unlockReason: reason.trim(),
      },
    })

    // Log the unlock action to auth audit log for comprehensive audit trail
    // Requirements: 20.7 - Full audit logging of unlock action
    await prisma.authAuditLog.create({
      data: {
        userId: unlockedBy,
        schoolId: lock.schoolId,
        eventType: 'SUSPICIOUS_ACTIVITY', // Using existing enum for audit purposes
        identifier: `UNLOCK_${recordType}`,
        ipAddress: 'system',
        success: true,
        metadata: {
          action: 'SYSTEM_UNLOCK',
          recordType,
          recordId,
          reason: reason.trim(),
          originalLockId: lock.id,
          originalLockedBy: lock.lockedBy,
          originalLockedAt: lock.lockedAt.toISOString(),
        },
      },
    })

    return {
      success: true,
      recordType,
      recordId,
      unlockedBy,
      unlockedAt: now,
    }
  }

  /**
   * Get all active locks for a school
   * 
   * @param schoolId - The school ID
   * @returns List of active locks
   */
  async getActiveLocks(schoolId: string): Promise<Array<{
    id: string
    lockType: LockType
    recordId: string
    lockedAt: Date
    lockedBy: string
  }>> {
    const locks = await prisma.systemLock.findMany({
      where: {
        schoolId,
        unlockedAt: null,
      },
      select: {
        id: true,
        lockType: true,
        recordId: true,
        lockedAt: true,
        lockedBy: true,
      },
      orderBy: { lockedAt: 'desc' },
    })

    return locks
  }

  /**
   * Get lock history for a specific record
   * 
   * @param recordType - The type of lock
   * @param recordId - The record ID
   * @returns Lock history including unlocks
   */
  async getLockHistory(recordType: LockType, recordId: string): Promise<Array<{
    id: string
    schoolId: string
    lockType: LockType
    recordId: string
    lockedAt: Date
    lockedBy: string
    unlockedAt: Date | null
    unlockedBy: string | null
    unlockReason: string | null
  }>> {
    const locks = await prisma.systemLock.findMany({
      where: {
        lockType: recordType,
        recordId,
      },
      orderBy: { lockedAt: 'desc' },
    })

    return locks
  }

  /**
   * Check if a user can login to a school
   * Requirements: 20.1, 20.2
   * 
   * @param schoolId - The school ID
   * @returns Whether login is allowed and reason if not
   */
  async canLoginToSchool(schoolId: string): Promise<ModificationCheckResult> {
    const schoolSuspended = await this.isSchoolSuspended(schoolId)
    
    if (schoolSuspended) {
      return {
        allowed: false,
        reason: SYSTEM_STATE_ERROR_MESSAGES.SCHOOL_SUSPENDED,
      }
    }

    return { allowed: true }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const systemStateService = new SystemStateService()
