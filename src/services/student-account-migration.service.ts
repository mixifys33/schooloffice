/**
 * Student Account Migration Service
 * Handles migration of existing student accounts to term-scoped model
 * PART 1.3: DATA MIGRATION STRATEGY (NO DATA LOSS)
 */

import { prisma } from '@/lib/db';
import { StudentAccountService } from './student-account.service';
import { StudentMilestoneStatusService } from './student-milestone-status.service';
   
interface MigrationResult {
  migratedAccounts: number;
  errors: Array<{ studentId: string; error: string }>;
  totalProcessed: number;
}

export class StudentAccountMigrationService {
  /**
   * Migrate existing student accounts to term-scoped model
   * Assigns existing accounts to currently active term
   */
  static async migrateToTermScoped(): Promise<MigrationResult> {
    const result: MigrationResult = {
      migratedAccounts: 0,
      errors: [],
      totalProcessed: 0,
    };

    try {
      // Find the currently active term for each school
      const activeTerms = await prisma.term.findMany({
        where: {
          academicYear: {
            isActive: true,
          },
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        include: {
          academicYear: true,
        },
      });

      if (activeTerms.length === 0) {
        throw new Error('No active terms found for migration');
      }

      // Get all existing student accounts that don't have termId
      // Note: In the current schema, accounts already have termId, but this handles any legacy data
      const allStudents = await prisma.student.findMany({
        include: {
          account: true,
        },
      });

      for (const student of allStudents) {
        result.totalProcessed++;

        try {
          // Find the active term for this student's school
          const activeTerm = activeTerms.find(term => term.academicYear.schoolId === student.schoolId);

          if (!activeTerm) {
            result.errors.push({
              studentId: student.id,
              error: `No active term found for school ${student.schoolId}`,
            });
            continue;
          }

          // Check if student already has an account for this term
          const existingAccount = await prisma.studentAccount.findUnique({
            where: {
              studentId_termId: {
                studentId: student.id,
                termId: activeTerm.id,
              },
            },
          });

          if (existingAccount) {
            // Account already exists for this term, update milestone statuses if needed
            await StudentMilestoneStatusService.initializeMilestones(student.id, activeTerm.id);
            result.migratedAccounts++;
            continue;
          }

          // If student has an existing account without termId (legacy), we need to handle differently
          // In the current schema, accounts already have termId, so we'll just ensure milestone statuses are initialized
          if (student.account.length > 0) {
            // Initialize milestone statuses for existing account
            await StudentMilestoneStatusService.initializeMilestones(student.id, activeTerm.id);
          } else {
            // Create a new account for the student if none exists
            await StudentAccountService.getOrCreateStudentAccount(student.id, activeTerm.id);
          }

          result.migratedAccounts++;
        } catch (error) {
          result.errors.push({
            studentId: student.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return result;
    } catch (error) {
      throw new Error(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create new student accounts when a new term starts
   */
  static async createAccountsForNewTerm(termId: string): Promise<{ created: number; errors: number }> {
    try {
      const term = await prisma.term.findUnique({
        where: { id: termId },
        include: {
          academicYear: {
            include: {
              school: true,
            },
          },
        },
      });

      if (!term) {
        throw new Error(`Term ${termId} not found`);
      }

      // Get all active students in the school
      const students = await prisma.student.findMany({
        where: {
          schoolId: term.academicYear.schoolId,
          status: 'ACTIVE',
        },
      });

      let created = 0;
      let errors = 0;

      for (const student of students) {
        try {
          // Create or get student account for the new term
          await StudentAccountService.getOrCreateStudentAccount(student.id, termId);
          
          // Initialize milestone statuses
          await StudentMilestoneStatusService.initializeMilestones(student.id, termId);
          
          created++;
        } catch (error) {
          console.error(`Error creating account for student ${student.id}:`, error);
          errors++;
        }
      }

      return { created, errors };
    } catch (error) {
      throw new Error(`Failed to create accounts for term ${termId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate that all students have accounts for the active term
   */
  static async validateTermAccounts(termId: string): Promise<{
    missingAccounts: Array<{ studentId: string; studentName: string }>;
    totalStudents: number;
    accountsMissing: number;
  }> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: {
        academicYear: {
          include: {
            school: true,
          },
        },
      },
    });

    if (!term) {
      throw new Error(`Term ${termId} not found`);
    }

    // Get all active students in the school
    const students = await prisma.student.findMany({
      where: {
        schoolId: term.academicYear.schoolId,
        status: 'ACTIVE',
      },
      include: {
        class: true,
      },
    });

    const missingAccounts = [];

    for (const student of students) {
      const account = await prisma.studentAccount.findUnique({
        where: {
          studentId_termId: {
            studentId: student.id,
            termId: termId,
          },
        },
      });

      if (!account) {
        missingAccounts.push({
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
        });
      }
    }

    return {
      missingAccounts,
      totalStudents: students.length,
      accountsMissing: missingAccounts.length,
    };
  }

  /**
   * Run validation and auto-create missing accounts
   */
  static async validateAndCreateMissingAccounts(termId: string): Promise<{
    created: number;
    errors: number;
    totalMissing: number;
  }> {
    const validation = await this.validateTermAccounts(termId);
    
    let created = 0;
    let errors = 0;

    for (const missing of validation.missingAccounts) {
      try {
        await StudentAccountService.getOrCreateStudentAccount(missing.studentId, termId);
        await StudentMilestoneStatusService.initializeMilestones(missing.studentId, termId);
        created++;
      } catch (error) {
        console.error(`Error creating account for student ${missing.studentId}:`, error);
        errors++;
      }
    }

    return {
      created,
      errors,
      totalMissing: validation.accountsMissing,
    };
  }
}

export default StudentAccountMigrationService;