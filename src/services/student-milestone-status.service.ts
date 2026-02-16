/**
 * Student Milestone Status Service
 * Implements the milestone tracking system for fee automation
 * PART 2.4: PREPARE MILESTONE TRACKING (ANTI-SPAM)
 */

import { prisma } from '@/lib/db';
import { AcademicCalendarService } from './academic-calendar.service';
import { StudentAccountService } from './student-account.service';
  
// Types for StudentMilestoneStatus
interface StudentMilestoneStatus {
  id: string;
  studentId: string;
  termId: string;
  milestonePercentage: number;
  requiredByWeek: number;
  clearedAt: Date | null;
  reminderCount: number;
  lastReminderAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateMilestoneStatusInput {
  studentId: string;
  termId: string;
  milestonePercentage: number;
  requiredByWeek: number;
}

interface UpdateMilestoneStatusInput {
  clearedAt?: Date | null;
  reminderCount?: number;
  lastReminderAt?: Date | null;
}

export class StudentMilestoneStatusService {
  /**
   * Create a new milestone status record
   */
  static async create(input: CreateMilestoneStatusInput): Promise<StudentMilestoneStatus> {
    return await prisma.studentMilestoneStatus.create({
      data: {
        studentId: input.studentId,
        termId: input.termId,
        milestonePercentage: input.milestonePercentage,
        requiredByWeek: input.requiredByWeek,
        status: 'PENDING',
      },
    });
  }

  /**
   * Get milestone status for a student and term
   */
  static async getByStudentAndTerm(studentId: string, termId: string): Promise<StudentMilestoneStatus[]> {
    return await prisma.studentMilestoneStatus.findMany({
      where: {
        studentId,
        termId,
      },
      orderBy: {
        milestonePercentage: 'asc',
      },
    });
  }

  /**
   * Get milestone status by specific percentage
   */
  static async getByMilestone(studentId: string, termId: string, milestonePercentage: number): Promise<StudentMilestoneStatus | null> {
    return await prisma.studentMilestoneStatus.findUnique({
      where: {
        studentId_termId_milestonePercentage: {
          studentId,
          termId,
          milestonePercentage,
        },
      },
    });
  }

  /**
   * Update milestone status
   */
  static async update(
    studentId: string,
    termId: string,
    milestonePercentage: number,
    input: UpdateMilestoneStatusInput
  ): Promise<StudentMilestoneStatus> {
    return await prisma.studentMilestoneStatus.update({
      where: {
        studentId_termId_milestonePercentage: {
          studentId,
          termId,
          milestonePercentage,
        },
      },
      data: input,
    });
  }

  /**
   * Update milestone status when payment comes in
   */
  static async updateOnPayment(studentId: string, termId: string): Promise<void> {
    // Get the student account to calculate paid percentage
    const account = await StudentAccountService.getOrCreateStudentAccount(studentId, termId);
    
    if (account.totalFees > 0) {
      const paidPercentage = (account.totalPaid / account.totalFees) * 100;
      
      // Get all milestones for this term that haven't been cleared
      const pendingMilestones = await prisma.studentMilestoneStatus.findMany({
        where: {
          studentId,
          termId,
          milestonePercentage: { lte: paidPercentage },
          clearedAt: null,
        },
      });

      // Update each pending milestone as cleared
      for (const milestone of pendingMilestones) {
        await prisma.studentMilestoneStatus.update({
          where: {
            id: milestone.id,
          },
          data: {
            clearedAt: new Date(),
            status: 'CLEARED',
          },
        });
      }
    }
  }

  /**
   * Get students who have not reached required milestone for current week
   */
  static async getStudentsBehindMilestone(termId: string): Promise<Array<{
    studentId: string;
    studentName: string;
    className: string;
    totalFees: number;
    totalPaid: number;
    paidPercentage: number;
    requiredPercentage: number;
    balance: number;
    lastMilestoneReached: number | null;
  }>> {
    const currentWeek = await AcademicCalendarService.getCurrentWeek(termId);
    
    // Get all students with accounts for this term
    const accounts = await prisma.studentAccount.findMany({
      where: {
        termId,
        balance: { gt: 0 }, // Only students with outstanding balance
      },
      include: {
        student: {
          include: {
            class: true,
          },
        },
      },
    });

    const result = [];
    
    for (const account of accounts) {
      if (account.totalFees <= 0) continue;
      
      const paidPercentage = (account.totalPaid / account.totalFees) * 100;
      
      // Get the milestone that should be reached by current week
      const requiredMilestone = await prisma.feeStructure.findFirst({
        where: {
          termId,
          classId: account.student.classId,
        },
        select: {
          milestones: true,
        },
      });

      if (!requiredMilestone || !requiredMilestone.milestones) continue;
      
      // Parse milestones from JSON
      const milestones = requiredMilestone.milestones as Array<{week: number, percentage: number}>;
      const currentWeekMilestone = milestones
        .filter(m => m.week <= currentWeek)
        .reduce((max, m) => (m.percentage > max.percentage ? m : max), {week: 0, percentage: 0});
      
      if (currentWeekMilestone.percentage > 0 && paidPercentage < currentWeekMilestone.percentage) {
        // Find the highest milestone the student has cleared
        const clearedMilestones = await prisma.studentMilestoneStatus.findMany({
          where: {
            studentId: account.studentId,
            termId,
            clearedAt: { not: null },
          },
          orderBy: {
            milestonePercentage: 'desc',
          },
          take: 1,
        });
        
        result.push({
          studentId: account.studentId,
          studentName: `${account.student.firstName} ${account.student.lastName}`,
          className: account.student.class.name,
          totalFees: account.totalFees,
          totalPaid: account.totalPaid,
          paidPercentage: parseFloat(paidPercentage.toFixed(2)),
          requiredPercentage: currentWeekMilestone.percentage,
          balance: account.balance,
          lastMilestoneReached: clearedMilestones.length > 0 ? clearedMilestones[0].milestonePercentage : null,
        });
      }
    }
    
    return result;
  }

  /**
   * Initialize milestone statuses for a student when account is created
   */
  static async initializeMilestones(studentId: string, termId: string): Promise<void> {
    // Get the fee structure for the student's class to determine milestones
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        classId: student.classId,
        termId,
        isActive: true,
      },
      select: {
        milestones: true,
      },
    });

    if (!feeStructure || !feeStructure.milestones) {
      // If no milestones defined, create a default one for 100% at end of term
      const term = await prisma.term.findUnique({
        where: { id: termId },
      });
      
      if (term) {
        await prisma.studentMilestoneStatus.create({
          data: {
            studentId,
            termId,
            milestonePercentage: 100,
            requiredByWeek: term.weekCount || 12,
            status: 'PENDING',
          },
        });
      }
      return;
    }

    // Parse milestones from JSON
    const milestones = feeStructure.milestones as Array<{week: number, percentage: number}>;
    
    // Create milestone status records for each milestone
    for (const milestone of milestones) {
      await prisma.studentMilestoneStatus.upsert({
        where: {
          studentId_termId_milestonePercentage: {
            studentId,
            termId,
            milestonePercentage: milestone.percentage,
          },
        },
        update: {
          requiredByWeek: milestone.week,
          status: 'PENDING',
        },
        create: {
          studentId,
          termId,
          milestonePercentage: milestone.percentage,
          requiredByWeek: milestone.week,
          status: 'PENDING',
        },
      });
    }
  }
}

export default StudentMilestoneStatusService;