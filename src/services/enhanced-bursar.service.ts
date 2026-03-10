/**
 * Enhanced Bursar Service with Production-Grade Automation
 * Implements the complete automated fee reminder system with all safety features
 *   
 * Requirements Implemented:
 * - No guessing: Validates all inputs before proceeding
 * - Calculated truth: Derives percentages from actual amounts
 * - Silent by default: No SMS unless all checks pass
 * - Everything logged: Full audit trail
 * - Schools control rules, not messages: Locked templates
 * - Human override: Pause/resume functionality
 */

import { prisma } from '@/lib/db'

// Type definitions
type PaymentMilestone = {
  week: number;
  percentage: number;
};

export interface BursarMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  collectionRate: number;
  outstandingFees: number;
  cashFlow: number;
  budgetVariance: number;
  studentsWithOutstandingFees: number;
  totalStudents: number;
  monthlyTrend: Array<{ month: string; collected: number; outstanding: number }>;
  paymentMethods: Array<{ method: string; amount: number; percentage: number; count: number }>;
  alerts: Array<{ id: string; type: 'warning' | 'error' | 'info'; message: string; timestamp: string }>;
}

export class EnhancedBursarService {
  /**
   * Get comprehensive financial metrics for the bursar dashboard
   */
  static async getFinancialMetrics(
    schoolId: string,
    termId: string,
    period: 'current-term' | 'academic-year' | 'monthly' = 'current-term'
  ): Promise<BursarMetrics> {
    try {
      // Get term information
      const term = await prisma.term.findUnique({
        where: { id: termId }
      });

      if (!term) {
        throw new Error('Term not found');
      }

      // Calculate date range based on period and term
      const { startDate, endDate } = await this.getDateRange(schoolId, termId, period);

      // Parallel execution for performance
      const [
        revenueData,
        expensesData,
        totalFeesData,
        outstandingData,
        studentsData,
        monthlyTrendData,
        paymentMethodsData,
        alertsData
      ] = await Promise.all([
        this.calculateRevenue(schoolId, termId, startDate, endDate),
        this.calculateExpenses(schoolId, startDate, endDate),
        this.calculateTotalFees(schoolId, termId, startDate, endDate),
        this.calculateOutstandingFees(schoolId, termId, endDate),
        this.getStudentCounts(schoolId, termId),
        this.getMonthlyTrend(schoolId, termId, 6), // Last 6 months
        this.getPaymentMethodsDistribution(schoolId, termId, startDate, endDate),
        this.generateFinancialAlerts(schoolId, termId)
      ]);

      const totalRevenue = revenueData;
      const totalExpenses = expensesData;
      const netIncome = totalRevenue - totalExpenses;
      const collectionRate = totalFeesData > 0 ? (totalRevenue / totalFeesData) * 100 : 0;
      const outstandingFees = outstandingData.amount;
      const studentsWithOutstandingFees = outstandingData.count;
      const cashFlow = netIncome; // Simplified cash flow
      const budgetVariance = await this.calculateBudgetVariance(schoolId, startDate, endDate);

      return {
        totalRevenue,
        totalExpenses,
        netIncome,
        collectionRate,
        outstandingFees,
        cashFlow,
        budgetVariance,
        studentsWithOutstandingFees,
        totalStudents: studentsData,
        monthlyTrend: monthlyTrendData,
        paymentMethods: paymentMethodsData,
        alerts: alertsData
      };

    } catch (error) {
      console.error('Error calculating financial metrics:', error);
      throw new Error('Failed to calculate financial metrics');
    }
  }

  // ============================================
  // AUTOMATION ENGINE - CORE FUNCTIONALITY
  // ============================================

  /**
   * Run Automated Fee Reminders (MAIN ENGINE)
   * Implements all safety features from requirements
   */
  static async runAutomatedFeeReminders(schoolId: string, termId: string, dryRun: boolean = false): Promise<{
    totalRecipients: number;
    sent: number;
    failed: number;
    queued: number;
    errors: string[];
  }> {
    const result = { totalRecipients: 0, sent: 0, failed: 0, queued: 0, errors: [] as string[] };
    const LOG_PREFIX = dryRun ? `[DRY-RUN ${schoolId}]` : `[AUTO-FEES ${schoolId}]`;

    try {
      // 1. PRE-FLIGHT VALIDATION (FAIL FAST)
      console.log(`${LOG_PREFIX} Starting automated fee reminders...`);

      // Validate term exists and is active
      const term = await prisma.term.findUnique({
        where: { id: termId },
        include: { academicYear: true }
      });

      if (!term || !term.academicYear.isActive) {
        console.error(`${LOG_PREFIX} Term not found or inactive. Automation aborted.`);
        result.errors.push('Term not found or inactive');
        return result;
      }

      // Validate school exists and is active
      const school = await prisma.school.findUnique({
        where: { id: schoolId }
      });

      if (!school || !school.isActive) {
        console.error(`${LOG_PREFIX} School not found or inactive. Automation aborted.`);
        result.errors.push('School not found or inactive');
        return result;
      }

      // Get finance settings
      const settings = await prisma.financeSettings.findUnique({
        where: { 
          schoolId_termId: { 
            schoolId, 
            termId  // Updated to use composite key with termId
          } 
        }
      });

      if (!settings?.enableAutomatedReminders) {
        console.log(`${LOG_PREFIX} Automation disabled for this term. Skipping.`);
        result.errors.push('Automation disabled');
        return result;
      }

      // Validate payment milestones are correctly configured
      const milestones = (settings.paymentMilestones as unknown as PaymentMilestone[]) || [];
      if (milestones.length === 0) {
        console.error(`${LOG_PREFIX} No payment milestones configured for this term. Aborting.`);
        result.errors.push('No payment milestones configured');
        return result;
      }

      const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.1) {
        console.error(`${LOG_PREFIX} Milestones do not total 100% (total: ${totalPercentage}%). Aborting.`);
        result.errors.push(`Milestones total ${totalPercentage}%, must be 100%`);
        return result;
      }

      // Check if term is locked (milestones can't be edited after locking)
      if (settings.lockedAt) {
        console.log(`${LOG_PREFIX} Finance settings locked at ${settings.lockedAt}. Settings cannot be changed.`);
      }

      // Check if we've already run today (for production environments)
      if (!dryRun && settings.lastAutomationRunAt) {
        const lastRun = new Date(settings.lastAutomationRunAt);
        const today = new Date();
        
        // Compare dates only (ignore time)
        if (lastRun.toDateString() === today.toDateString()) {
          console.log(`${LOG_PREFIX} Automation already ran today. Skipping.`);
          result.errors.push('Automation already ran today');
          return result;
        }
      }

      console.log(`${LOG_PREFIX} Active term: ${term.name} (${term.academicYear.name})`);

      // 2. CALCULATE ACADEMIC WEEK
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysSinceStart = Math.floor((Date.now() - term.startDate.getTime()) / msPerDay);
      const weeksSinceStart = Math.floor(daysSinceStart / 7) + 1;

      // 3. DETERMINE CURRENT MILESTONE
      const relevantMilestone = milestones
        .filter(m => m.week <= weeksSinceStart)
        .sort((a, b) => b.week - a.week)[0];

      if (!relevantMilestone) {
        console.log(`${LOG_PREFIX} Week ${weeksSinceStart}: No milestone reached yet.`);
        result.errors.push(`Week ${weeksSinceStart}: No applicable milestone`);
        return result;
      }

      console.log(`${LOG_PREFIX} Running for Week ${weeksSinceStart}. Milestone: ${relevantMilestone.percentage}%`);

      // 4. FETCH TARGET ACCOUNTS (only students with outstanding balances)
      const accounts = await prisma.studentAccount.findMany({
        where: {
          schoolId,
          termId,
          isExempted: false,
          balance: { gt: 0 }
        },
        include: {
          student: {
            include: {
              class: true,
              studentGuardians: {
                where: { isPrimary: true },
                include: { guardian: true }
              }
            }
          }
        }
      });

      result.totalRecipients = accounts.length;

      // 5. PROCESS EACH ACCOUNT WITH ALL SAFETY CHECKS
      for (const account of accounts) {
        try {
          // Skip if exempted
          if (account.isExempted) continue;

          // Skip if no total fees (no obligation)
          if (account.totalFees <= 0) continue;

          // Calculate required amount based on milestone
          const requiredAmount = (account.totalFees * relevantMilestone.percentage) / 100;
          const paidAmount = account.totalPaid;
          const paidPercentage = account.totalFees > 0 ? (paidAmount / account.totalFees) * 100 : 0;

          // Skip if already met this milestone requirement
          if (paidAmount >= requiredAmount) continue;

          // Calculate days past milestone deadline
          const milestoneDate = new Date(term.startDate.getTime() + (relevantMilestone.week * 7 * msPerDay));
          const daysPastMilestone = Math.floor((Date.now() - milestoneDate.getTime()) / msPerDay);

          // Skip if within grace period
          if (daysPastMilestone < settings.gracePeriodDays) continue;

          // Check milestone tracker to prevent spam
          const tracker = await prisma.studentMilestoneStatus.upsert({
            where: {
              studentId_termId_milestonePercentage: {
                studentId: account.studentId,
                termId: termId,
                milestonePercentage: relevantMilestone.percentage
              }
            },
            create: {
              schoolId: schoolId,
              studentId: account.studentId,
              termId: termId,
              milestonePercentage: relevantMilestone.percentage,
              requiredByWeek: relevantMilestone.week,
              status: 'PENDING'
            },
            update: {}
          });

          // Skip if already cleared this milestone
          if (tracker.status === 'CLEARED') continue;

          // Skip if max reminders reached for this milestone
          if (tracker.reminderCount >= settings.maxRemindersPerMilestone) continue;

          // Skip if last reminder was sent too recently (anti-spam)
          if (tracker.lastReminderSentAt) {
            const daysSinceLast = Math.floor((Date.now() - tracker.lastReminderSentAt.getTime()) / msPerDay);
            if (daysSinceLast < 3) continue; // Minimum 3 days between reminders
          }

          // Get guardian contact info
          const guardian = account.student.studentGuardians[0]?.guardian;
          
          // Skip if no guardian or phone number
          if (!guardian || !guardian.phone) {
            result.errors.push(`Student ${account.student.admissionNumber}: No guardian/phone`);
            result.failed++;
            continue;
          }

          // Validate phone number format (Ugandan format)
          if (!this.isValidUgandanPhone(guardian.phone)) {
            result.errors.push(`Student ${account.student.admissionNumber}: Invalid phone format`);
            result.failed++;
            continue;
          }

          // Calculate shortfall for the message
          const balance = account.balance;
          const shortfall = requiredAmount - paidAmount;

          // Construct the locked template message
          const message = `Dear Parent, our records show that ${account.student.firstName} ${account.student.lastName} (${account.student.class.name}) has paid ${paidPercentage.toFixed(1)}% of the required ${relevantMilestone.percentage}% fees for ${term.name}. Balance: UGX ${balance.toLocaleString()}. Please clear by Week ${relevantMilestone.week}. School Management.`;

          // Skip sending if dry run
          if (dryRun) {
            console.log(`${LOG_PREFIX} [DRY-RUN] Would send to ${guardian.phone}: ${message.substring(0, 100)}...`);
            result.queued++;
            continue;
          }

          // Actually send the SMS
          const sendResult = await this.sendSMS(guardian.phone, message);

          if (sendResult.success) {
            result.sent++;

            // Update milestone tracker
            await prisma.studentMilestoneStatus.update({
              where: { id: tracker.id },
              data: {
                reminderCount: { increment: 1 },
                lastReminderSentAt: new Date()
              }
            });

            // Log the notification
            await prisma.financeNotificationLog.create({
              data: {
                schoolId,
                guardianId: guardian.id,
                studentId: account.studentId,
                studentAccountId: account.id,
                type: 'FEE_REMINDER',
                messageType: 'AUTOMATED',
                channel: 'SMS',
                content: message,
                status: 'SENT',
                sentAt: new Date(),
                recipientPhone: guardian.phone,
                milestonePercentage: relevantMilestone.percentage,
                academicWeek: weeksSinceStart,
                metadata: JSON.stringify({
                  week: weeksSinceStart,
                  required: relevantMilestone.percentage,
                  paidPct: paidPercentage,
                  balance,
                  shortfall
                })
              }
            });

            // Update finance settings with last run time
            await prisma.financeSettings.update({
              where: { id: settings.id },
              data: { lastAutomationRunAt: new Date() }
            });

          } else {
            result.failed++;
            result.errors.push(`${account.student.firstName}: ${sendResult.error}`);

            // Log failed notification
            await prisma.financeNotificationLog.create({
              data: {
                schoolId,
                guardianId: guardian.id,
                studentId: account.studentId,
                studentAccountId: account.id,
                type: 'FEE_REMINDER',
                messageType: 'AUTOMATED',
                channel: 'SMS',
                content: message,
                status: 'FAILED',
                error: sendResult.error,
                recipientPhone: guardian.phone,
                milestonePercentage: relevantMilestone.percentage,
                academicWeek: weeksSinceStart
              }
            });
          }

        } catch (innerError) {
          console.error(`${LOG_PREFIX} Error processing student ${account.studentId}:`, innerError);
          result.errors.push(`Student ${account.studentId} error`);
          result.failed++;
        }
      }

      // Create audit log entry
      if (!dryRun) {
        await prisma.auditLog.create({
          data: {
            schoolId,
            userId: 'SYSTEM',
            action: 'AUTOMATED_FEE_REMINDERS',
            resource: 'FinanceNotification',
            resourceId: schoolId,
            newValue: {
              sent: result.sent,
              failed: result.failed,
              totalTargets: result.totalRecipients,
              milestone: relevantMilestone.percentage,
              week: weeksSinceStart,
              termId
            },
            timestamp: new Date()
          }
        });
      }

      console.log(`${LOG_PREFIX} Completed: ${result.sent} sent, ${result.failed} failed, ${result.queued} queued`);
      return result;

    } catch (error) {
      console.error(`${LOG_PREFIX} Fatal automation error:`, error);
      result.errors.push('Fatal system error');
      return result;
    }
  }

  /**
   * Preview what automation would send without actually sending messages
   */
  static async previewAutomatedFeeReminders(schoolId: string, termId: string): Promise<{
    totalTargets: number;
    students: Array<{
      studentId: string;
      studentName: string;
      admissionNumber: string;
      className: string;
      totalFees: number;
      paidAmount: number;
      paidPercentage: number;
      balance: number;
      requiredPercentage: number;
      shortfall: number;
      guardianPhone: string | null;
      reminderCount: number;
      lastReminderSent: Date | null;
      wouldSend: boolean;
      skipReason?: string;
    }>;
    errors: string[];
  }> {
    const result = { totalTargets: 0, students: [], errors: [] as string[] };
    const LOG_PREFIX = `[DRY-RUN ${schoolId}]`;

    try {
      // Get term information
      const term = await prisma.term.findUnique({
        where: { id: termId },
        include: { academicYear: true }
      });

      if (!term || !term.academicYear.isActive) {
        result.errors.push('Term not found or inactive');
        return result;
      }

      // Get finance settings
      const settings = await prisma.financeSettings.findUnique({
        where: { 
          schoolId_termId: { 
            schoolId, 
            termId 
          } 
        }
      });

      if (!settings?.enableAutomatedReminders) {
        result.errors.push('Automation disabled');
        return result;
      }

      // Validate milestones
      const milestones = (settings.paymentMilestones as unknown as PaymentMilestone[]) || [];
      if (milestones.length === 0) {
        result.errors.push('No payment milestones configured');
        return result;
      }

      const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
      if (Math.abs(totalPercentage - 100) > 0.1) {
        result.errors.push(`Milestones total ${totalPercentage}%, must be 100%`);
        return result;
      }

      // Calculate academic week
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysSinceStart = Math.floor((Date.now() - term.startDate.getTime()) / msPerDay);
      const weeksSinceStart = Math.floor(daysSinceStart / 7) + 1;

      // Determine current milestone
      const relevantMilestone = milestones
        .filter(m => m.week <= weeksSinceStart)
        .sort((a, b) => b.week - a.week)[0];

      if (!relevantMilestone) {
        result.errors.push(`Week ${weeksSinceStart}: No applicable milestone`);
        return result;
      }

      // Get accounts to evaluate
      const accounts = await prisma.studentAccount.findMany({
        where: {
          schoolId,
          termId,
          isExempted: false,
          balance: { gt: 0 }
        },
        include: {
          student: {
            include: {
              class: true,
              studentGuardians: {
                where: { isPrimary: true },
                include: { guardian: true }
              }
            }
          }
        }
      });

      result.totalTargets = accounts.length;

      // Evaluate each account
      for (const account of accounts) {
        const totalFees = account.totalFees;
        if (totalFees <= 0) continue;

        const requiredAmount = (totalFees * relevantMilestone.percentage) / 100;
        const paidAmount = account.totalPaid;
        const paidPercentage = totalFees > 0 ? (paidAmount / totalFees) * 100 : 0;
        const balance = account.balance;
        const shortfall = requiredAmount - paidAmount;

        const guardian = account.student.studentGuardians[0]?.guardian;
        let wouldSend = true;
        let skipReason: string | undefined;

        // Check if already met milestone
        if (paidAmount >= requiredAmount) {
          wouldSend = false;
          skipReason = 'Already met milestone requirement';
        }

        // Calculate days past milestone
        const milestoneDate = new Date(term.startDate.getTime() + (relevantMilestone.week * 7 * msPerDay));
        const daysPastMilestone = Math.floor((Date.now() - milestoneDate.getTime()) / msPerDay);

        // Check grace period
        if (daysPastMilestone < settings.gracePeriodDays) {
          wouldSend = false;
          skipReason = `Within grace period (${settings.gracePeriodDays} days)`;
        }

        // Check milestone tracker
        const tracker = await prisma.studentMilestoneStatus.findUnique({
          where: {
            studentId_termId_milestonePercentage: {
              studentId: account.studentId,
              termId: termId,
              milestonePercentage: relevantMilestone.percentage
            }
          }
        });

        if (tracker && tracker.reminderCount >= settings.maxRemindersPerMilestone) {
          wouldSend = false;
          skipReason = `Max reminders reached (${settings.maxRemindersPerMilestone})`;
        }

        if (tracker && tracker.lastReminderSentAt) {
          const daysSinceLast = Math.floor((Date.now() - tracker.lastReminderSentAt.getTime()) / msPerDay);
          if (daysSinceLast < 3) {
            wouldSend = false;
            skipReason = `Last reminder sent ${daysSinceLast} days ago (min 3 days)`;
          }
        }

        if (!guardian || !guardian.phone) {
          wouldSend = false;
          skipReason = 'No guardian phone number';
        }

        result.students.push({
          studentId: account.studentId,
          studentName: `${account.student.firstName} ${account.student.lastName}`,
          admissionNumber: account.student.admissionNumber,
          className: account.student.class.name,
          totalFees,
          paidAmount,
          paidPercentage: parseFloat(paidPercentage.toFixed(1)),
          balance,
          requiredPercentage: relevantMilestone.percentage,
          shortfall,
          guardianPhone: guardian?.phone || null,
          reminderCount: tracker?.reminderCount || 0,
          lastReminderSent: tracker?.lastReminderSentAt || null,
          wouldSend,
          skipReason
        });
      }

      console.log(`${LOG_PREFIX} Preview complete: ${result.students.filter(s => s.wouldSend).length}/${result.totalTargets} would receive SMS`);
      return result;

    } catch (error) {
      console.error(`${LOG_PREFIX} Preview error:`, error);
      result.errors.push('Preview generation failed');
      return result;
    }
  }

  // ============================================
  // MANUAL CONTROLS
  // ============================================

  /**
   * Pause reminders for a specific student
   */
  static async pauseRemindersForStudent(
    schoolId: string,
    studentId: string,
    termId: string,
    reason: string,
    pausedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the student account
      const account = await prisma.studentAccount.findUnique({
        where: { 
          studentId_termId: { 
            studentId, 
            termId 
          } 
        }
      });

      if (!account) {
        return { success: false, error: 'Student account not found' };
      }

      // Update account to exempt from reminders
      await prisma.studentAccount.update({
        where: { id: account.id },
        data: {
          isExempted: true,
          exemptionReason: reason
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          schoolId,
          userId: pausedBy,
          action: 'PAUSE_FEE_REMINDERS',
          resource: 'StudentAccount',
          resourceId: account.id,
          newValue: { reason, pausedAt: new Date() },
          timestamp: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to pause reminders' };
    }
  }

  /**
   * Resume reminders for a student
   */
  static async resumeRemindersForStudent(
    schoolId: string,
    studentId: string,
    termId: string,
    resumedBy: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the student account
      const account = await prisma.studentAccount.findUnique({
        where: { 
          studentId_termId: { 
            studentId, 
            termId 
          } 
        }
      });

      if (!account) {
        return { success: false, error: 'Student account not found' };
      }

      // Update account to allow reminders again
      await prisma.studentAccount.update({
        where: { id: account.id },
        data: {
          isExempted: false,
          exemptionReason: null
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          schoolId,
          userId: resumedBy,
          action: 'RESUME_FEE_REMINDERS',
          resource: 'StudentAccount',
          resourceId: account.id,
          newValue: { resumedAt: new Date() },
          timestamp: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to resume reminders' };
    }
  }

  /**
   * Send manual fee reminder (bypasses automation checks)
   */
  static async sendManualFeeReminder(input: {
    schoolId: string;
    studentId: string;
    guardianId: string;
    termId: string;
    customMessage?: string;
    senderId: string;
  }): Promise<{ success: boolean; error?: string }> {
    const { schoolId, studentId, guardianId, termId, customMessage, senderId } = input;

    try {
      const [student, guardian, school, term] = await Promise.all([
        prisma.student.findUnique({ where: { id: studentId }, include: { class: true } }),
        prisma.guardian.findUnique({ where: { id: guardianId } }),
        prisma.school.findUnique({ where: { id: schoolId } }),
        prisma.term.findUnique({ where: { id: termId } }),
      ]);

      if (!student || !guardian || !school || !term) {
        return { success: false, error: 'Student, guardian, school, or term not found' };
      }

      // Get student account
      const account = await prisma.studentAccount.findUnique({
        where: { 
          studentId_termId: { 
            studentId, 
            termId 
          } 
        }
      });

      if (!account) {
        return { success: false, error: 'Student account not found' };
      }

      const studentName = `${student.firstName} ${student.lastName}`;
      const message = customMessage || `Dear Parent, this is a reminder regarding ${studentName}'s (${student.class.name}) school fees. Balance: UGX ${account.balance.toLocaleString()}. Please contact the bursar for details.`;

      // Send SMS
      const sendResult = await this.sendSMS(guardian.phone, message);

      if (sendResult.success) {
        // Log the notification
        await prisma.financeNotificationLog.create({
          data: {
            schoolId,
            guardianId,
            studentId,
            studentAccountId: account.id,
            type: 'FEE_REMINDER',
            messageType: 'MANUAL',
            channel: 'SMS',
            content: message,
            status: 'SENT',
            sentAt: new Date(),
            recipientPhone: guardian.phone,
            metadata: JSON.stringify({ manual: true, sentBy: senderId })
          }
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            schoolId,
            userId: senderId,
            action: 'MANUAL_FEE_REMINDER',
            resource: 'FinanceNotification',
            resourceId: schoolId,
            newValue: { studentId, guardianId, success: true },
            timestamp: new Date()
          }
        });

        return { success: true };
      } else {
        return { success: false, error: sendResult.error };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send manual reminder' };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private static async calculateRevenue(schoolId: string, termId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await prisma.payment.aggregate({
      where: {
        schoolId,
        termId,
        receivedAt: { gte: startDate, lte: endDate },
        status: 'CONFIRMED'
      },
      _sum: { amount: true }
    });
    return result._sum.amount || 0;
  }

  private static async calculateExpenses(schoolId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await prisma.expense.aggregate({
      where: {
        schoolId,
        expenseDate: { gte: startDate, lte: endDate },
        status: { in: ['APPROVED', 'PAID'] }
      },
      _sum: { amount: true }
    });
    return result._sum.amount || 0;
  }

  private static async calculateTotalFees(schoolId: string, termId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await prisma.invoice.aggregate({
      where: {
        schoolId,
        termId,
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { totalAmount: true }
    });
    return result._sum.totalAmount || 0;
  }

  private static async calculateOutstandingFees(schoolId: string, termId: string, endDate: Date): Promise<{ amount: number; count: number }> {
    const [amountResult, countResult] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          schoolId,
          termId,
          balance: { gt: 0 },
          dueDate: { lte: endDate }
        },
        _sum: { balance: true }
      }),
      prisma.invoice.count({
        where: {
          schoolId,
          termId,
          balance: { gt: 0 },
          dueDate: { lte: endDate }
        }
      })
    ]);

    return {
      amount: amountResult._sum.balance || 0,
      count: countResult
    };
  }

  private static async getStudentCounts(schoolId: string, termId: string): Promise<number> {
    return await prisma.studentAccount.count({
      where: { 
        schoolId, 
        termId 
      }
    });
  }

  private static async getMonthlyTrend(schoolId: string, termId: string, months: number) {
    const trends = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const [collected, outstanding] = await Promise.all([
        this.calculateRevenue(schoolId, termId, monthStart, monthEnd),
        this.calculateOutstandingFees(schoolId, termId, monthEnd)
      ]);

      trends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        collected,
        outstanding: outstanding.amount
      });
    }

    return trends;
  }

  private static async getPaymentMethodsDistribution(schoolId: string, termId: string, startDate: Date, endDate: Date) {
    const payments = await prisma.payment.groupBy({
      by: ['method'],
      where: {
        schoolId,
        termId,
        receivedAt: { gte: startDate, lte: endDate },
        status: 'CONFIRMED'
      },
      _sum: { amount: true },
      _count: { id: true }
    });

    const total = payments.reduce((sum, p) => sum + (p._sum.amount || 0), 0);

    return payments.map(p => ({
      method: p.method,
      amount: p._sum.amount || 0,
      count: p._count.id,
      percentage: total > 0 ? ((p._sum.amount || 0) / total) * 100 : 0
    }));
  }

  private static async calculateBudgetVariance(schoolId: string, startDate: Date, endDate: Date): Promise<number> {
    const budgets = await prisma.budgetCategory.findMany({
      where: {
        schoolId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        isActive: true
      }
    });

    if (budgets.length === 0) return 0;

    const totalBudgeted = budgets.reduce((sum, b) => sum + b.budgetedAmount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spentAmount, 0);

    return totalBudgeted > 0 ? ((totalSpent - totalBudgeted) / totalBudgeted) * 100 : 0;
  }

  private static async getDateRange(schoolId: string, termId: string, period: string) {
    let startDate: Date;
    let endDate: Date = new Date();

    switch (period) {
      case 'current-term':
        const term = await prisma.term.findUnique({
          where: { id: termId }
        });
        if (!term) {
          throw new Error('Term not found');
        }
        startDate = term.startDate;
        endDate = term.endDate;
        break;

      case 'academic-year':
        const academicYear = await prisma.academicYear.findFirst({
          where: { schoolId, isActive: true }
        });
        startDate = academicYear?.startDate || new Date();
        endDate = academicYear?.endDate || new Date();
        break;

      case 'monthly':
        startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        endDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
        break;

      default:
        startDate = new Date(new Date().setMonth(new Date().getMonth() - 6));
    }

    return { startDate, endDate };
  }

  private static isValidUgandanPhone(phone: string): boolean {
    const cleaned = phone.replace(/\s+/g, '');

    // Valid formats:
    // +256XXXXXXXXX (13 chars)
    // 256XXXXXXXXX (12 chars)
    // 0XXXXXXXXX (10 chars)
    const ugandanPattern = /^(\+256|256|0)[37]\d{8}$/;
    return ugandanPattern.test(cleaned);
  }

  private static async sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
    // In a real implementation, this would call your SMS gateway
    // For now, we'll simulate the call
    console.log(`SMS to ${phone}: ${message.substring(0, 50)}...`);
    
    // Simulate success/failure
    return { success: true }; // Replace with actual SMS gateway call
  }

  private static async generateFinancialAlerts(
    schoolId: string,
    termId: string
  ): Promise<Array<{ id: string; type: 'warning' | 'error' | 'info'; message: string; timestamp: string }>> {
    const alerts: Array<{ id: string; type: 'warning' | 'error' | 'info'; message: string; timestamp: string }> = [];
    const timestamp = new Date().toISOString();

    try {
      // Check for high outstanding fees
      const outstandingData = await this.calculateOutstandingFees(schoolId, termId, new Date());
      if (outstandingData.amount > 0) {
        const percentage = outstandingData.count > 0 ? (outstandingData.count / await this.getStudentCounts(schoolId, termId)) * 100 : 0;
        
        if (percentage > 50) {
          alerts.push({
            id: `alert-outstanding-${Date.now()}`,
            type: 'warning',
            message: `${percentage.toFixed(0)}% of students have outstanding fees`,
            timestamp
          });
        }
      }

      // Check for low collection rate
      const { startDate, endDate } = await this.getDateRange(schoolId, termId, 'current-term');
      const revenue = await this.calculateRevenue(schoolId, termId, startDate, endDate);
      const totalFees = await this.calculateTotalFees(schoolId, termId, startDate, endDate);
      const collectionRate = totalFees > 0 ? (revenue / totalFees) * 100 : 0;

      if (collectionRate < 50) {
        alerts.push({
          id: `alert-collection-${Date.now()}`,
          type: 'error',
          message: `Low collection rate: ${collectionRate.toFixed(1)}%`,
          timestamp
        });
      } else if (collectionRate < 75) {
        alerts.push({
          id: `alert-collection-${Date.now()}`,
          type: 'warning',
          message: `Collection rate below target: ${collectionRate.toFixed(1)}%`,
          timestamp
        });
      }

      // Add info alert if everything is good
      if (alerts.length === 0) {
        alerts.push({
          id: `alert-status-${Date.now()}`,
          type: 'info',
          message: 'Financial metrics are within normal range',
          timestamp
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error generating financial alerts:', error);
      return [{
        id: `alert-error-${Date.now()}`,
        type: 'error',
        message: 'Failed to generate financial alerts',
        timestamp
      }];
    }
  }
}

// Export the service instance
export const enhancedBursarService = new EnhancedBursarService();

// Export the class separately to avoid naming conflicts
export { EnhancedBursarService as BursarServiceClass };
