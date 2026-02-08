/**
 * Academic Calendar Service
 * Calculates academic weeks based on term start dates
 * PART 2.3: Academic Week Engine
 */

import { prisma } from '@/lib/db';

export class AcademicCalendarService {
  /**
   * Get current academic week for a term
   * Based on: Term start date, Current date, Locked term boundaries
   */
  static async getCurrentWeek(termId: string): Promise<number> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
    });

    if (!term) {
      throw new Error(`Term ${termId} not found`);
    }

    // Calculate days since term started
    const startDate = new Date(term.startDate);
    const currentDate = new Date();

    // Calculate difference in days
    const timeDiff = currentDate.getTime() - startDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

    // Calculate week number (starting from week 1)
    const weekNumber = Math.floor(daysDiff / 7) + 1;

    // Ensure we don't exceed the term's week count
    const maxWeek = term.weekCount || 12; // Default to 12 weeks if not specified

    return Math.min(weekNumber, maxWeek);
  }

  /**
   * Get milestone for current week based on term milestones
   */
  static async getCurrentMilestone(termId: string): Promise<{ week: number; percentage: number } | null> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: {
        feeStructures: {
          select: {
            milestones: true
          }
        }
      }
    });

    if (!term || !term.feeStructures || term.feeStructures.length === 0) {
      return null;
    }

    // Get the first fee structure's milestones (assuming consistent across class)
    const milestones = term.feeStructures[0].milestones as Array<{ week: number; percentage: number }>;
    if (!milestones) return null;

    const currentWeek = await this.getCurrentWeek(termId);

    // Find the highest milestone that applies to the current week
    const applicableMilestones = milestones.filter(m => m.week <= currentWeek);
    if (applicableMilestones.length === 0) return null;

    // Return the milestone with the highest week number that's<= current week
    return applicableMilestones.reduce((max, milestone) =>
      milestone.week > max.week ? milestone : max
    );
  }

  /**
   * Get milestone by week number
   */
  static async getMilestoneByWeek(termId: string, week: number): Promise<{ week: number; percentage: number } | null> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: {
        feeStructures: {
          select: {
            milestones: true
          }
        }
      }
    });

    if (!term || !term.feeStructures || term.feeStructures.length === 0) {
      return null;
    }

    const milestones = term.feeStructures[0].milestones as Array<{ week: number; percentage: number }>;
    if (!milestones) return null;

    return milestones.find(m => m.week === week) || null;
  }

  /**
   * Validate that milestones total 100%
   */
  static validateMilestones(milestones: Array<{ week: number; percentage: number }>): boolean {
    if (!milestones || milestones.length === 0) return false;

    const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
    return Math.abs(totalPercentage - 100) < 0.1; // Allow small floating point differences
  }

  /**
   * Get remaining weeks in term
   */
  static async getRemainingWeeks(termId: string): Promise<number> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
    });

    if (!term) {
      throw new Error(`Term ${termId} not found`);
    }

    const currentWeek = await this.getCurrentWeek(termId);
    const totalWeeks = term.weekCount || 12;

    return Math.max(0, totalWeeks - currentWeek);
  }

  /**
   * Get term progress percentage
   */
  static async getTermProgress(termId: string): Promise<number> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
    });

    if (!term) {
      throw new Error(`Term ${termId} not found`);
    }

    const currentWeek = await this.getCurrentWeek(termId);
    const totalWeeks = term.weekCount || 12;

    return Math.min(100, Math.round((currentWeek / totalWeeks) * 100));
  }

  /**
   * Get days remaining in term
   */
  static async getDaysRemaining(termId: string): Promise<number> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
    });

    if (!term) {
      throw new Error(`Term ${termId} not found`);
    }

    const currentDate = new Date();
    const endDate = new Date(term.endDate);
    
    const timeDiff = endDate.getTime() - currentDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

    return Math.max(0, daysDiff);
  }
}