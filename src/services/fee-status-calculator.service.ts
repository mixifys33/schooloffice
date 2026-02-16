/**
 * Fee Status Calculator Service
 * Implements the derived fee status layer
 * PART 2.2: INTRODUCE A DERIVED FEE STATUS LAYER
 */
     
import { prisma } from '@/lib/db';
import { AcademicCalendarService } from './academic-calendar.service';
import { EnhancedFeeStructureService } from './enhanced-fee-structure.service';

// Types
export type FeeStatus = 'OK' | 'WARNING' | 'CRITICAL';

interface FeeStatusCalculation {
  studentId: string;
  termId: string;
  paidPercentage: number;
  requiredPercentage: number;
  status: FeeStatus;
  currentWeek: number;
  milestoneReached: boolean;
  balance: number;
  totalFees: number;
  totalPaid: number;
}

interface StudentFeeStatus {
  studentId: string;
  studentName: string;
  className: string;
  termId: string;
  termName: string;
  paidPercentage: number;
  requiredPercentage: number;
  status: FeeStatus;
  balance: number;
  totalFees: number;
  totalPaid: number;
  currentWeek: number;
  milestoneReached: boolean;
}

export class FeeStatusCalculatorService {
  /**
   * Calculate fee status for a single student account
   */
  static async calculateForStudent(studentId: string, termId: string): Promise<FeeStatusCalculation> {
    // Get student account
    const account = await prisma.studentAccount.findUnique({
      where: {
        studentId_termId: {
          studentId,
          termId,
        },
      },
    });

    if (!account) {
      throw new Error(`Student account not found for student ${studentId} and term ${termId}`);
    }

    // Calculate paid percentage
    const paidPercentage = account.totalFees > 0 
      ? (account.totalPaid / account.totalFees) * 100 
      : 100;

    // Get current academic week
    const currentWeek = await AcademicCalendarService.getCurrentWeek(termId);

    // Get required percentage based on milestones
    const requiredPercentage = await this.calculateRequiredPercentage(studentId, termId, currentWeek);

    // Determine status based on comparison
    let status: FeeStatus = 'OK';
    if (paidPercentage < requiredPercentage) {
      // If behind on milestone, status depends on how far behind
      const shortfall = requiredPercentage - paidPercentage;
      if (shortfall > 20) {
        status = 'CRITICAL';
      } else {
        status = 'WARNING';
      }
    }

    return {
      studentId,
      termId,
      paidPercentage: parseFloat(paidPercentage.toFixed(2)),
      requiredPercentage: parseFloat(requiredPercentage.toFixed(2)),
      status,
      currentWeek,
      milestoneReached: paidPercentage >= requiredPercentage,
      balance: account.balance,
      totalFees: account.totalFees,
      totalPaid: account.totalPaid,
    };
  }

  /**
   * Calculate required percentage based on milestones for current week
   */
  private static async calculateRequiredPercentage(studentId: string, termId: string, currentWeek: number): Promise<number> {
    // Get student's class to find the appropriate fee structure
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    // Get fee structure for the class and term
    const feeStructure = await EnhancedFeeStructureService.getByClassTermType(
      student.classId,
      termId,
      student.studentType || 'DAY'
    );

    if (!feeStructure || !feeStructure.milestones) {
      // If no milestones, return 0% required (no milestone system in place)
      return 0;
    }

    // Find the highest milestone that should be reached by current week
    const applicableMilestones = feeStructure.milestones
      .filter(m => m.week <= currentWeek)
      .sort((a, b) => b.percentage - a.percentage);

    // Return the highest required percentage for current week
    return applicableMilestones.length > 0 ? applicableMilestones[0].percentage : 0;
  }

  /**
   * Get fee status for all students in a term
   */
  static async getStatusForTerm(termId: string): Promise<StudentFeeStatus[]> {
    // Get all student accounts for the term
    const accounts = await prisma.studentAccount.findMany({
      where: { termId },
      include: {
        student: {
          include: { class: true },
        },
      },
    });

    const results: StudentFeeStatus[] = [];

    for (const account of accounts) {
      try {
        const calculation = await this.calculateForStudent(account.studentId, termId);
        
        results.push({
          studentId: calculation.studentId,
          studentName: `${account.student.firstName} ${account.student.lastName}`,
          className: account.student.class.name,
          termId: calculation.termId,
          termName: (await prisma.term.findUnique({ where: { id: termId } }))?.name || '',
          paidPercentage: calculation.paidPercentage,
          requiredPercentage: calculation.requiredPercentage,
          status: calculation.status,
          balance: calculation.balance,
          totalFees: calculation.totalFees,
          totalPaid: calculation.totalPaid,
          currentWeek: calculation.currentWeek,
          milestoneReached: calculation.milestoneReached,
        });
      } catch (error) {
        console.error(`Error calculating fee status for student ${account.studentId}:`, error);
        // Skip students with errors
      }
    }

    return results;
  }

  /**
   * Get summary statistics for a term
   */
  static async getTermSummary(termId: string): Promise<{
    totalStudents: number;
    okCount: number;
    warningCount: number;
    criticalCount: number;
    averagePaidPercentage: number;
    totalFees: number;
    totalPaid: number;
    totalOutstanding: number;
  }> {
    const statuses = await this.getStatusForTerm(termId);

    const totalStudents = statuses.length;
    const okCount = statuses.filter(s => s.status === 'OK').length;
    const warningCount = statuses.filter(s => s.status === 'WARNING').length;
    const criticalCount = statuses.filter(s => s.status === 'CRITICAL').length;
    
    const totalPaidPercentage = statuses.reduce((sum, s) => sum + s.paidPercentage, 0);
    const averagePaidPercentage = totalStudents > 0 ? totalPaidPercentage / totalStudents : 0;
    
    const totalFees = statuses.reduce((sum, s) => sum + s.totalFees, 0);
    const totalPaid = statuses.reduce((sum, s) => sum + s.totalPaid, 0);
    const totalOutstanding = statuses.reduce((sum, s) => sum + s.balance, 0);

    return {
      totalStudents,
      okCount,
      warningCount,
      criticalCount,
      averagePaidPercentage: parseFloat(averagePaidPercentage.toFixed(2)),
      totalFees,
      totalPaid,
      totalOutstanding,
    };
  }

  /**
   * Get students by status category
   */
  static async getStudentsByStatus(termId: string, status: FeeStatus): Promise<StudentFeeStatus[]> {
    const allStatuses = await this.getStatusForTerm(termId);
    return allStatuses.filter(s => s.status === status);
  }

  /**
   * Get defaulters list (WARNING and CRITICAL status)
   */
  static async getDefaulters(termId: string): Promise<StudentFeeStatus[]> {
    const allStatuses = await this.getStatusForTerm(termId);
    return allStatuses.filter(s => s.status === 'WARNING' || s.status === 'CRITICAL');
  }
}

export default FeeStatusCalculatorService;