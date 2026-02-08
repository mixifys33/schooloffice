import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// ============================================
// INTERFACES & TYPES
// ============================================

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

export interface FeeStructureData {
  name: string;
  description: string;
  amount: number;
  type: 'TUITION' | 'TRANSPORT' | 'MEALS' | 'UNIFORM' | 'BOOKS' | 'ACTIVITIES' | 'OTHER';
  frequency: 'TERMLY' | 'MONTHLY' | 'ANNUALLY' | 'ONE_TIME';
  mandatory: boolean;
  classes: string[];
  dueDate?: Date;
}

export interface PaymentData {
  studentId: string;
  amount: number;
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD';
  transactionReference?: string;
  paymentDate?: Date;
  notes?: string;
  guardianId?: string;
  termId?: string;
}

export interface BudgetCategoryData {
  name: string;
  description: string;
  budgetedAmount: number;
  department: string;
  period: 'MONTHLY' | 'TERMLY' | 'ANNUALLY';
  startDate: Date;
  endDate: Date;
}

export interface ExpenseData {
  budgetCategoryId: string;
  description: string;
  amount: number;
  expenseDate: Date;
  vendor?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD';
  notes?: string;
}

export interface DiscountData {
  name: string;
  description: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  maxAmount?: number;
  eligibilityCriteria: string;
  maxStudents?: number;
  validFrom: Date;
  validTo: Date;
}

export interface FinancialReportParams {
  reportType: 'INCOME_STATEMENT' | 'CASH_FLOW' | 'BALANCE_SHEET' | 'FEE_COLLECTION' | 'BUDGET_VARIANCE' | 'PAYMENT_ANALYSIS' | 'OUTSTANDING_FEES' | 'EXPENSE_SUMMARY';
  startDate: Date;
  endDate: Date;
  includeClasses?: string[];
  includePaymentMethods?: string[];
  groupBy?: 'class' | 'month' | 'payment_method' | 'fee_type';
}

// ============================================
// MAIN BURSAR SERVICE CLASS
// ============================================

export class BursarService {
  /**
   * Get comprehensive financial metrics for the bursar dashboard
   * This is the financial brain of the school - tracks everything with precision
   */
  static async getFinancialMetrics(
    schoolId: string, 
    period: 'current-term' | 'academic-year' | 'monthly' = 'current-term'
  ): Promise<BursarMetrics> {
    try {
      const { startDate, endDate } = await this.getDateRange(schoolId, period);

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
        this.calculateRevenue(schoolId, startDate, endDate),
        this.calculateExpenses(schoolId, startDate, endDate),
        this.calculateTotalFees(schoolId, startDate, endDate),
        this.calculateOutstandingFees(schoolId, endDate),
        this.getStudentCounts(schoolId),
        this.getMonthlyTrend(schoolId, 6), // Last 6 months
        this.getPaymentMethodsDistribution(schoolId, startDate, endDate),
        this.generateFinancialAlerts(schoolId)
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
  // FEE MANAGEMENT
  // ============================================

  /**
   * Create a new fee structure with automatic student assignment
   */
  static async createFeeStructure(
    schoolId: string, 
    userId: string, 
    data: FeeStructureData
  ) {
    try {
      return await db.$transaction(async (tx) => {
        // Get current term
        const currentTerm = await this.getCurrentTerm(schoolId);
        if (!currentTerm) {
          throw new Error('No active term found');
        }

        // Create fee structure
        const feeStructure = await tx.feeStructure.create({
          data: {
            schoolId,
            classId: '', // Will be updated with class associations
            termId: currentTerm.id,
            totalAmount: data.amount,
            dueDate: data.dueDate,
            isActive: true,
            createdBy: userId,
            items: {
              create: {
                name: data.name,
                category: data.type,
                amount: data.amount,
                isOptional: !data.mandatory,
                description: data.description
              }
            }
          }
        });

        // Get classes and create student fees
        const classes = await tx.class.findMany({
          where: {
            schoolId,
            name: { in: data.classes }
          },
          include: {
            students: {
              where: { status: 'ACTIVE' }
            }
          }
        });

        // Create student accounts and fees for each student
        for (const classItem of classes) {
          for (const student of classItem.students) {
            // Ensure student account exists
            await tx.studentAccount.upsert({
              where: { studentId: student.id },
              create: {
                studentId: student.id,
                schoolId,
                studentType: student.pilotType === 'PAID' ? 'DAY' : 'DAY', // Simplified
                totalFees: data.amount,
                balance: data.amount
              },
              update: {
                totalFees: { increment: data.amount },
                balance: { increment: data.amount }
              }
            });

            // Create invoice for the student
            const invoiceNumber = await this.generateInvoiceNumber(schoolId);
            await tx.invoice.create({
              data: {
                invoiceNumber,
                schoolId,
                studentId: student.id,
                feeStructureId: feeStructure.id,
                termId: currentTerm.id,
                subtotal: data.amount,
                totalAmount: data.amount,
                balance: data.amount,
                dueDate: data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                status: 'ISSUED',
                items: {
                  create: {
                    description: data.name,
                    category: data.type,
                    amount: data.amount,
                    isOptional: !data.mandatory
                  }
                }
              }
            });
          }
        }

        return feeStructure;
      });

    } catch (error) {
      console.error('Error creating fee structure:', error);
      throw new Error('Failed to create fee structure');
    }
  }

  /**
   * Record a payment with automatic reconciliation and receipt generation
   */
  static async recordPayment(
    schoolId: string, 
    userId: string, 
    data: PaymentData
  ) {
    try {
      return await db.$transaction(async (tx) => {
        // Get student and their outstanding invoices
        const student = await tx.student.findUnique({
          where: { id: data.studentId },
          include: {
            account: true,
            studentGuardians: {
              include: { guardian: true }
            }
          }
        });

        if (!student) {
          throw new Error('Student not found');
        }

        // Get outstanding invoices
        const outstandingInvoices = await tx.invoice.findMany({
          where: {
            studentId: data.studentId,
            balance: { gt: 0 },
            status: { in: ['ISSUED', 'PARTIALLY_PAID'] }
          },
          orderBy: { dueDate: 'asc' }
        });

        if (outstandingInvoices.length === 0) {
          throw new Error('No outstanding fees found for this student');
        }

        // Generate receipt number
        const receiptNumber = await this.generateReceiptNumber(schoolId);

        // Create payment record
        const payment = await tx.payment.create({
          data: {
            schoolId,
            studentId: data.studentId,
            guardianId: data.guardianId,
            termId: data.termId || outstandingInvoices[0].termId,
            amount: data.amount,
            method: data.paymentMethod,
            reference: data.transactionReference || receiptNumber,
            receivedBy: userId,
            receivedAt: data.paymentDate || new Date(),
            status: 'CONFIRMED',
            notes: data.notes
          }
        });

        // Create receipt
        const guardian = student.studentGuardians.find(sg => sg.isPrimary)?.guardian;
        const receipt = await tx.receipt.create({
          data: {
            receiptNumber,
            schoolId,
            studentId: data.studentId,
            guardianId: guardian?.id,
            studentName: `${student.firstName} ${student.lastName}`,
            guardianName: guardian ? `${guardian.firstName} ${guardian.lastName}` : null,
            className: '', // Will be filled from class relation
            termName: '', // Will be filled from term relation
            amount: data.amount,
            amountInWords: this.numberToWords(data.amount),
            method: data.paymentMethod,
            reference: data.transactionReference || receiptNumber,
            balanceBefore: student.account?.balance || 0,
            balanceAfter: (student.account?.balance || 0) - data.amount,
            issuedBy: userId,
            issuedByName: '', // Will be filled from user relation
            payments: {
              connect: { id: payment.id }
            }
          }
        });

        // Allocate payment to invoices (FIFO - First In, First Out)
        let remainingAmount = data.amount;
        
        for (const invoice of outstandingInvoices) {
          if (remainingAmount <= 0) break;

          const allocationAmount = Math.min(remainingAmount, invoice.balance);
          
          // Create payment allocation
          await tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              invoiceId: invoice.id,
              amount: allocationAmount
            }
          });

          // Update invoice
          const newBalance = invoice.balance - allocationAmount;
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              paidAmount: invoice.paidAmount + allocationAmount,
              balance: newBalance,
              status: newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID'
            }
          });

          remainingAmount -= allocationAmount;
        }

        // Update student account
        if (student.account) {
          await tx.studentAccount.update({
            where: { id: student.account.id },
            data: {
              totalPaid: { increment: data.amount },
              balance: { decrement: data.amount },
              lastPaymentDate: data.paymentDate || new Date(),
              lastPaymentAmount: data.amount
            }
          });
        }

        // Create finance audit log
        await tx.financeAuditLog.create({
          data: {
            schoolId,
            userId,
            action: 'PAYMENT_RECORDED',
            resourceType: 'Payment',
            resourceId: payment.id,
            newValue: {
              studentId: data.studentId,
              amount: data.amount,
              method: data.paymentMethod,
              reference: data.transactionReference
            },
            reason: data.notes
          }
        });

        return { payment, receipt };
      });

    } catch (error) {
      console.error('Error recording payment:', error);
      throw new Error('Failed to record payment');
    }
  }

  // ============================================
  // BUDGET MANAGEMENT
  // ============================================

  /**
   * Create budget category with spending tracking
   */
  static async createBudgetCategory(
    schoolId: string, 
    userId: string, 
    data: BudgetCategoryData
  ) {
    try {
      const budgetCategory = await db.budgetCategory.create({
        data: {
          schoolId,
          name: data.name,
          description: data.description,
          budgetedAmount: data.budgetedAmount,
          remainingAmount: data.budgetedAmount,
          department: data.department,
          period: data.period,
          startDate: data.startDate,
          endDate: data.endDate,
          createdBy: userId
        }
      });

      return budgetCategory;

    } catch (error) {
      console.error('Error creating budget category:', error);
      throw new Error('Failed to create budget category');
    }
  }

  /**
   * Record expense with budget tracking and approval workflow
   */
  static async recordExpense(
    schoolId: string, 
    userId: string, 
    data: ExpenseData
  ) {
    try {
      return await db.$transaction(async (tx) => {
        // Verify budget category exists
        const budgetCategory = await tx.budgetCategory.findUnique({
          where: { id: data.budgetCategoryId }
        });

        if (!budgetCategory) {
          throw new Error('Budget category not found');
        }

        // Create expense record
        const expense = await tx.expense.create({
          data: {
            schoolId,
            budgetCategoryId: data.budgetCategoryId,
            description: data.description,
            amount: data.amount,
            expenseDate: data.expenseDate,
            vendor: data.vendor,
            receiptNumber: data.receiptNumber,
            receiptUrl: data.receiptUrl,
            paymentMethod: data.paymentMethod,
            notes: data.notes,
            createdBy: userId,
            status: data.amount > 10000 ? 'PENDING' : 'APPROVED' // Auto-approve small expenses
          }
        });

        // Update budget category if approved
        if (expense.status === 'APPROVED') {
          const newSpentAmount = budgetCategory.spentAmount + data.amount;
          const newRemainingAmount = budgetCategory.budgetedAmount - newSpentAmount;
          const newPercentage = (newSpentAmount / budgetCategory.budgetedAmount) * 100;

          let newStatus = budgetCategory.status;
          if (newPercentage >= 100) {
            newStatus = 'OVER_BUDGET';
          } else if (newPercentage >= 90) {
            newStatus = 'AT_RISK';
          }

          await tx.budgetCategory.update({
            where: { id: data.budgetCategoryId },
            data: {
              spentAmount: newSpentAmount,
              remainingAmount: newRemainingAmount,
              percentage: newPercentage,
              status: newStatus
            }
          });

          // Create budget alerts if thresholds are crossed
          await this.checkBudgetThresholds(tx, schoolId, data.budgetCategoryId, newPercentage);
        }

        return expense;
      });

    } catch (error) {
      console.error('Error recording expense:', error);
      throw new Error('Failed to record expense');
    }
  }

  // ============================================
  // DISCOUNT & SCHOLARSHIP MANAGEMENT
  // ============================================

  /**
   * Create discount rule
   */
  static async createDiscountRule(
    schoolId: string, 
    userId: string, 
    data: DiscountData
  ) {
    try {
      const discountRule = await db.discountRule.create({
        data: {
          schoolId,
          name: data.name,
          description: data.description,
          type: data.type,
          value: data.value,
          maxAmount: data.maxAmount,
          createdBy: userId
        }
      });

      return discountRule;

    } catch (error) {
      console.error('Error creating discount rule:', error);
      throw new Error('Failed to create discount rule');
    }
  }

  /**
   * Apply discount to student
   */
  static async applyDiscount(
    schoolId: string,
    userId: string,
    studentId: string,
    discountRuleId: string,
    termId: string,
    reason?: string
  ) {
    try {
      return await db.$transaction(async (tx) => {
        // Get student account
        const studentAccount = await tx.studentAccount.findUnique({
          where: { studentId }
        });

        if (!studentAccount) {
          throw new Error('Student account not found');
        }

        // Get discount rule
        const discountRule = await tx.discountRule.findUnique({
          where: { id: discountRuleId }
        });

        if (!discountRule) {
          throw new Error('Discount rule not found');
        }

        // Calculate discount amount
        let discountAmount: number;
        if (discountRule.type === 'PERCENTAGE') {
          discountAmount = (studentAccount.totalFees * discountRule.value) / 100;
          if (discountRule.maxAmount && discountAmount > discountRule.maxAmount) {
            discountAmount = discountRule.maxAmount;
          }
        } else {
          discountAmount = discountRule.value;
        }

        // Create student discount
        const studentDiscount = await tx.studentDiscount.create({
          data: {
            studentAccountId: studentAccount.id,
            discountRuleId,
            termId,
            name: discountRule.name,
            type: discountRule.type,
            value: discountRule.value,
            calculatedAmount: discountAmount,
            reason,
            appliedBy: userId,
            status: discountRule.requiresApproval ? 'PENDING' : 'APPROVED'
          }
        });

        // Update student account if auto-approved
        if (studentDiscount.status === 'APPROVED') {
          await tx.studentAccount.update({
            where: { id: studentAccount.id },
            data: {
              totalDiscounts: { increment: discountAmount },
              balance: { decrement: discountAmount }
            }
          });
        }

        return studentDiscount;
      });

    } catch (error) {
      console.error('Error applying discount:', error);
      throw new Error('Failed to apply discount');
    }
  }

  // ============================================
  // FINANCIAL REPORTING
  // ============================================

  /**
   * Generate comprehensive financial reports
   */
  static async generateFinancialReport(
    schoolId: string,
    userId: string,
    params: FinancialReportParams
  ) {
    try {
      // Create report record
      const report = await db.financialReport.create({
        data: {
          schoolId,
          reportType: params.reportType,
          title: this.getReportTitle(params.reportType, params.startDate, params.endDate),
          parameters: params,
          generatedBy: userId,
          status: 'GENERATING'
        }
      });

      // Generate report data based on type
      let reportData: any;
      
      switch (params.reportType) {
        case 'INCOME_STATEMENT':
          reportData = await this.generateIncomeStatement(schoolId, params.startDate, params.endDate);
          break;
        case 'CASH_FLOW':
          reportData = await this.generateCashFlowReport(schoolId, params.startDate, params.endDate);
          break;
        case 'FEE_COLLECTION':
          reportData = await this.generateFeeCollectionReport(schoolId, params.startDate, params.endDate, params.includeClasses);
          break;
        case 'BUDGET_VARIANCE':
          reportData = await this.generateBudgetVarianceReport(schoolId, params.startDate, params.endDate);
          break;
        case 'OUTSTANDING_FEES':
          reportData = await this.generateOutstandingFeesReport(schoolId, params.endDate, params.includeClasses);
          break;
        default:
          throw new Error('Unsupported report type');
      }

      // Update report with generated data
      await db.financialReport.update({
        where: { id: report.id },
        data: {
          status: 'COMPLETED',
          generatedAt: new Date(),
          // In a real implementation, you'd save the report file and store the URL
          fileUrl: `/api/reports/${report.id}/download`
        }
      });

      return { report, data: reportData };

    } catch (error) {
      console.error('Error generating financial report:', error);
      
      // Update report status to failed
      if (report) {
        await db.financialReport.update({
          where: { id: report.id },
          data: { status: 'FAILED' }
        });
      }
      
      throw new Error('Failed to generate financial report');
    }
  }

  // ============================================
  // ALERTS & NOTIFICATIONS
  // ============================================

  /**
   * Generate comprehensive financial alerts
   */
  static async generateFinancialAlerts(schoolId: string) {
    try {
      const alerts = [];
      const now = new Date();

      // 1. Overdue fees alert
      const overdueCount = await db.invoice.count({
        where: {
          schoolId,
          balance: { gt: 0 },
          dueDate: { lt: now },
          status: { in: ['ISSUED', 'PARTIALLY_PAID'] }
        }
      });

      if (overdueCount > 0) {
        alerts.push({
          id: `overdue-${Date.now()}`,
          type: overdueCount > 50 ? 'error' : overdueCount > 20 ? 'warning' : 'info',
          message: `${overdueCount} students have overdue fee payments`,
          timestamp: now.toISOString()
        });
      }

      // 2. Low cash flow alert
      const weeklyRevenue = await db.payment.aggregate({
        where: {
          schoolId,
          receivedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          },
          status: 'CONFIRMED'
        },
        _sum: { amount: true }
      });

      const revenue = weeklyRevenue._sum.amount || 0;
      if (revenue < 100000) {
        alerts.push({
          id: `cashflow-${Date.now()}`,
          type: 'warning',
          message: `Weekly revenue below threshold: ${revenue.toLocaleString()} UGX`,
          timestamp: now.toISOString()
        });
      }

      // 3. Budget overrun alerts
      const budgetOverruns = await db.budgetCategory.count({
        where: {
          schoolId,
          status: 'OVER_BUDGET',
          isActive: true
        }
      });

      if (budgetOverruns > 0) {
        alerts.push({
          id: `budget-${Date.now()}`,
          type: 'error',
          message: `${budgetOverruns} budget categories exceeded their limits`,
          timestamp: now.toISOString()
        });
      }

      // 4. Reconciliation issues
      const reconciliationIssues = await db.payment.count({
        where: {
          schoolId,
          status: 'PENDING'
        }
      });

      if (reconciliationIssues > 0) {
        alerts.push({
          id: `reconciliation-${Date.now()}`,
          type: 'warning',
          message: `${reconciliationIssues} payments pending reconciliation`,
          timestamp: now.toISOString()
        });
      }

      return alerts;

    } catch (error) {
      console.error('Error generating financial alerts:', error);
      return [];
    }
  }

  /**
   * Send automated fee reminders via SMS
   */
  static async sendFeeReminders(schoolId: string, studentIds?: string[]) {
    try {
      // Get students with outstanding fees
      const where: any = {
        schoolId,
        balance: { gt: 0 },
        dueDate: { lt: new Date() },
        status: { in: ['ISSUED', 'PARTIALLY_PAID'] }
      };

      if (studentIds) {
        where.studentId = { in: studentIds };
      }

      const overdueInvoices = await db.invoice.findMany({
        where,
        include: {
          student: {
            include: {
              studentGuardians: {
                include: { guardian: true }
              }
            }
          }
        }
      });

      const remindersSent = [];

      for (const invoice of overdueInvoices) {
        const student = invoice.student;
        const guardians = student.studentGuardians.map(sg => sg.guardian);

        for (const guardian of guardians) {
          if (guardian.phone) {
            const message = `Dear ${guardian.firstName}, ${student.firstName} ${student.lastName} has outstanding fees of ${invoice.balance.toLocaleString()} UGX. Please make payment to avoid penalties. School: ${schoolId}`;

            // Create message record for SMS service
            await db.message.create({
              data: {
                schoolId,
                studentId: student.id,
                guardianId: guardian.id,
                templateType: 'FEE_REMINDER',
                channel: 'SMS',
                content: message,
                status: 'QUEUED'
              }
            });

            remindersSent.push({
              studentId: student.id,
              guardianId: guardian.id,
              phone: guardian.phone,
              amount: invoice.balance
            });
          }
        }
      }

      return remindersSent;

    } catch (error) {
      console.error('Error sending fee reminders:', error);
      throw new Error('Failed to send fee reminders');
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private static async calculateRevenue(schoolId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await db.payment.aggregate({
      where: {
        schoolId,
        receivedAt: { gte: startDate, lte: endDate },
        status: 'CONFIRMED'
      },
      _sum: { amount: true }
    });
    return result._sum.amount || 0;
  }

  private static async calculateExpenses(schoolId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await db.expense.aggregate({
      where: {
        schoolId,
        expenseDate: { gte: startDate, lte: endDate },
        status: { in: ['APPROVED', 'PAID'] }
      },
      _sum: { amount: true }
    });
    return result._sum.amount || 0;
  }

  private static async calculateTotalFees(schoolId: string, startDate: Date, endDate: Date): Promise<number> {
    const result = await db.invoice.aggregate({
      where: {
        schoolId,
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { totalAmount: true }
    });
    return result._sum.totalAmount || 0;
  }

  private static async calculateOutstandingFees(schoolId: string, endDate: Date): Promise<{ amount: number; count: number }> {
    const [amountResult, countResult] = await Promise.all([
      db.invoice.aggregate({
        where: {
          schoolId,
          balance: { gt: 0 },
          dueDate: { lte: endDate }
        },
        _sum: { balance: true }
      }),
      db.invoice.count({
        where: {
          schoolId,
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

  private static async getStudentCounts(schoolId: string): Promise<number> {
    return await db.student.count({
      where: { schoolId, status: 'ACTIVE' }
    });
  }

  private static async getMonthlyTrend(schoolId: string, months: number) {
    const trends = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const [collected, outstanding] = await Promise.all([
        this.calculateRevenue(schoolId, monthStart, monthEnd),
        this.calculateOutstandingFees(schoolId, monthEnd)
      ]);

      trends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        collected,
        outstanding: outstanding.amount
      });
    }

    return trends;
  }

  private static async getPaymentMethodsDistribution(schoolId: string, startDate: Date, endDate: Date) {
    const payments = await db.payment.groupBy({
      by: ['method'],
      where: {
        schoolId,
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
    const budgets = await db.budgetCategory.findMany({
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

  private static async getCurrentTerm(schoolId: string) {
    const academicYear = await db.academicYear.findFirst({
      where: { schoolId, isActive: true }
    });

    if (!academicYear) return null;

    return await db.term.findFirst({
      where: {
        academicYearId: academicYear.id,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });
  }

  private static async generateReceiptNumber(schoolId: string): Promise<string> {
    const settings = await db.financeSettings.findUnique({
      where: { schoolId }
    });

    const prefix = settings?.receiptPrefix || 'RCP';
    const year = new Date().getFullYear();
    const number = settings?.nextReceiptNumber || 1;

    // Update next receipt number
    await db.financeSettings.upsert({
      where: { schoolId },
      create: {
        schoolId,
        nextReceiptNumber: number + 1
      },
      update: {
        nextReceiptNumber: number + 1
      }
    });

    return `${prefix}-${year}-${number.toString().padStart(6, '0')}`;
  }

  private static async generateInvoiceNumber(schoolId: string): Promise<string> {
    const settings = await db.financeSettings.findUnique({
      where: { schoolId }
    });

    const prefix = settings?.invoicePrefix || 'INV';
    const year = new Date().getFullYear();
    const number = settings?.nextInvoiceNumber || 1;

    // Update next invoice number
    await db.financeSettings.upsert({
      where: { schoolId },
      create: {
        schoolId,
        nextInvoiceNumber: number + 1
      },
      update: {
        nextInvoiceNumber: number + 1
      }
    });

    return `${prefix}-${year}-${number.toString().padStart(6, '0')}`;
  }

  private static numberToWords(amount: number): string {
    // Simplified number to words conversion
    // In a real implementation, you'd use a proper library
    return `${amount.toLocaleString()} only`;
  }

  private static async checkBudgetThresholds(tx: any, schoolId: string, budgetCategoryId: string, percentage: number) {
    const thresholds = [
      { threshold: 75, type: 'WARNING_75' },
      { threshold: 90, type: 'CRITICAL_90' },
      { threshold: 100, type: 'EXCEEDED_100' }
    ];

    for (const { threshold, type } of thresholds) {
      if (percentage >= threshold) {
        // Check if alert already exists
        const existingAlert = await tx.budgetAlert.findFirst({
          where: {
            schoolId,
            budgetCategoryId,
            alertType: type,
            isActive: true
          }
        });

        if (!existingAlert) {
          await tx.budgetAlert.create({
            data: {
              schoolId,
              budgetCategoryId,
              alertType: type,
              threshold,
              currentSpending: percentage,
              budgetAmount: 0, // Will be filled from budget category
              message: `Budget ${type.toLowerCase().replace('_', ' ')} threshold reached: ${percentage.toFixed(1)}%`
            }
          });
        }
      }
    }
  }

  private static getReportTitle(reportType: string, startDate: Date, endDate: Date): string {
    const period = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    
    switch (reportType) {
      case 'INCOME_STATEMENT': return `Income Statement (${period})`;
      case 'CASH_FLOW': return `Cash Flow Report (${period})`;
      case 'FEE_COLLECTION': return `Fee Collection Report (${period})`;
      case 'BUDGET_VARIANCE': return `Budget Variance Report (${period})`;
      case 'OUTSTANDING_FEES': return `Outstanding Fees Report (${endDate.toLocaleDateString()})`;
      default: return `Financial Report (${period})`;
    }
  }

  private static async generateIncomeStatement(schoolId: string, startDate: Date, endDate: Date) {
    // Implementation for income statement generation
    // This would include revenue, expenses, and net income calculations
    return {
      revenue: await this.calculateRevenue(schoolId, startDate, endDate),
      expenses: await this.calculateExpenses(schoolId, startDate, endDate),
      // Add more detailed breakdown
    };
  }

  private static async generateCashFlowReport(schoolId: string, startDate: Date, endDate: Date) {
    // Implementation for cash flow report
    return {
      cashInflows: await this.calculateRevenue(schoolId, startDate, endDate),
      cashOutflows: await this.calculateExpenses(schoolId, startDate, endDate),
      // Add more detailed cash flow analysis
    };
  }

  private static async generateFeeCollectionReport(schoolId: string, startDate: Date, endDate: Date, includeClasses?: string[]) {
    // Implementation for fee collection report
    return {
      totalCollected: await this.calculateRevenue(schoolId, startDate, endDate),
      // Add breakdown by class, fee type, etc.
    };
  }

  private static async generateBudgetVarianceReport(schoolId: string, startDate: Date, endDate: Date) {
    // Implementation for budget variance report
    return {
      variance: await this.calculateBudgetVariance(schoolId, startDate, endDate),
      // Add detailed budget vs actual analysis
    };
  }

  private static async generateOutstandingFeesReport(schoolId: string, endDate: Date, includeClasses?: string[]) {
    // Implementation for outstanding fees report
    return await this.calculateOutstandingFees(schoolId, endDate);
  }

  private static async getDateRange(schoolId: string, period: string) {
    let startDate: Date;
    let endDate: Date = new Date();

    switch (period) {
      case 'current-term':
        const currentTerm = await this.getCurrentTerm(schoolId);
        startDate = currentTerm?.startDate || new Date();
        endDate = currentTerm?.endDate || new Date();
        break;

      case 'academic-year':
        const academicYear = await db.academicYear.findFirst({
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
}