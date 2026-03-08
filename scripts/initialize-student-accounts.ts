/**
 * Initialize Student Accounts Migration Script
 * 
 * This script creates missing student accounts for all active students.
 * Run this after upgrading to the term-scoped student account model.
 * 
 * Usage:
 *   npx tsx scripts/initialize-student-accounts.ts
 *   npx tsx scripts/initialize-student-accounts.ts --term-id=<termId>
 */

import { PrismaClient } from '@prisma/client';
import * as StudentAccountService from '../src/services/student-account.service';

const prisma = new PrismaClient();

interface MigrationResult {
  termId: string;
  termName: string;
  totalStudents: number;
  created: number;
  existing: number;
  errors: Array<{ studentId: string; studentName: string; error: string }>;
}

async function initializeStudentAccounts(termId?: string): Promise<MigrationResult> {
  let targetTermId = termId;
  let termName = '';

  // If no termId provided, find the current active term
  if (!targetTermId) {
    console.log('No term ID provided, finding active term...');
    
    const activeTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          isActive: true
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        academicYear: true
      }
    });

    if (!activeTerm) {
      console.log('No active term found, using most recent term...');
      
      const recentTerm = await prisma.term.findFirst({
        orderBy: {
          startDate: 'desc'
        },
        include: {
          academicYear: true
        }
      });

      if (!recentTerm) {
        throw new Error('No terms found in the database');
      }

      targetTermId = recentTerm.id;
      termName = recentTerm.name;
    } else {
      targetTermId = activeTerm.id;
      termName = activeTerm.name;
    }
  } else {
    const term = await prisma.term.findUnique({
      where: { id: targetTermId }
    });
    
    if (!term) {
      throw new Error(`Term with ID ${targetTermId} not found`);
    }
    
    termName = term.name;
  }

  console.log(`\nInitializing student accounts for term: ${termName} (${targetTermId})\n`);

  // Get all active students
  const students = await prisma.student.findMany({
    where: {
      status: 'ACTIVE'
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      admissionNumber: true,
      schoolId: true
    }
  });

  console.log(`Found ${students.length} active students\n`);

  let created = 0;
  let existing = 0;
  const errors: Array<{ studentId: string; studentName: string; error: string }> = [];

  // Process each student
  for (const student of students) {
    const studentName = `${student.firstName} ${student.lastName}`;
    
    try {
      // Check if account already exists
      const existingAccount = await prisma.studentAccount.findUnique({
        where: {
          studentId_termId: {
            studentId: student.id,
            termId: targetTermId
          }
        }
      });

      if (existingAccount) {
        console.log(`✓ Account exists for ${studentName} (${student.admissionNumber})`);
        existing++;
        
        // Recalculate balance to ensure accuracy
        // Using 'system' as userId for automated recalculation
        await StudentAccountService.recalculateStudentBalance(student.id, targetTermId, 'system');
      } else {
        // Create new account
        await StudentAccountService.getOrCreateStudentAccount(student.id, targetTermId);
        console.log(`✓ Created account for ${studentName} (${student.admissionNumber})`);
        created++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`✗ Error for ${studentName}: ${errorMessage}`);
      errors.push({
        studentId: student.id,
        studentName,
        error: errorMessage
      });
    }
  }

  return {
    termId: targetTermId,
    termName,
    totalStudents: students.length,
    created,
    existing,
    errors
  };
}

async function main() {
  try {
    console.log('=== Student Account Initialization ===\n');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const termIdArg = args.find(arg => arg.startsWith('--term-id='));
    const termId = termIdArg ? termIdArg.split('=')[1] : undefined;

    const result = await initializeStudentAccounts(termId);

    console.log('\n=== Migration Summary ===');
    console.log(`Term: ${result.termName} (${result.termId})`);
    console.log(`Total Students: ${result.totalStudents}`);
    console.log(`Accounts Created: ${result.created}`);
    console.log(`Accounts Already Existed: ${result.existing}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n=== Errors ===');
      result.errors.forEach(err => {
        console.log(`- ${err.studentName} (${err.studentId}): ${err.error}`);
      });
    }

    console.log('\n✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
