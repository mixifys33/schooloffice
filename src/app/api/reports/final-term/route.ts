/**
 * Final Term Report Card API
 * 
 * Generates complete final term report cards showing CA contribution (20), 
 * Exam contribution (80), and final score (100) for official reporting.
 * 
 * Requirements: 27.3, 27.4, 27.5, 27.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@/types/enums';
import { gradingEngine, type CAEntry, type ExamEntry, type GradeCalculation } from '@/lib/grading-engine';
import { z } from 'zod';

const querySchema = z.object({
  classId: z.string(),
  subjectId: z.string().optional(),
  termId: z.string().optional(),
  studentId: z.string().optional(),
});

export interface FinalTermReportData {
  reportType: 'FINAL_TERM';
  generatedAt: Date;
  term: {
    id: string;
    name: string;
    academicYear: string;
  };
  class: {
    id: string;
    name: string;
    level: string;
  };
  subject?: {
    id: string;
    name: string;
    code: string;
  };
  students: {
    id: string;
    name: string;
    admissionNumber: string;
    gradeCalculation: GradeCalculation;
    finalGrade: {
      caContribution: number; // Out of 20
      examContribution: number; // Out of 80
      finalScore: number; // Out of 100
      grade?: string;
      position?: number;
    };
    competencyDescriptors: {
      competencyId?: string;
      overallComment: string;
      teacherRemarks: string;
    };
    approvalStatus: {
      caApproved: boolean;
      examApproved: boolean;
      finalApproved: boolean;
      approvedBy?: string;
      approvedAt?: Date;
    };
  }[];
  classStatistics: {
    totalStudents: number;
    completeReports: number;
    incompleteReports: number;
    averageFinalScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number; // Percentage of students with passing grades
  };
  reportStatus: {
    isComplete: boolean;
    missingData: string[];
    canPrint: boolean;
    approvalRequired: boolean;
    dosApprovalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryData = {
      classId: searchParams.get('classId'),
      subjectId: searchParams.get('subjectId') || undefined,
      termId: searchParams.get('termId') || undefined,
      studentId: searchParams.get('studentId') || undefined,
    };

    const validatedQuery = querySchema.parse(queryData);

    // Get current user's staff record
    const staff = await prisma.staff.findUnique({
      where: { userId: session.user.id },
      include: {
        school: true,
        classTeacherAssignments: true,
        subjectTeacherAssignments: true,
      },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 });
    }

    // Verify authorization - teacher must have access to the class
    const hasClassAccess = staff.classTeacherAssignments.some(
      (assignment) => assignment.classId === validatedQuery.classId
    ) || staff.subjectTeacherAssignments.some(
      (assignment) => assignment.classId === validatedQuery.classId
    );

    if (!hasClassAccess && staff.role !== Role.DOS && staff.role !== Role.SCHOOL_ADMIN) {
      return NextResponse.json({ error: 'Unauthorized access to class' }, { status: 403 });
    }

    // Get current term if not specified
    let termId = validatedQuery.termId;
    if (!termId) {
      const currentTerm = await prisma.term.findFirst({
        where: {
          schoolId: staff.schoolId,
          isActive: true,
        },
      });
      
      if (!currentTerm) {
        return NextResponse.json({ error: 'No active term found' }, { status: 400 });
      }
      
      termId = currentTerm.id;
    }

    // Get term details
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: {
        academicYear: true,
      },
    });

    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    // Get class details
    const classData = await prisma.class.findUnique({
      where: { id: validatedQuery.classId },
    });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Get subject details if specified
    let subjectData = null;
    if (validatedQuery.subjectId) {
      subjectData = await prisma.subject.findUnique({
        where: { id: validatedQuery.subjectId },
      });

      if (!subjectData) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }
    }

    // Build student query
    const studentWhere: any = {
      classId: validatedQuery.classId,
      status: 'ACTIVE',
    };

    if (validatedQuery.studentId) {
      studentWhere.id = validatedQuery.studentId;
    }

    // Get students with their complete CA and exam entries
    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        caEntries: {
          where: {
            termId: termId,
            ...(validatedQuery.subjectId && { subjectId: validatedQuery.subjectId }),
          },
          include: {
            subject: true,
          },
          orderBy: [
            { date: 'asc' },
            { createdAt: 'asc' },
          ],
        },
        examEntries: {
          where: {
            termId: termId,
            ...(validatedQuery.subjectId && { subjectId: validatedQuery.subjectId }),
          },
          include: {
            subject: true,
          },
          orderBy: { examDate: 'desc' },
        },
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });

    // Process student data with complete grade calculations
    const processedStudents = students.map((student) => {
      const caEntries = student.caEntries as CAEntry[];
      const examEntry = student.examEntries[0] as ExamEntry | undefined;

      // Generate complete grade calculation
      const gradeCalculation = gradingEngine.generateGradeCalculation(
        student.id,
        validatedQuery.subjectId || 'all-subjects',
        termId,
        caEntries,
        examEntry
      );

      // Calculate final grade details
      const finalGrade = {
        caContribution: gradeCalculation.caContribution,
        examContribution: gradeCalculation.examContribution,
        finalScore: gradeCalculation.finalScore,
        grade: calculateLetterGrade(gradeCalculation.finalScore),
        position: undefined, // Will be calculated after all students are processed
      };

      // Process competency descriptors
      const competencyComments = caEntries
        .filter(entry => entry.competencyComment)
        .map(entry => entry.competencyComment!);

      const competencyDescriptors = {
        competencyId: caEntries[0]?.competencyId || undefined,
        overallComment: competencyComments.length > 0 
          ? competencyComments.join('; ') 
          : 'No specific competency comments available',
        teacherRemarks: generateTeacherRemarks(gradeCalculation),
      };

      // Check approval status
      const caApproved = caEntries.every(entry => entry.status === 'APPROVED');
      const examApproved = examEntry ? examEntry.status === 'APPROVED' : false;
      const finalApproved = caApproved && examApproved;

      const approvalStatus = {
        caApproved,
        examApproved,
        finalApproved,
        approvedBy: examEntry?.approvedBy || caEntries[0]?.approvedBy,
        approvedAt: examEntry?.approvedAt || caEntries[0]?.approvedAt,
      };

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        gradeCalculation,
        finalGrade,
        competencyDescriptors,
        approvalStatus,
      };
    });

    // Calculate positions based on final scores
    const studentsWithScores = processedStudents
      .filter(s => s.gradeCalculation.isComplete)
      .sort((a, b) => b.finalGrade.finalScore - a.finalGrade.finalScore);

    studentsWithScores.forEach((student, index) => {
      student.finalGrade.position = index + 1;
    });

    // Calculate class statistics
    const completeReports = processedStudents.filter(s => s.gradeCalculation.isComplete);
    const finalScores = completeReports.map(s => s.finalGrade.finalScore);

    const averageFinalScore = finalScores.length > 0
      ? finalScores.reduce((sum, score) => sum + score, 0) / finalScores.length
      : 0;

    const highestScore = finalScores.length > 0 ? Math.max(...finalScores) : 0;
    const lowestScore = finalScores.length > 0 ? Math.min(...finalScores) : 0;
    
    // Calculate pass rate (assuming 50% is passing)
    const passingStudents = finalScores.filter(score => score >= 50).length;
    const passRate = finalScores.length > 0 
      ? (passingStudents / finalScores.length) * 100 
      : 0;

    const classStatistics = {
      totalStudents: processedStudents.length,
      completeReports: completeReports.length,
      incompleteReports: processedStudents.length - completeReports.length,
      averageFinalScore: Math.round(averageFinalScore * 100) / 100,
      highestScore,
      lowestScore,
      passRate: Math.round(passRate * 100) / 100,
    };

    // Determine report status
    const missingData: string[] = [];
    
    if (classStatistics.incompleteReports > 0) {
      missingData.push(`${classStatistics.incompleteReports} students have incomplete CA or Exam entries`);
    }

    const unapprovedReports = processedStudents.filter(s => !s.approvalStatus.finalApproved).length;
    if (unapprovedReports > 0) {
      missingData.push(`${unapprovedReports} reports pending DoS approval`);
    }

    const reportStatus = {
      isComplete: missingData.length === 0,
      missingData,
      canPrint: unapprovedReports === 0 && (staff.role === Role.DOS || staff.role === Role.SCHOOL_ADMIN),
      approvalRequired: true, // Final reports always require approval
      dosApprovalStatus: unapprovedReports === 0 ? 'APPROVED' as const : 'PENDING' as const,
    };

    const reportData: FinalTermReportData = {
      reportType: 'FINAL_TERM',
      generatedAt: new Date(),
      term: {
        id: term.id,
        name: term.name,
        academicYear: term.academicYear.name,
      },
      class: {
        id: classData.id,
        name: classData.name,
        level: classData.level,
      },
      subject: subjectData ? {
        id: subjectData.id,
        name: subjectData.name,
        code: subjectData.code,
      } : undefined,
      students: processedStudents,
      classStatistics,
      reportStatus,
    };

    return NextResponse.json(reportData);

  } catch (error) {
    console.error('Error generating final term report:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate final term report' },
      { status: 500 }
    );
  }
}

/**
 * Calculate letter grade based on final score
 */
function calculateLetterGrade(finalScore: number): string {
  if (finalScore >= 90) return 'A+';
  if (finalScore >= 80) return 'A';
  if (finalScore >= 70) return 'B+';
  if (finalScore >= 60) return 'B';
  if (finalScore >= 50) return 'C+';
  if (finalScore >= 40) return 'C';
  if (finalScore >= 30) return 'D+';
  if (finalScore >= 20) return 'D';
  return 'F';
}

/**
 * Generate teacher remarks based on grade calculation
 */
function generateTeacherRemarks(gradeCalculation: GradeCalculation): string {
  const { finalScore, hasCA, hasExam, caContribution, examContribution } = gradeCalculation;

  if (!hasCA && !hasExam) {
    return 'No assessment data available for this term.';
  }

  if (!hasCA) {
    return 'Continuous Assessment pending. Exam performance recorded.';
  }

  if (!hasExam) {
    return 'Examination pending. Continuous Assessment performance recorded.';
  }

  // Generate remarks based on performance
  let remarks = '';

  if (finalScore >= 80) {
    remarks = 'Excellent performance. ';
  } else if (finalScore >= 70) {
    remarks = 'Very good performance. ';
  } else if (finalScore >= 60) {
    remarks = 'Good performance. ';
  } else if (finalScore >= 50) {
    remarks = 'Satisfactory performance. ';
  } else {
    remarks = 'Needs improvement. ';
  }

  // Add specific feedback based on CA vs Exam performance
  const caPercentage = (caContribution / 20) * 100;
  const examPercentage = (examContribution / 80) * 100;

  if (caPercentage > examPercentage + 10) {
    remarks += 'Strong continuous assessment performance. Focus on exam preparation.';
  } else if (examPercentage > caPercentage + 10) {
    remarks += 'Good exam performance. Maintain consistent effort in continuous assessments.';
  } else {
    remarks += 'Balanced performance across continuous assessment and examinations.';
  }

  return remarks;
}