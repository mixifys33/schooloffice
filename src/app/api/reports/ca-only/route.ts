/**
 * CA-Only Performance Report API
 * 
 * Generates reports showing all CA activities, scores, averages, and competency comments
 * for mid-term monitoring and parent meetings.
 * 
 * Requirements: 27.1, 27.6
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@/types/enums';
import { gradingEngine, type CAEntry } from '@/lib/grading-engine';
import { z } from 'zod';

const querySchema = z.object({
  classId: z.string(),
  subjectId: z.string().optional(),
  termId: z.string().optional(),
  studentId: z.string().optional(),
});

export interface CAOnlyReportData {
  reportType: 'CA_ONLY';
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
    caEntries: {
      id: string;
      name: string;
      type: string;
      maxScore: number;
      rawScore: number;
      percentage: number;
      date: Date;
      competencyComment?: string;
      status: string;
    }[];
    caStatistics: {
      totalEntries: number;
      averagePercentage: number;
      caContribution: number; // Out of 20
      highestScore: number;
      lowestScore: number;
    };
    competencyProgress: {
      competencyId?: string;
      comments: string[];
      overallProgress: string;
    };
  }[];
  classStatistics: {
    totalStudents: number;
    averageCAContribution: number;
    studentsWithCA: number;
    studentsWithoutCA: number;
  };
  reportStatus: {
    isComplete: boolean;
    missingData: string[];
    canPrint: boolean;
    approvalRequired: boolean;
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

    // Get students with their CA entries
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
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    });

    // Process student data
    const processedStudents = students.map((student) => {
      const caEntries = student.caEntries.map((entry) => ({
        id: entry.id,
        name: entry.name,
        type: entry.type,
        maxScore: entry.maxScore,
        rawScore: entry.rawScore,
        percentage: gradingEngine.calculateCAPercentage(entry.rawScore, entry.maxScore),
        date: entry.date,
        competencyComment: entry.competencyComment || undefined,
        status: entry.status,
      }));

      // Calculate CA statistics
      const percentages = caEntries.map(entry => entry.percentage);
      const averagePercentage = percentages.length > 0 
        ? percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length 
        : 0;
      
      const caContribution = gradingEngine.calculateCAContribution(
        student.caEntries as CAEntry[]
      );

      const caStatistics = {
        totalEntries: caEntries.length,
        averagePercentage: Math.round(averagePercentage * 100) / 100,
        caContribution,
        highestScore: percentages.length > 0 ? Math.max(...percentages) : 0,
        lowestScore: percentages.length > 0 ? Math.min(...percentages) : 0,
      };

      // Process competency progress
      const competencyComments = caEntries
        .filter(entry => entry.competencyComment)
        .map(entry => entry.competencyComment!);

      const competencyProgress = {
        competencyId: student.caEntries[0]?.competencyId || undefined,
        comments: competencyComments,
        overallProgress: competencyComments.length > 0 
          ? 'Comments available' 
          : 'No competency comments yet',
      };

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        caEntries,
        caStatistics,
        competencyProgress,
      };
    });

    // Calculate class statistics
    const studentsWithCA = processedStudents.filter(s => s.caEntries.length > 0);
    const averageCAContribution = studentsWithCA.length > 0
      ? studentsWithCA.reduce((sum, s) => sum + s.caStatistics.caContribution, 0) / studentsWithCA.length
      : 0;

    const classStatistics = {
      totalStudents: processedStudents.length,
      averageCAContribution: Math.round(averageCAContribution * 100) / 100,
      studentsWithCA: studentsWithCA.length,
      studentsWithoutCA: processedStudents.length - studentsWithCA.length,
    };

    // Determine report status
    const missingData: string[] = [];
    if (classStatistics.studentsWithoutCA > 0) {
      missingData.push(`${classStatistics.studentsWithoutCA} students have no CA entries`);
    }

    const reportStatus = {
      isComplete: missingData.length === 0,
      missingData,
      canPrint: true, // CA-only reports can always be printed
      approvalRequired: false, // CA-only reports don't require approval for printing
    };

    const reportData: CAOnlyReportData = {
      reportType: 'CA_ONLY',
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
    console.error('Error generating CA-only report:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate CA-only report' },
      { status: 500 }
    );
  }
}