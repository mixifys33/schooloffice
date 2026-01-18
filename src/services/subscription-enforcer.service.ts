/**
 * Subscription Enforcer Service
 * Enforces subscription-based access control and feature restrictions
 * Requirements: 2.4, 2.5, 2.6, 2.7
 */
import { prisma } from '@/lib/db';
import { PaymentTier } from '@prisma/client';

// ============================================
// TYPES
// ============================================

/**
 * Features that can be controlled by subscription
 */
export enum Feature {
  SMS_MESSAGING = 'SMS_MESSAGING',
  TEMPLATE_MANAGEMENT = 'TEMPLATE_MANAGEMENT',
  AUTO_TRIGGERS = 'AUTO_TRIGGERS',
  REPORTS = 'REPORTS',
  STUDENT_MANAGEMENT = 'STUDENT_MANAGEMENT',
  STAFF_MANAGEMENT = 'STAFF_MANAGEMENT',
  FINANCE_MANAGEMENT = 'FINANCE_MANAGEMENT',
  ATTENDANCE = 'ATTENDANCE',
  TIMETABLE = 'TIMETABLE',
  EXAMINATIONS = 'EXAMINATIONS',
}

/**
 * Access validation result
 */
export interface AccessValidation {
  allowed: boolean;
  paymentTier: PaymentTier;
  reason?: string;
  expiresAt?: Date;
  daysRemaining?: number;
}

/**
 * Subscription update data
 */
export interface SubscriptionUpdate {
  paymentTier: PaymentTier;
  paymentAmount: number;
  studentCount: number;
  accessDuration?: number; // months
}

/**
 * Expiry status information
 */
export interface ExpiryStatus {
  isExpired: boolean;
  expiresAt?: Date;
  daysRemaining?: number;
  autoRenewal: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate days remaining until expiry
 */
function calculateDaysRemaining(expiresAt: Date): number {
  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Calculate access expiry date based on duration in months
 */
function calculateExpiryDate(months: number): Date {
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + months);
  return expiryDate;
}

// ============================================
// SUBSCRIPTION ENFORCER SERVICE CLASS
// ============================================

export class SubscriptionEnforcerService {
  // ============================================
  // ACCESS VALIDATION
  // ============================================

  /**
   * Validate school access based on subscription status
   * Requirement 2.4: Block all features for non-paying schools
   * Requirement 2.5: Enforce time-based access limits for partial payments
   */
  async validateAccess(schoolId: string): Promise<AccessValidation> {
    const subscription = await prisma.schoolSubscription.findUnique({
      where: { schoolId },
    });

    // No subscription found - deny access
    if (!subscription) {
      return {
        allowed: false,
        paymentTier: PaymentTier.NONE,
        reason: 'No active subscription found. Please contact administrator to set up subscription.',
      };
    }

    // NONE tier - complete lockout
    // Requirement 2.4: Block all features for non-paying schools
    if (subscription.paymentTier === PaymentTier.NONE) {
      return {
        allowed: false,
        paymentTier: PaymentTier.NONE,
        reason: 'Subscription payment required. Please contact administrator to activate your subscription.',
      };
    }

    // Check if subscription is inactive
    if (!subscription.isActive) {
      return {
        allowed: false,
        paymentTier: subscription.paymentTier,
        reason: 'Subscription is inactive. Please contact administrator.',
      };
    }

    // Check time-based expiry for HALF and QUARTER tiers
    // Requirement 2.5: Enforce one-month access limit for partial payments
    if (subscription.accessExpiresAt) {
      const now = new Date();
      
      if (subscription.accessExpiresAt < now) {
        // Access has expired - automatically lock the school
        await this.lockSchool(
          schoolId,
          'Access period expired. Please renew subscription.'
        );

        return {
          allowed: false,
          paymentTier: subscription.paymentTier,
          reason: 'Access period has expired. Please renew your subscription to continue using the system.',
          expiresAt: subscription.accessExpiresAt,
          daysRemaining: 0,
        };
      }

      // Access still valid - return with expiry info
      const daysRemaining = calculateDaysRemaining(subscription.accessExpiresAt);
      
      return {
        allowed: true,
        paymentTier: subscription.paymentTier,
        expiresAt: subscription.accessExpiresAt,
        daysRemaining,
      };
    }

    // FULL tier or no expiry - full access
    return {
      allowed: true,
      paymentTier: subscription.paymentTier,
    };
  }

  /**
   * Check if school can send SMS
   * Requirement 2.4: Block SMS for non-paying schools
   */
  async canSendSMS(schoolId: string): Promise<boolean> {
    const validation = await this.validateAccess(schoolId);
    return validation.allowed;
  }

  /**
   * Check if school can access a specific feature
   * Requirement 2.4: Block all features for non-paying schools
   */
  async canAccessFeature(schoolId: string, feature: Feature): Promise<boolean> {
    const validation = await this.validateAccess(schoolId);
    
    // If access is denied, all features are blocked
    if (!validation.allowed) {
      return false;
    }

    // For now, all features are available if subscription is active
    // This can be extended to have feature-specific restrictions based on payment tier
    return true;
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================

  /**
   * Update school subscription
   * Requirement 2.2, 2.3: Set access duration for HALF and QUARTER tiers
   */
  async updateSubscription(
    schoolId: string,
    update: SubscriptionUpdate
  ): Promise<void> {
    // Calculate access expiry for HALF and QUARTER tiers
    let accessExpiresAt: Date | null = null;
    
    if (update.paymentTier === PaymentTier.HALF || update.paymentTier === PaymentTier.QUARTER) {
      // Default to 1 month if not specified
      const duration = update.accessDuration ?? 1;
      accessExpiresAt = calculateExpiryDate(duration);
    }

    // Upsert subscription
    await prisma.schoolSubscription.upsert({
      where: { schoolId },
      update: {
        paymentTier: update.paymentTier,
        paymentAmount: update.paymentAmount,
        studentCount: update.studentCount,
        isActive: update.paymentTier !== PaymentTier.NONE,
        accessExpiresAt,
        lastPaymentDate: new Date(),
      },
      create: {
        schoolId,
        paymentTier: update.paymentTier,
        paymentAmount: update.paymentAmount,
        studentCount: update.studentCount,
        isActive: update.paymentTier !== PaymentTier.NONE,
        accessExpiresAt,
        lastPaymentDate: new Date(),
      },
    });
  }

  /**
   * Check subscription expiry status
   * Requirement 2.5: Check if access has expired for partial payments
   */
  async checkSubscriptionExpiry(schoolId: string): Promise<ExpiryStatus> {
    const subscription = await prisma.schoolSubscription.findUnique({
      where: { schoolId },
    });

    if (!subscription || !subscription.accessExpiresAt) {
      return {
        isExpired: false,
        autoRenewal: false,
      };
    }

    const now = new Date();
    const isExpired = subscription.accessExpiresAt < now;
    const daysRemaining = isExpired ? 0 : calculateDaysRemaining(subscription.accessExpiresAt);

    return {
      isExpired,
      expiresAt: subscription.accessExpiresAt,
      daysRemaining,
      autoRenewal: false, // Can be extended to support auto-renewal
    };
  }

  // ============================================
  // ENFORCEMENT ACTIONS
  // ============================================

  /**
   * Lock school access
   * Requirement 2.5: Automatically close access after expiry
   */
  async lockSchool(schoolId: string, reason: string): Promise<void> {
    await prisma.schoolSubscription.update({
      where: { schoolId },
      data: {
        isActive: false,
      },
    });

    // Log the lockout
    console.log(`[SUBSCRIPTION_ENFORCER] School ${schoolId} locked: ${reason}`);
    
    // TODO: Send notification to school administrators
    // This would typically:
    // 1. Send in-app notification
    // 2. Send email notification
    // 3. Log the event in audit trail
  }

  /**
   * Unlock school access
   * Requirement 2.5: Allow re-activation after payment
   */
  async unlockSchool(schoolId: string): Promise<void> {
    await prisma.schoolSubscription.update({
      where: { schoolId },
      data: {
        isActive: true,
      },
    });

    // Log the unlock
    console.log(`[SUBSCRIPTION_ENFORCER] School ${schoolId} unlocked`);
    
    // TODO: Send notification to school administrators
  }

  // ============================================
  // COST VISIBILITY RESTRICTIONS
  // ============================================

  /**
   * Check if user can view SMS costs
   * Requirement 2.6, 2.7: Hide costs from school users, show only to super admins
   */
  canViewCosts(userRole: string): boolean {
    return userRole === 'SUPER_ADMIN';
  }

  /**
   * Check if user can view credit counts
   * Requirement 2.6, 2.7: Hide credit counts from school users, show only to super admins
   */
  canViewCreditCounts(userRole: string): boolean {
    return userRole === 'SUPER_ADMIN';
  }

  /**
   * Filter response data based on user role
   * Requirement 2.6, 2.7: Remove cost/credit data for non-super-admin users
   */
  filterCostData<T extends Record<string, any>>(
    data: T,
    userRole: string,
    fieldsToFilter: string[] = ['cost', 'credits', 'creditsAllocated', 'creditsUsed', 'creditsRemaining']
  ): Partial<T> {
    if (this.canViewCosts(userRole)) {
      return data;
    }

    // Remove cost-related fields for non-super-admin users
    const filtered = { ...data };
    for (const field of fieldsToFilter) {
      if (field in filtered) {
        delete filtered[field];
      }
    }

    return filtered;
  }

  // ============================================
  // BATCH OPERATIONS
  // ============================================

  /**
   * Check and lock expired subscriptions (run as scheduled job)
   * Requirement 2.5: Automatically close access after one month for partial payments
   */
  async checkAndLockExpiredSubscriptions(): Promise<{
    checked: number;
    locked: number;
    schoolIds: string[];
  }> {
    const now = new Date();

    // Find all subscriptions with expiry dates in the past
    const expiredSubscriptions = await prisma.schoolSubscription.findMany({
      where: {
        isActive: true,
        accessExpiresAt: {
          lt: now,
        },
      },
    });

    const lockedSchools: string[] = [];

    // Lock each expired subscription
    for (const subscription of expiredSubscriptions) {
      await this.lockSchool(
        subscription.schoolId,
        'Access period expired automatically'
      );
      lockedSchools.push(subscription.schoolId);
    }

    return {
      checked: expiredSubscriptions.length,
      locked: lockedSchools.length,
      schoolIds: lockedSchools,
    };
  }

  /**
   * Get subscriptions expiring soon (for notifications)
   * Requirement 2.5: Warn schools before expiry
   */
  async getExpiringSoon(daysThreshold: number = 7): Promise<Array<{
    schoolId: string;
    paymentTier: PaymentTier;
    expiresAt: Date;
    daysRemaining: number;
  }>> {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const expiringSoon = await prisma.schoolSubscription.findMany({
      where: {
        isActive: true,
        accessExpiresAt: {
          gte: now,
          lte: thresholdDate,
        },
      },
    });

    return expiringSoon.map(sub => ({
      schoolId: sub.schoolId,
      paymentTier: sub.paymentTier,
      expiresAt: sub.accessExpiresAt!,
      daysRemaining: calculateDaysRemaining(sub.accessExpiresAt!),
    }));
  }
}

// Export singleton instance
export const subscriptionEnforcerService = new SubscriptionEnforcerService();
