/**
 * Penalty Service
 * Manages penalty rules and student-specific penalties
 * Requirements: 3.5, 3.6, 3.9
 *
 * Property 12: Discount/Penalty Removal Audit
 * For any discount or penalty removal, the system SHALL require a reason
 * and create an audit entry with before/after values.
 *
 * Property 23: Auto-Penalty Application
 * For any student with overdue balance past the grace period, when auto-penalty
 * is enabled, the system SHALL apply the configured late payment penalty.
 */
import { prisma } from '@/lib/db'
import type {
  StudentPenalty,
  ApplyPenaltyInput,
  ApplyPenaltiesResult,
  PenaltyRule,
  DiscountType,
} from '@/types/finance'
import { FinanceAuditService } from './finance-audit.service'
import { updateBalance } from './student-account.service'

// Error codes for penalty operations
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
 * Requirement 3.5: require penalty type, amount, reason, and effective date
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

  // Validate amount is positive
  if (data.amount <= 0) {
    throw new PenaltyError(
      PENALTY_ERRORS.PENALTY_INVALID_AMOUNT,
      'Penalty amount must be positive',
      { amount: data.amount }
    )
  }
}

/**
 * Get user name for display
 */
async function getUserName(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { staff: true },
  })
  if (user?.staff) {
    return `${user.staff.firstName} ${user.staff.lastName}`
  }
  return user?.email || 'Unknown'
}

/**
 * Apply penalty to student account
 * Requirement 3.5: require penalty type, amount, reason, and effective date
 */
export async function applyPenalty(
  data: ApplyPenaltyInput
): Promise<StudentPenalty> {
  // Validate required fields
  validatePenaltyFields(data)

  // Get student account with student info
  const studentAccount = await prisma.studentAccount.findUnique({
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
  const term = await prisma.term.findUnique({
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
  const penalty = await prisma.studentPenalty.create({
    data: {
      studentAccountId: data.studentAccountId,
      termId: data.termId,
      name: data.name,
      amount: data.amount,
      reason: data.reason,
      appliedBy: data.appliedBy,
      appliedAt: new Date(),
      isWaived: false,
    },
    include: {
      penaltyRule: true,
    },
  })

  // Log audit entry
  await FinanceAuditService.logAction({
    schoolId: studentAccount.schoolId,
    userId: data.appliedBy,
    action: 'PENALTY_APPLIED',
    resourceType: 'Penalty',
    resourceId: penalty.id,
    newValue: {
      name: data.name,
      amount: data.amount,
      reason: data.reason,
    },
  })

  // Update balance (Requirement 2.5: balance updates immediately)
  await updateBalance(studentAccount.studentId, studentAccount.schoolId, data.termId)

  // Get user name for response
  const appliedByName = await getUserName(data.appliedBy)

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
}

/**
 * Waive penalty with reason and audit
 * Requirement 3.9: require reason and create audit trail
 * Property 12: Discount/Penalty Removal Audit
 */
export async function waivePenalty(
  penaltyId: string,
  userId: string,
  reason: string
): Promise<StudentPenalty> {
  // Validate reason is provided (Property 12)
  if (!reason || reason.trim() === '') {
    throw new PenaltyError(
      PENALTY_ERRORS.PENALTY_WAIVER_REASON_REQUIRED,
      'Reason is required when waiving a penalty',
      { penaltyId }
    )
  }

  // Get penalty with account info
  const penalty = await prisma.studentPenalty.findUnique({
    where: { id: penaltyId },
    include: {
      studentAccount: {
        include: {
          student: {
            include: {
              class: true,
              stream: true,
            },
          },
        },
      },
      penaltyRule: true,
    },
  })

  if (!penalty) {
    throw new PenaltyError(
      PENALTY_ERRORS.PENALTY_NOT_FOUND,
      'Penalty not found',
      { penaltyId }
    )
  }

  if (penalty.isWaived) {
    throw new PenaltyError(
      PENALTY_ERRORS.PENALTY_ALREADY_WAIVED,
      'Penalty has already been waived',
      { penaltyId, waivedAt: penalty.waivedAt }
    )
  }

  // Store previous value for audit (Property 12)
  const previousValue = {
    id: penalty.id,
    name: penalty.name,
    amount: penalty.amount,
    isWaived: penalty.isWaived,
  }

  // Update penalty to waived
  const updatedPenalty = await prisma.studentPenalty.update({
    where: { id: penaltyId },
    data: {
      isWaived: true,
      waivedBy: userId,
      waivedAt: new Date(),
      waiverReason: reason,
    },
    include: {
      penaltyRule: true,
    },
  })

  // Log audit entry with before/after values (Property 12)
  await FinanceAuditService.logAction({
    schoolId: penalty.studentAccount.schoolId,
    userId,
    action: 'PENALTY_WAIVED',
    resourceType: 'Penalty',
    resourceId: penaltyId,
    previousValue,
    newValue: {
      isWaived: true,
      waivedBy: userId,
      waiverReason: reason,
    },
    reason,
  })

  // Update balance (waived penalty no longer affects balance)
  await updateBalance(
    penalty.studentAccount.studentId,
    penalty.studentAccount.schoolId,
    penalty.termId
  )

  // Get term name
  const term = await prisma.term.findUnique({ where: { id: penalty.termId } })

  // Get user names
  const appliedByName = await getUserName(penalty.appliedBy)
  const waivedByName = await getUserName(userId)

  return {
    id: updatedPenalty.id,
    studentAccountId: updatedPenalty.studentAccountId,
    studentId: penalty.studentAccount.studentId,
    studentName: `${penalty.studentAccount.student.firstName} ${penalty.studentAccount.student.lastName}`,
    penaltyRuleId: updatedPenalty.penaltyRuleId ?? undefined,
    penaltyRuleName: updatedPenalty.penaltyRule?.name,
    termId: updatedPenalty.termId,
    termName: term?.name || '',
    name: updatedPenalty.name,
    amount: updatedPenalty.amount,
    reason: updatedPenalty.reason ?? undefined,
    isWaived: updatedPenalty.isWaived,
    waivedBy: updatedPenalty.waivedBy ?? undefined,
    waivedByName,
    waivedAt: updatedPenalty.waivedAt?.toISOString(),
    waiverReason: updatedPenalty.waiverReason ?? undefined,
    appliedBy: updatedPenalty.appliedBy,
    appliedByName,
    appliedAt: updatedPenalty.appliedAt.toISOString(),
  }
}


/**
 * Apply late payment penalties automatically (scheduled job)
 * Requirement 3.6: auto-apply penalties after the grace period expires
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

  // Check if auto-penalty is enabled (Property 23)
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
      penalties: {
        where: {
          termId,
          isWaived: false,
        },
      },
    },
  })

  // Process each student account
  for (const account of studentAccounts) {
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

    // Check if we're past the grace period (Property 23)
    if (today <= cutoffDate) {
      skippedCount++
      continue
    }

    // Check if a late penalty has already been applied for this term
    const existingLatePenalty = account.penalties.find(
      (p) => p.name.toLowerCase().includes('late') && !p.isWaived
    )

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
    try {
      const penalty = await applyPenalty({
        studentAccountId: account.id,
        termId,
        name: 'Late Payment Penalty',
        amount: penaltyAmount,
        reason: `Auto-applied late payment penalty (${latePenaltyPercentage}% of outstanding balance). Due date: ${dueDate.toISOString().split('T')[0]}, Grace period: ${gracePeriodDays} days.`,
        appliedBy: 'SYSTEM', // System-applied penalty
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

/**
 * List penalty rules for a school
 */
export async function listPenaltyRules(schoolId: string): Promise<PenaltyRule[]> {
  const rules = await prisma.penaltyRule.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
  })

  return rules.map((rule) => ({
    id: rule.id,
    schoolId: rule.schoolId,
    name: rule.name,
    description: rule.description ?? undefined,
    type: rule.type as DiscountType,
    value: rule.value,
    gracePeriodDays: rule.gracePeriodDays,
    isAutomatic: rule.isAutomatic,
    isActive: rule.isActive,
    createdBy: rule.createdBy,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  }))
}

/**
 * Get a specific penalty by ID
 */
export async function getPenalty(penaltyId: string): Promise<StudentPenalty | null> {
  const penalty = await prisma.studentPenalty.findUnique({
    where: { id: penaltyId },
    include: {
      studentAccount: {
        include: {
          student: {
            include: {
              class: true,
              stream: true,
            },
          },
        },
      },
      penaltyRule: true,
    },
  })

  if (!penalty) {
    return null
  }

  const term = await prisma.term.findUnique({ where: { id: penalty.termId } })
  const appliedByName = await getUserName(penalty.appliedBy)
  const waivedByName = penalty.waivedBy ? await getUserName(penalty.waivedBy) : undefined

  return {
    id: penalty.id,
    studentAccountId: penalty.studentAccountId,
    studentId: penalty.studentAccount.studentId,
    studentName: `${penalty.studentAccount.student.firstName} ${penalty.studentAccount.student.lastName}`,
    penaltyRuleId: penalty.penaltyRuleId ?? undefined,
    penaltyRuleName: penalty.penaltyRule?.name,
    termId: penalty.termId,
    termName: term?.name || '',
    name: penalty.name,
    amount: penalty.amount,
    reason: penalty.reason ?? undefined,
    isWaived: penalty.isWaived,
    waivedBy: penalty.waivedBy ?? undefined,
    waivedByName,
    waivedAt: penalty.waivedAt?.toISOString(),
    waiverReason: penalty.waiverReason ?? undefined,
    appliedBy: penalty.appliedBy,
    appliedByName,
    appliedAt: penalty.appliedAt.toISOString(),
  }
}

/**
 * List penalties for a student account
 */
export async function listStudentPenalties(
  studentAccountId: string,
  termId?: string
): Promise<StudentPenalty[]> {
  const whereClause: { studentAccountId: string; termId?: string } = { studentAccountId }
  if (termId) {
    whereClause.termId = termId
  }

  const penalties = await prisma.studentPenalty.findMany({
    where: whereClause,
    include: {
      studentAccount: {
        include: {
          student: {
            include: {
              class: true,
              stream: true,
            },
          },
        },
      },
      penaltyRule: true,
    },
    orderBy: { appliedAt: 'desc' },
  })

  const results: StudentPenalty[] = []

  for (const penalty of penalties) {
    const term = await prisma.term.findUnique({ where: { id: penalty.termId } })
    const appliedByName = await getUserName(penalty.appliedBy)
    const waivedByName = penalty.waivedBy ? await getUserName(penalty.waivedBy) : undefined

    results.push({
      id: penalty.id,
      studentAccountId: penalty.studentAccountId,
      studentId: penalty.studentAccount.studentId,
      studentName: `${penalty.studentAccount.student.firstName} ${penalty.studentAccount.student.lastName}`,
      penaltyRuleId: penalty.penaltyRuleId ?? undefined,
      penaltyRuleName: penalty.penaltyRule?.name,
      termId: penalty.termId,
      termName: term?.name || '',
      name: penalty.name,
      amount: penalty.amount,
      reason: penalty.reason ?? undefined,
      isWaived: penalty.isWaived,
      waivedBy: penalty.waivedBy ?? undefined,
      waivedByName,
      waivedAt: penalty.waivedAt?.toISOString(),
      waiverReason: penalty.waiverReason ?? undefined,
      appliedBy: penalty.appliedBy,
      appliedByName,
      appliedAt: penalty.appliedAt.toISOString(),
    })
  }

  return results
}