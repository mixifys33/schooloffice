/**
 * Exam-Only Performance Report API
 * 
 * Generates reports showing exam scores with "CA pending" status notes
 * for exceptional cases with DoS override.
 * 
 * Requirements: 27.2, 27.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@/types/enums';
import { gradingEngine, type ExamEntry } from '@/lib/grading-engine';
import { z } from 'zod';

const querySchema = z.object({
  classId: z.string(),
  subjectId: z.string().optional(),
  termId: z.string().optional(),
  studentId: z.string().optional(),
});

export interface ExamOnlyReportData {
  reportType: 'EXAM_ONLY';
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
    examEntry?: {
      id: string;
      examScore: number;
      maxScore: number;
      examDate: Date;
      examContribution: number;
      status: string;
    };
    examStatistics: {
      hasExam: boolean;
      examContribution: number;
      examPercentage: number;
    };
    caStatus: {
      hasPendingCA: boolean;
      statusNote: string;
    };
  }[];
  classStatistics: {
    totalStudents: number;
    studentsWithExam: number;
    studentsWithoutExam: number;
    averageExamScore: number;
    averageExamContribution: number;
  };
  reportStatus: {
    isComplete: boolean;
    missingData: string[];
    canPrint: boolean;
    approvalRequired: boolean;
    dosOverrideRequired: boolean;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryData = {
      classId: searchParams.get('classId'),
      subjectId: searchParams.get('subjectId') || undefined,
      termId: searchParams.get('termId') || undefined,
      studentId: searchParams.get('studentId') || undefined,
    };

    const validatedQuery = querySchema.parse(queryData);

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

    const hasClassAccess = staff.classTeacherAssignments.some(
      (assignment) => assignment.classId === validatedQuery.classId
    ) || staff.subjectTeacherAssignments.some(
      (assignment) => assignment.classId === validatedQuery.classId
    );

    if (!hasClassAccess && staff.role !== Role.DOS && staff.role !== Role.SCHOOL_ADMIN) {
      return NextResponse.json({ error: 'Unauthorized access to class' }, { status: 403 });
    }

    let termId = validatedQuery.termId;
    if (!termId) {
      const currentTerm = await prisma.term.findFirst({
        where: { schoolId: staff.schoolId, isActive: true },
      });
      
      if (!currentTerm) {
        return NextResponse.json({ error: 'No active term found' }, { status: 400 });
      }
      
      termId = currentTerm.id;
    }

    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    });

    if (!term) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 });
    }

    const classData = await prisma.class.findUnique({
      where: { id: validatedQuery.classId },
    });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    let subjectData = null;
    if (validatedQuery.subjectId) {
      subjectData = await prisma.subject.findUnique({
        where: { id: validatedQuery.subjectId },
      });

      if (!subjectData) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }
    }

    const studentWhere: any = {
      classId: validatedQuery.classId,
      status: 'ACTIVE',
    };

    if (validatedQuery.studentId) {
      studentWhere.id = validatedQuery.studentId;
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        examEntries: {
          where: {
            termId: termId,
            ...(validatedQuery.subjectId && { subjectId: validatedQuery.subjectId }),
          },
          include: { subject: true },
          orderBy: { examDate: 'desc' },
        },
        caEntries: {
          where: {
            termId: termId,
            ...(validatedQuery.subjectId && { subjectId: validatedQuery.subjectId }),
          },
          select: { id: true, subjectId: true },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    // Process student data
    const processedStudents = students.map((student) => {
      const examEntry = student.examEntries[0];
      
      let examStatistics = {
        hasExam: false,
        examContribution: 0,
        examPercentage: 0,
      };

      let examData = undefined;

      if (examEntry) {
        const examContribution = gradingEngine.calculateExamContribution(examEntry as ExamEntry);
        const examPercentage = examEntry.examScore;
        
        examStatistics = {
          hasExam: true,
          examContribution,
          examPercentage,
        };

        examData = {
          id: examEntry.id,
          examScore: examEntry.examScore,
          maxScore: examEntry.maxScore,
          examDate: examEntry.examDate,
          examContribution,
          status: examEntry.status,
        };
      }

      const hasCA = student.caEntries.length > 0;
      const caStatus = {
        hasPendingCA: !hasCA,
        statusNote: hasCA 
          ? 'CA entries available' 
          : 'CA pending - exam-only report for exceptional case',
      };

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        examEntry: examData,
        examStatistics,
        caStatus,
      };
    });

    // Calculate class statistics
    const studentsWithExam = processedStudents.filter(s => s.examStatistics.hasExam);
    const examScores = studentsWithExam.map(s => s.examEntry?.examScore || 0);
    const examContributions = studentsWithExam.map(s => s.examStatistics.examContribution);

    const averageExamScore = examScores.length > 0
      ? examScores.reduce((sum, score) => sum + score, 0) / examScores.length
      : 0;

    const averageExamContribution = examContributions.length > 0
      ? examContributions.reduce((sum, contrib) => sum + contrib, 0) / examContributions.length
      : 0;

    const classStatistics = {
      totalStudents: processedStudents.length,
      studentsWithExam: studentsWithExam.length,
      studentsWithoutExam: processedStudents.length - studentsWithExam.length,
      averageExamScore: Math.round(averageExamScore * 100) / 100,
      averageExamContribution: Math.round(averageExamContribution * 100) / 100,
    };

    // Determine report status
    const missingData: string[] = [];
    const studentsWithoutCA = processedStudents.filter(s => s.caStatus.hasPendingCA).length;
    
    if (classStatistics.studentsWithoutExam > 0) {
      missingData.push(`${classStatistics.studentsWithoutExam} students have no exam entries`);
    }
    
    if (studentsWithoutCA > 0) {
      missingData.push(`${studentsWithoutCA} students have pending CA entries`);
    }

    const dosOverrideRequired = studentsWithoutCA > 0;

    const reportStatus = {
      isComplete: missingData.length === 0,
      missingData,
      canPrint: staff.role === Role.DOS || staff.role === Role.SCHOOL_ADMIN,
      approvalRequired: true,
      dosOverrideRequired,
    };

    const reportData: ExamOnlyReportData = {
      reportType: 'EXAM_ONLY',
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
    console.error('Error generating exam-only report:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate exam-only report' },
      { status: 500 }
    );
  }
}