/**
 * SMS Credit Manager Service
 * Handles SMS credit allocation, tracking, and enforcement based on subscription tiers
 * Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 2.8, 2.9, 2.11
 */
import { prisma } from '@/lib/db';
import { PaymentTier } from '@prisma/client';

// ============================================
// CONSTANTS
// ============================================

/**
 * Credit multipliers based on payment tier
 * Requirement 2.1: FULL tier = 9x student count
 * Requirement 2.2: HALF tier = 4.5x student count
 * Requirement 2.3: QUARTER tier = 2.25x student count
 */
export const CREDIT_MULTIPLIERS: Record<PaymentTier, number> = {
  FULL: 9,
  HALF: 4.5,
  QUARTER: 2.25,
  NONE: 0,
};

/**
 * Default credit threshold percentage for notifications
 * Requirement 2.9: Notify when credits fall below threshold
 */
export const DEFAULT_CREDIT_THRESHOLD = 0.2; // 20%

// ============================================
// TYPES
// ============================================

export interface CreditAllocation {
  id: string;
  schoolId: string;
  paymentTier: PaymentTier;
  studentCount: number;
  creditsAllocated: number;
  creditsUsed: number;
  creditsRemaining: number;
  accessExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditStatus {
  hasAccess: boolean;
  reason?: string;
  // Actual credit count hidden from schools
}

export interface CreditReport {
  schoolId: string;
  totalAllocated: number;
  totalUsed: number;
  remaining: number;
  paymentTier: PaymentTier;
  studentCount: number;
  accessExpiresAt?: Date;
}

export interface SystemCreditReport {
  totalSchools: number;
  totalCreditsAllocated: number;
  totalCreditsUsed: number;
  byPaymentTier: Record<
    PaymentTier,
    {
      schools: number;
      creditsAllocated: number;
      creditsUsed: number;
    }
  >;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map Prisma SMSCreditAllocation to domain type
 */
function mapPrismaAllocationToDomain(prismaAllocation: {
  id: string;
  schoolId: string;
  paymentTier: PaymentTier;
  studentCount: number;
  creditsAllocated: number;
  creditsUsed: number;
  creditsRemaining: number;
  accessExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): CreditAllocation {
  return {
    id: prismaAllocation.id,
    schoolId: prismaAllocation.schoolId,
    paymentTier: prismaAllocation.paymentTier,
    studentCount: prismaAllocation.studentCount,
    creditsAllocated: prismaAllocation.creditsAllocated,
    creditsUsed: prismaAllocation.creditsUsed,
    creditsRemaining: prismaAllocation.creditsRemaining,
    accessExpiresAt: prismaAllocation.accessExpiresAt ?? undefined,
    createdAt: prismaAllocation.createdAt,
    updatedAt: prismaAllocation.updatedAt,
  };
}

// ============================================
// SMS CREDIT MANAGER SERVICE CLASS
// ============================================

export class SMSCreditManagerService {
  // ============================================
  // CREDIT ALLOCATION (Super Admin only)
  // ============================================

  /**
   * Calculate SMS credit allocation based on payment tier and student count
   * Requirement 2.1: FULL tier = 9x student count
   * Requirement 2.2: HALF tier = 4.5x student count
   * Requirement 2.3: QUARTER tier = 2.25x student count
   */
  calculateAllocation(studentCount: number, paymentTier: PaymentTier): number {
    const multiplier = CREDIT_MULTIPLIERS[paymentTier];
    return Math.floor(studentCount * multiplier);
  }

  /**
   * Allocate SMS credits to a school (Super Admin only)
   * Requirement 2.1, 2.2, 2.3: Allocate credits based on payment tier
   */
  async allocateCredits(
    schoolId: string,
    studentCount: number,
    paymentTier: PaymentTier,
    accessDurationMonths?: number
  ): Promise<CreditAllocation> {
    const creditsAllocated = this.calculateAllocation(studentCount, paymentTier);

    // Calculate access expiry for HALF and QUARTER tiers
    let accessExpiresAt: Date | undefined;
    if ((paymentTier === PaymentTier.HALF || paymentTier === PaymentTier.QUARTER) && accessDurationMonths) {
      accessExpiresAt = new Date();
      accessExpiresAt.setMonth(accessExpiresAt.getMonth() + accessDurationMonths);
    }

    // Upsert credit allocation
    const allocation = await prisma.sMSCreditAllocation.upsert({
      where: { schoolId },
      update: {
        paymentTier,
        studentCount,
        creditsAllocated,
        creditsRemaining: creditsAllocated,
        accessExpiresAt: accessExpiresAt ?? null,
      },
      create: {
        schoolId,
        paymentTier,
        studentCount,
        creditsAllocated,
        creditsUsed: 0,
        creditsRemaining: creditsAllocated,
        accessExpiresAt: accessExpiresAt ?? null,
      },
    });

    return mapPrismaAllocationToDomain(allocation);
  }

  // ============================================
  // CREDIT CHECKING
  // ============================================

  /**
   * Get available credits for a school (Hidden from school users)
   * Requirement 2.6, 2.7: Hide credit counts from school users
   */
  async getAvailableCredits(schoolId: string): Promise<number> {
    const allocation = await prisma.sMSCreditAllocation.findUnique({
      where: { schoolId },
      select: { creditsRemaining: true },
    });

    return allocation?.creditsRemaining ?? 0;
  }

  /**
   * Check if school has sufficient credits
   * Requirement 2.8: Block messages when credits insufficient
   */
  async hasCredits(schoolId: string, required: number = 1): Promise<boolean> {
    const available = await this.getAvailableCredits(schoolId);
    return available >= required;
  }

  /**
   * Check credit status for a school
   * Requirement 2.8: Block messages when credits insufficient
   */
  async checkCreditStatus(schoolId: string): Promise<CreditStatus> {
    const allocation = await prisma.sMSCreditAllocation.findUnique({
      where: { schoolId },
    });

    if (!allocation) {
      return {
        hasAccess: false,
        reason: 'No credit allocation found. Contact administrator.',
      };
    }

    // Check if access has expired (for HALF and QUARTER tiers)
    if (allocation.accessExpiresAt && allocation.accessExpiresAt < new Date()) {
      return {
        hasAccess: false,
        reason: 'Access period has expired. Please renew subscription.',
      };
    }

    // Check if credits are available
    if (allocation.creditsRemaining <= 0) {
      return {
        hasAccess: false,
        reason: 'Insufficient SMS credits. Contact administrator.',
      };
    }

    return {
      hasAccess: true,
    };
  }

  // ============================================
  // CREDIT DEDUCTION
  // ============================================

  /**
   * Deduct credits from school allocation with transaction safety
   * Requirement 2.8: Deduct credits when sending messages
   */
  async deductCredits(
    schoolId: string,
    amount: number,
    messageId: string
  ): Promise<void> {
    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Get current allocation with lock
      const allocation = await tx.sMSCreditAllocation.findUnique({
        where: { schoolId },
      });

      if (!allocation) {
        throw new Error('No credit allocation found for school');
      }

      if (allocation.creditsRemaining < amount) {
        throw new Error('Insufficient credits');
      }

      // Deduct credits
      await tx.sMSCreditAllocation.update({
        where: { schoolId },
        data: {
          creditsUsed: { increment: amount },
          creditsRemaining: { decrement: amount },
        },
      });

      // Check if threshold notification is needed
      const newRemaining = allocation.creditsRemaining - amount;
      const thresholdAmount = allocation.creditsAllocated * DEFAULT_CREDIT_THRESHOLD;
      
      if (newRemaining <= thresholdAmount && allocation.creditsRemaining > thresholdAmount) {
        // Threshold crossed, trigger notification
        await this.triggerThresholdNotification(schoolId, newRemaining, allocation.creditsAllocated);
      }
    });
  }

  // ============================================
  // CREDIT THRESHOLD NOTIFICATIONS
  // ============================================

  /**
   * Trigger notification when credits fall below threshold
   * Requirement 2.9: Notify administrators when credits low
   */
  private async triggerThresholdNotification(
    schoolId: string,
    remainingCredits: number,
    totalCredits: number
  ): Promise<void> {
    const percentage = (remainingCredits / totalCredits) * 100;
    
    // Log notification (in production, this would send actual notifications)
    console.log(
      `[SMS_CREDIT_ALERT] School ${schoolId}: Credits low - ${remainingCredits} remaining (${percentage.toFixed(1)}%)`
    );

    // TODO: Integrate with notification service to send actual alerts
    // This would typically:
    // 1. Send in-app notification to school administrators
    // 2. Send email to school administrators
    // 3. Log the alert in the system
  }

  /**
   * Check credit levels against configured thresholds
   * Requirement 2.9: Check credit levels and generate notifications
   */
  async checkCreditThresholds(schoolId: string, thresholdPercentage: number = DEFAULT_CREDIT_THRESHOLD): Promise<{
    belowThreshold: boolean;
    remainingCredits: number;
    thresholdAmount: number;
    percentage: number;
  }> {
    const allocation = await prisma.sMSCreditAllocation.findUnique({
      where: { schoolId },
    });

    if (!allocation) {
      return {
        belowThreshold: false,
        remainingCredits: 0,
        thresholdAmount: 0,
        percentage: 0,
      };
    }

    const thresholdAmount = allocation.creditsAllocated * thresholdPercentage;
    const belowThreshold = allocation.creditsRemaining <= thresholdAmount;
    const percentage = (allocation.creditsRemaining / allocation.creditsAllocated) * 100;

    return {
      belowThreshold,
      remainingCredits: allocation.creditsRemaining,
      thresholdAmount,
      percentage,
    };
  }

  /**
   * Generate notifications for administrators
   * Requirement 2.9: Generate notifications when credits low
   */
  async generateThresholdNotifications(schoolId: string): Promise<void> {
    const thresholdCheck = await this.checkCreditThresholds(schoolId);

    if (thresholdCheck.belowThreshold) {
      await this.triggerThresholdNotification(
        schoolId,
        thresholdCheck.remainingCredits,
        thresholdCheck.remainingCredits + (await this.getUsedCredits(schoolId))
      );
    }
  }

  /**
   * Get used credits for a school
   */
  private async getUsedCredits(schoolId: string): Promise<number> {
    const allocation = await prisma.sMSCreditAllocation.findUnique({
      where: { schoolId },
      select: { creditsUsed: true },
    });

    return allocation?.creditsUsed ?? 0;
  }

  // ============================================
  // REPORTING (Super Admin only)
  // ============================================

  /**
   * Get credit report for a school (Super Admin only)
   * Requirement 2.6, 2.7: Show costs only to super admins
   */
  async getCreditReport(schoolId: string): Promise<CreditReport | null> {
    const allocation = await prisma.sMSCreditAllocation.findUnique({
      where: { schoolId },
    });

    if (!allocation) {
      return null;
    }

    return {
      schoolId: allocation.schoolId,
      totalAllocated: allocation.creditsAllocated,
      totalUsed: allocation.creditsUsed,
      remaining: allocation.creditsRemaining,
      paymentTier: allocation.paymentTier,
      studentCount: allocation.studentCount,
      accessExpiresAt: allocation.accessExpiresAt ?? undefined,
    };
  }

  /**
   * Get system-wide credit usage report (Super Admin only)
   * Requirement 2.6, 2.7: Show costs only to super admins
   */
  async getSystemWideCreditUsage(): Promise<SystemCreditReport> {
    const allocations = await prisma.sMSCreditAllocation.findMany();

    const totalSchools = allocations.length;
    const totalCreditsAllocated = allocations.reduce((sum, a) => sum + a.creditsAllocated, 0);
    const totalCreditsUsed = allocations.reduce((sum, a) => sum + a.creditsUsed, 0);

    // Group by payment tier
    const byPaymentTier: SystemCreditReport['byPaymentTier'] = {
      FULL: { schools: 0, creditsAllocated: 0, creditsUsed: 0 },
      HALF: { schools: 0, creditsAllocated: 0, creditsUsed: 0 },
      QUARTER: { schools: 0, creditsAllocated: 0, creditsUsed: 0 },
      NONE: { schools: 0, creditsAllocated: 0, creditsUsed: 0 },
    };

    for (const allocation of allocations) {
      const tier = allocation.paymentTier;
      byPaymentTier[tier].schools += 1;
      byPaymentTier[tier].creditsAllocated += allocation.creditsAllocated;
      byPaymentTier[tier].creditsUsed += allocation.creditsUsed;
    }

    return {
      totalSchools,
      totalCreditsAllocated,
      totalCreditsUsed,
      byPaymentTier,
    };
  }
}

// Export singleton instance
export const smsCreditManagerService = new SMSCreditManagerService();
