/**
 * Bursar Dashboard Service
 * Implements the complete bursar section with term-aware functionality
 * PART 1.5: BURSAR DASHBOARD IMPLICATION
 */
     
import { prisma } from '@/lib/db';
import { FeeStatusCalculatorService } from './fee-status-calculator.service';
import { EnhancedFeeStructureService } from './enhanced-fee-structure.service';
import { StudentAccountService } from './student-account.service';
import { StudentMilestoneStatusService } from './student-milestone-status.service';

// Types
interface MoneySnapshot {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  totalStudents: number;
}

interface PaymentStatusBreakdown {
  paidNothing: number;
  partiallyPaid: number;
  fullyPaid: number;
}

interface RiskAlert {
  studentId: string;
  studentName: string;
  className: string;
  balance: number;
  daysOverdue: number;
  lastPaymentDate?: string;
}

interface ClassFeesView {
  classId: string;
  className: string;
  termId: string;
  termName: string;
  students: Array<{
    studentId: string;
    studentName: string;
    admissionNumber: string;
    totalFees: number;
    paidSoFar: number;
    balance: number;
    lastPaymentDate?: string;
    status: 'NOT_PAID' | 'PARTIALLY_PAID' | 'FULLY_PAID';
  }>;
}

interface StudentFeesProfile {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  status: string;
  totalFees: number;
  breakdown: Array<{
    name: string;
    amount: number;
    category: string;
  }>;
  paymentHistory: Array<{
    date: string;
    amount: number;
    method: string;
    reference: string;
    recordedBy: string;
  }>;
  balance: number;
}

interface BursarDashboardData {
  termId: string;
  termName: string;
  moneySnapshot: MoneySnapshot;
  paymentStatusBreakdown: PaymentStatusBreakdown;
  riskAlerts: RiskAlert[];
  classFeesView: ClassFeesView[];
}

export class BursarDashboardService {
  /**
   * Get the main bursar dashboard data
   */
  static async getDashboardData(schoolId: string, termId: string): Promise<BursarDashboardData> {
    // Get term information
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    });

    if (!term) {
      throw new Error(`Term ${termId} not found`);
    }

    // Get money snapshot
    const moneySnapshot = await this.getMoneySnapshot(schoolId, termId);

    // Get payment status breakdown
    const paymentStatusBreakdown = await this.getPaymentStatusBreakdown(schoolId, termId);

    // Get risk alerts
    const riskAlerts = await this.getRiskAlerts(schoolId, termId);

    // Get class fees view
    const classFeesView = await this.getClassFeesView(schoolId, termId);

    return {
      termId,
      termName: `${term.name} - ${term.academicYear.name}`,
      moneySnapshot,
      paymentStatusBreakdown,
      riskAlerts,
      classFeesView,
    };
  }

  /**
   * Get money snapshot for the term
   */
  private static async getMoneySnapshot(schoolId: string, termId: string): Promise<MoneySnapshot> {
    const accounts = await prisma.studentAccount.findMany({
      where: { schoolId, termId },
    });

    const totalExpected = accounts.reduce((sum, acc) => sum + acc.totalFees, 0);
    const totalCollected = accounts.reduce((sum, acc) => sum + acc.totalPaid, 0);
    const totalOutstanding = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
    const totalStudents = accounts.length;

    return {
      totalExpected,
      totalCollected,
      totalOutstanding,
      collectionRate: parseFloat(collectionRate.toFixed(2)),
      totalStudents,
    };
  }

  /**
   * Get payment status breakdown
   */
  private static async getPaymentStatusBreakdown(schoolId: string, termId: string): Promise<PaymentStatusBreakdown> {
    const accounts = await prisma.studentAccount.findMany({
      where: { schoolId, termId },
    });

    let paidNothing = 0;
    let partiallyPaid = 0;
    let fullyPaid = 0;

    for (const account of accounts) {
      if (account.totalPaid === 0) {
        paidNothing++;
      } else if (account.totalPaid < account.totalFees) {
        partiallyPaid++;
      } else {
        fullyPaid++;
      }
    }

    return {
      paidNothing,
      partiallyPaid,
      fullyPaid,
    };
  }

  /**
   * Get risk alerts
   */
  private static async getRiskAlerts(schoolId: string, termId: string): Promise<RiskAlert[]> {
    const accounts = await prisma.studentAccount.findMany({
      where: {
        schoolId,
        termId,
        balance: { gt: 50000 }, // Students owing more than 50,000 UGX
      },
      include: {
        student: {
          include: { class: true },
        },
      },
    });

    const riskAlerts: RiskAlert[] = [];

    for (const account of accounts) {
      // Calculate days since last payment
      let daysOverdue = 0;
      if (account.lastPaymentDate) {
        const today = new Date();
        const lastPayment = new Date(account.lastPaymentDate);
        const timeDiff = today.getTime() - lastPayment.getTime();
        daysOverdue = Math.floor(timeDiff / (1000 * 3600 * 24));
      }

      riskAlerts.push({
        studentId: account.studentId,
        studentName: `${account.student.firstName} ${account.student.lastName}`,
        className: account.student.class.name,
        balance: account.balance,
        daysOverdue,
        lastPaymentDate: account.lastPaymentDate?.toISOString(),
      });
    }

    // Sort by balance (highest first)
    riskAlerts.sort((a, b) => b.balance - a.balance);

    return riskAlerts;
  }

  /**
   * Get class fees view
   */
  private static async getClassFeesView(schoolId: string, termId: string): Promise<ClassFeesView[]> {
    // Get all classes in the school
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: {
        students: {
          include: {
            account: {
              where: { termId },
            },
          },
        },
      },
    });

    const term = await prisma.term.findUnique({
      where: { id: termId },
    });

    if (!term) {
      throw new Error(`Term ${termId} not found`);
    }

    const classFeesViews: ClassFeesView[] = [];

    for (const classObj of classes) {
      const students = [];

      for (const student of classObj.students) {
        const account = student.account.length > 0 ? student.account[0] : null;

        if (account) {
          // Get payment history for this student and term
          const payments = await prisma.payment.findMany({
            where: {
              studentId: student.id,
              termId,
              status: 'CONFIRMED',
            },
            orderBy: { receivedAt: 'desc' },
            take: 5, // Last 5 payments
            include: {
              receivedByStaff: true,
            },
          });

          let status: 'NOT_PAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' = 'NOT_PAID';
          if (account.totalPaid > 0 && account.totalPaid < account.totalFees) {
            status = 'PARTIALLY_PAID';
          } else if (account.totalPaid >= account.totalFees) {
            status = 'FULLY_PAID';
          }

          students.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            admissionNumber: student.admissionNumber,
            totalFees: account.totalFees,
            paidSoFar: account.totalPaid,
            balance: account.balance,
            lastPaymentDate: account.lastPaymentDate?.toISOString(),
            status,
          });
        }
      }

      classFeesViews.push({
        classId: classObj.id,
        className: classObj.name,
        termId,
        termName: term.name,
        students,
      });
    }

    return classFeesViews;
  }

  /**
   * Get student fees profile
   */
  static async getStudentFeesProfile(studentId: string, termId: string): Promise<StudentFeesProfile> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        account: {
          where: { termId },
        },
      },
    });

    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    const account = student.account.length > 0 ? student.account[0] : null;

    if (!account) {
      throw new Error(`No account found for student ${studentId} in term ${termId}`);
    }

    // Get fee structure to get breakdown
    const feeStructure = await EnhancedFeeStructureService.getByClassTermType(
      student.classId,
      termId,
      student.studentType || 'DAY'
    );

    const breakdown = feeStructure?.items.map(item => ({
      name: item.name,
      amount: item.amount,
      category: item.category,
    })) || [];

    // Get payment history
    const payments = await prisma.payment.findMany({
      where: {
        studentId,
        termId,
        status: 'CONFIRMED',
      },
      orderBy: { receivedAt: 'desc' },
      include: {
        receivedByStaff: true,
      },
    });

    const paymentHistory = payments.map(payment => ({
      date: payment.receivedAt.toISOString(),
      amount: payment.amount,
      method: payment.method,
      reference: payment.reference,
      recordedBy: `${payment.receivedByStaff.firstName} ${payment.receivedByStaff.lastName}`,
    }));

    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      className: student.class.name,
      status: student.status,
      totalFees: account.totalFees,
      breakdown,
      paymentHistory,
      balance: account.balance,
    };
  }

  /**
   * Get defaulters list
   */
  static async getDefaulters(schoolId: string, termId: string): Promise<Array<{
    studentId: string;
    studentName: string;
    className: string;
    balance: number;
    totalFees: number;
    totalPaid: number;
    paidPercentage: number;
  }>> {
    const feeStatuses = await FeeStatusCalculatorService.getDefaulters(termId);
    
    // Filter by school
    const students = await prisma.student.findMany({
      where: { schoolId },
      select: { id: true },
    });
    
    const studentIds = students.map(s => s.id);
    const defaulters = feeStatuses.filter(status => studentIds.includes(status.studentId));
    
    return defaulters.map(status => ({
      studentId: status.studentId,
      studentName: status.studentName,
      className: status.className,
      balance: status.balance,
      totalFees: status.totalFees,
      totalPaid: status.totalPaid,
      paidPercentage: status.paidPercentage,
    }));
  }

  /**
   * Get class fees report
   */
  static async getClassFeesReport(classId: string, termId: string): Promise<{
    className: string;
    termName: string;
    expected: number;
    collected: number;
    outstanding: number;
    collectionRate: number;
    students: Array<{
      studentId: string;
      studentName: string;
      admissionNumber: string;
      totalFees: number;
      totalPaid: number;
      balance: number;
      status: string;
    }>;
  }> {
    const classObj = await prisma.class.findUnique({
      where: { id: classId },
    });

    const term = await prisma.term.findUnique({
      where: { id: termId },
    });

    if (!classObj || !term) {
      throw new Error(`Class ${classId} or Term ${termId} not found`);
    }

    const accounts = await prisma.studentAccount.findMany({
      where: {
        student: { classId },
        termId,
      },
      include: {
        student: true,
      },
    });

    const expected = accounts.reduce((sum, acc) => sum + acc.totalFees, 0);
    const collected = accounts.reduce((sum, acc) => sum + acc.totalPaid, 0);
    const outstanding = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    const collectionRate = expected > 0 ? (collected / expected) * 100 : 0;

    const students = accounts.map(acc => {
      let status = 'NOT_PAID';
      if (acc.totalPaid > 0 && acc.totalPaid < acc.totalFees) {
        status = 'PARTIALLY_PAID';
      } else if (acc.totalPaid >= acc.totalFees) {
        status = 'FULLY_PAID';
      }

      return {
        studentId: acc.studentId,
        studentName: `${acc.student.firstName} ${acc.student.lastName}`,
        admissionNumber: acc.student.admissionNumber,
        totalFees: acc.totalFees,
        totalPaid: acc.totalPaid,
        balance: acc.balance,
        status,
      };
    });

    return {
      className: classObj.name,
      termName: term.name,
      expected,
      collected,
      outstanding,
      collectionRate: parseFloat(collectionRate.toFixed(2)),
      students,
    };
  }

  /**
   * Get collection performance report
   */
  static async getCollectionPerformance(schoolId: string, termId: string): Promise<{
    daily: Array<{ date: string; amount: number; count: number }>;
    weekly: Array<{ week: string; amount: number; count: number }>;
    monthly: Array<{ month: string; amount: number; count: number }>;
  }> {
    const payments = await prisma.payment.findMany({
      where: {
        schoolId,
        termId,
        status: 'CONFIRMED',
      },
      orderBy: { receivedAt: 'asc' },
    });

    // Group by day
    const dailyMap = new Map<string, { amount: number; count: number }>();
    for (const payment of payments) {
      const dateStr = payment.receivedAt.toISOString().split('T')[0];
      const existing = dailyMap.get(dateStr) || { amount: 0, count: 0 };
      dailyMap.set(dateStr, {
        amount: existing.amount + payment.amount,
        count: existing.count + 1,
      });
    }

    const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      amount: data.amount,
      count: data.count,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by week
    const weeklyMap = new Map<string, { amount: number; count: number }>();
    for (const payment of payments) {
      const date = new Date(payment.receivedAt);
      const year = date.getFullYear();
      const week = Math.ceil(((date.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
      const weekStr = `${year}-W${week.toString().padStart(2, '0')}`;
      
      const existing = weeklyMap.get(weekStr) || { amount: 0, count: 0 };
      weeklyMap.set(weekStr, {
        amount: existing.amount + payment.amount,
        count: existing.count + 1,
      });
    }

    const weekly = Array.from(weeklyMap.entries()).map(([week, data]) => ({
      week,
      amount: data.amount,
      count: data.count,
    })).sort((a, b) => a.week.localeCompare(b.week));

    // Group by month
    const monthlyMap = new Map<string, { amount: number; count: number }>();
    for (const payment of payments) {
      const monthStr = payment.receivedAt.toISOString().slice(0, 7); // YYYY-MM
      const existing = monthlyMap.get(monthStr) || { amount: 0, count: 0 };
      monthlyMap.set(monthStr, {
        amount: existing.amount + payment.amount,
        count: existing.count + 1,
      });
    }

    const monthly = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      month,
      amount: data.amount,
      count: data.count,
    })).sort((a, b) => a.month.localeCompare(b.month));

    return { daily, weekly, monthly };
  }
}

export default BursarDashboardService;