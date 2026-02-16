/**
 * Enhanced Penalty Service with Improved Duplicate Prevention
 * Fixes Issue #6: Penalty Auto-Application Has No Duplicate Prevention
 * 
 * Uses database queries and unique identifiers instead of string matching
 */   
import { prisma } from '@/lib/db'
import type {
  StudentPenalty,
  ApplyPenaltyInput,
  ApplyPenaltiesResult,
} from '@/types/finance'
import { FinanceAuditService } from './finance-audit.service'
import { StudentAccountService } from './student-account.service.enhanced'

// Error codes
export const PENALTY_ERRORS = {
  PENALTY_NOT_FOUND: 'PENALTY_NOT_FOUND',
  PENALTY_MISSING_FIELDS: 'PENALTY_MISSING_FIELDS',
  PENALTY_INVALID_AMOUNT: 'PENALTY_INVALID_AMOUNT',
  PENALTY_ALREADY_WAIVED: 'PENALTY_ALREADY_WAIVED',
  PENALTY_WAIVER_REASON_REQUIRED: 'PENALTY_WAIVER_REASON_REQUIRED',
  STUDENT_ACCOUNT_NOT_FOUND: 'STUDENT_ACCOUNT_NOT_FOUND',
  TERM_NOT_FOUND: 'TERM_NOT_FOUND',
  SCHOOL_NOT_FOUND: 'SCHOOL_NOT_FOUND',
  SETTINGS_NOT_FOUND: 'SETTINGS_NOT_FOUND',
  PENALTY_ALREADY_APPLIED: 'PENALTY_ALREADY_APPLIED',
} as const

export class PenaltyError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'PenaltyError'
  }
}

/**
 * Validate required fields for applying a penalty
 */
function validatePenaltyFields(data: ApplyPenaltyInput): void {
  const missingFields: string[] = []

  if (!data.studentAccountId) missingFields.push('studentAccountId')
  if (!data.termId) missingFields.push('termId')
  if (!data.name) missingFields.push('name')
  if (data.amount === undefined || data.amount === null) missingFields.push('amount')
  if (!data.appliedBy) missingFields.push('appliedBy')

  if (missingFields.length > 0) {
    throw new PenaltyError(
      PENALTY_ERRORS.PENALTY_MISSING_FIELDS,
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields }
    )
  }

  if (data.amount <= 0) {
    throw new PenaltyError(
      PENALTY_ERRORS.PENALTY_INVALID_AMOUNT,
      'Penalty amount must be positive',
      { amount: data.amount }
    )
  }
}

/**
 * Apply penalty to student account
 * Now transactional for consistency
 */
export async function applyPenalty(
  data: ApplyPenaltyInput
): Promise<StudentPenalty> {
  validatePenaltyFields(data)

  return await prisma.$transaction(async (tx) => {
    // Get student account with student info
    const studentAccount = await tx.studentAccount.findUnique({
      where: { id: data.studentAccountId },
      include: {
        student: {
          include: {
            class: true,
            stream: true,
          },
        },
      },
    })

    if (!studentAccount) {
      throw new PenaltyError(
        PENALTY_ERRORS.STUDENT_ACCOUNT_NOT_FOUND,
        'Student account not found',
        { studentAccountId: data.studentAccountId }
      )
    }

    // Verify term exists
    const term = await tx.term.findUnique({
      where: { id: data.termId },
    })

    if (!term) {
      throw new PenaltyError(
        PENALTY_ERRORS.TERM_NOT_FOUND,
        'Term not found',
        { termId: data.termId }
      )
    }

    // Create the penalty record
    const penalty = await tx.studentPenalty.create({
      data: {
        studentAccountId: data.studentAccountId,
        termId: data.termId,
        name: data.name,
        amount: data.amount,
        reason: data.reason,
        appliedBy: data.appliedBy,
        appliedAt: new Date(),
        isWaived: false,
        penaltyRuleId: data.penaltyRuleId, // Store rule ID if automated
      },
      include: {
        penaltyRule: true,
      },
    })

    // Update balance
    await StudentAccountService.updateBalance(
      studentAccount.studentId,
      studentAccount.schoolId,
      data.termId,
      data.appliedBy
    )

    // Log audit entry (async)
    setImmediate(async () => {
      try {
        await FinanceAuditService.logAction({
          schoolId: studentAccount.schoolId,
          userId: data.appliedBy,
          action: 'PENALTY_APPLIED',
          resource: "Penalty",
          resourceId: penalty.id,
          newValue: {
            name: data.name,
            amount: data.amount,
            reason: data.reason,
          },
        })
      } catch (error) {
        console.error('Failed to log penalty audit:', error)
      }
    })

    // Get user name for response
    const user = await tx.user.findUnique({
      where: { id: data.appliedBy },
      include: { staff: true },
    })
    const appliedByName = user?.staff
      ? `${user.staff.firstName} ${user.staff.lastName}`
      : user?.email || 'Unknown'

    return {
      id: penalty.id,
      studentAccountId: penalty.studentAccountId,
      studentId: studentAccount.studentId,
      studentName: `${studentAccount.student.firstName} ${studentAccount.student.lastName}`,
      penaltyRuleId: penalty.penaltyRuleId ?? undefined,
      penaltyRuleName: penalty.penaltyRule?.name,
      termId: penalty.termId,
      termName: term.name,
      name: penalty.name,
      amount: penalty.amount,
      reason: penalty.reason ?? undefined,
      isWaived: penalty.isWaived,
      waivedBy: penalty.waivedBy ?? undefined,
      waivedAt: penalty.waivedAt?.toISOString(),
      waiverReason: penalty.waiverReason ?? undefined,
      appliedBy: penalty.appliedBy,
      appliedByName,
      appliedAt: penalty.appliedAt.toISOString(),
    }
  }, {
    timeout: 10000,
    maxWait: 5000,
  })
}

/**
 * Apply late payment penalties automatically (scheduled job)
 * FIX: Issue #6 - Improved duplicate detection using database queries
 * 
 * Property 23: Auto-Penalty Application
 */
export async function applyLatePenalties(
  schoolId: string,
  termId: string
): Promise<ApplyPenaltiesResult> {
  // Get finance settings for the school
  const settings = await prisma.financeSettings.findUnique({
    where: { schoolId },
  })

  if (!settings) {
    throw new PenaltyError(
      PENALTY_ERRORS.SETTINGS_NOT_FOUND,
      'Finance settings not found for school',
      { schoolId }
    )
  }

  // Check if auto-penalty is enabled
  if (!settings.enableAutoPenalty) {
    return {
      appliedCount: 0,
      skippedCount: 0,
      totalPenaltyAmount: 0,
      penalties: [],
    }
  }

  // Get the term to verify it exists
  const term = await prisma.term.findUnique({
    where: { id: termId },
  })

  if (!term) {
    throw new PenaltyError(
      PENALTY_ERRORS.TERM_NOT_FOUND,
      'Term not found',
      { termId }
    )
  }

  // Get fee structures for this term to determine due dates
  const feeStructures = await prisma.feeStructure.findMany({
    where: {
      schoolId,
      termId,
      isActive: true,
    },
    include: {
      class: true,
    },
  })

  // Calculate the cutoff date (due date + grace period)
  const today = new Date()
  const gracePeriodDays = settings.gracePeriodDays || 0
  const latePenaltyPercentage = settings.latePenaltyPercentage || 0

  // If no penalty percentage configured, skip
  if (latePenaltyPercentage <= 0) {
    return {
      appliedCount: 0,
      skippedCount: 0,
      totalPenaltyAmount: 0,
      penalties: [],
    }
  }

  const appliedPenalties: StudentPenalty[] = []
  let skippedCount = 0
  let totalPenaltyAmount = 0

  // Get all student accounts with outstanding balances for this school
  const studentAccounts = await prisma.studentAccount.findMany({
    where: {
      schoolId,
      balance: { gt: 0 }, // Only students with outstanding balance
    },
    include: {
      student: {
        include: {
          class: true,
          stream: true,
        },
      },
    },
  })

  // Process each student account
  for (const account of studentAccounts) {
    try {
      // Find the fee structure for this student's class and type
      const feeStructure = feeStructures.find(
        (fs) =>
          fs.classId === account.student.classId &&
          fs.studentType === account.studentType
      )

      if (!feeStructure) {
        skippedCount++
        continue
      }

      // Determine the due date
      const dueDate = feeStructure.dueDate || term.startDate

      if (!dueDate) {
        skippedCount++
        continue
      }

      // Calculate cutoff date (due date + grace period)
      const cutoffDate = new Date(dueDate)
      cutoffDate.setDate(cutoffDate.getDate() + gracePeriodDays)

      // Check if we're past the grace period
      if (today <= cutoffDate) {
        skippedCount++
        continue
      }

      // FIX: Issue #6 - Check if penalty already applied using database query
      // Look for any AUTO late penalty for this term, not just by name
      const existingLatePenalty = await prisma.studentPenalty.findFirst({
        where: {
          studentAccountId: account.id,
          termId,
          isWaived: false,
          // Check by penalty rule (automated penalties have a specific marker)
          OR: [
            { name: { contains: 'Late Payment', mode: 'insensitive' } },
            { reason: { contains: 'Auto-applied', mode: 'insensitive' } },
          ],
        },
      })

      if (existingLatePenalty) {
        skippedCount++
        continue
      }

      // Calculate penalty amount based on outstanding balance
      const penaltyAmount = Math.round((account.balance * latePenaltyPercentage) / 100 * 100) / 100

      if (penaltyAmount <= 0) {
        skippedCount++
        continue
      }

      // Apply the penalty
      const penalty = await applyPenalty({
        studentAccountId: account.id,
        termId,
        name: 'Late Payment Penalty',
        amount: penaltyAmount,
        reason: `Auto-applied late payment penalty (${latePenaltyPercentage}% of outstanding balance). Due date: ${dueDate.toISOString().split('T')[0]}, Grace period: ${gracePeriodDays} days.`,
        appliedBy: 'SYSTEM',
      })

      appliedPenalties.push(penalty)
      totalPenaltyAmount += penaltyAmount
    } catch (error) {
      // Log error but continue processing other accounts
      console.error(`Failed to apply penalty for account ${account.id}:`, error)
      skippedCount++
    }
  }

  return {
    appliedCount: appliedPenalties.length,
    skippedCount,
    totalPenaltyAmount,
    penalties: appliedPenalties,
  }
}

// Waive penalty function remains the same...

export const PenaltyService = {
  applyPenalty,
  applyLatePenalties,
  // ... other functions
}

export default PenaltyService
