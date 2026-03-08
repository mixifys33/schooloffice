import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as StudentAccountService from '@/services/student-account.service';

/**
 * Initialize Student Accounts API
 * Creates missing student accounts for all active students in the current term
 * This ensures the bursar dashboard and financial reports work correctly
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Only allow admin users to run this
    if (!session?.user?.schoolId || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.', success: false },
        { status: 401 }
      );
    }

    const { termId } = await request.json();

    // If no termId provided, find the current active term
    let targetTermId = termId;
    if (!targetTermId) {
      const activeTerm = await prisma.term.findFirst({
        where: {
          academicYear: {
            schoolId: session.user.schoolId,
            isActive: true
          },
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      });

      if (!activeTerm) {
        // If no active term, get the most recent term
        const recentTerm = await prisma.term.findFirst({
          where: {
            academicYear: {
              schoolId: session.user.schoolId
            }
          },
          orderBy: {
            startDate: 'desc'
          }
        });

        if (!recentTerm) {
          return NextResponse.json(
            { error: 'No terms found for this school', success: false },
            { status: 404 }
          );
        }

        targetTermId = recentTerm.id;
      } else {
        targetTermId = activeTerm.id;
      }
    }

    // Get all active students
    const students = await prisma.student.findMany({
      where: {
        schoolId: session.user.schoolId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true
      }
    });

    let created = 0;
    let existing = 0;
    let errors: Array<{ studentId: string; studentName: string; error: string }> = [];

    // Create accounts for each student
    for (const student of students) {
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
          existing++;
          // Recalculate balance to ensure it's accurate
          await StudentAccountService.recalculateStudentBalance(student.id, targetTermId);
        } else {
          // Create new account
          await StudentAccountService.getOrCreateStudentAccount(student.id, targetTermId);
          created++;
        }
      } catch (error) {
        errors.push({
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Student accounts initialized successfully`,
      data: {
        termId: targetTermId,
        totalStudents: students.length,
        created,
        existing,
        errors: errors.length,
        errorDetails: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Error initializing student accounts:', error);
    return NextResponse.json(
      {
        error: 'Failed to initialize student accounts',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
