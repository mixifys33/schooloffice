/**
 * DoS Subject Distribution API Route
 * Provides subject distribution across classes and teachers
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate DoS role
    if (session.user.role !== 'DOS' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School context required' },
        { status: 400 }
      );
    }

    const subjectId = params.id;
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');

    if (!termId) {
      return NextResponse.json(
        { error: 'Term ID required' },
        { status: 400 }
      );
    }

    // Get curriculum subjects for this subject across all classes
    const curriculumSubjects = await prisma.doSCurriculumSubject.findMany({
      where: {
        subjectId,
        schoolId,
      },
      include: {
        class: true,
        timetableEntries: {
          include: {
            teacher: true,
          },
        },
        finalScores: {
          where: {
            termId,
          },
        },
      },
    });

    // Get student counts per class for this subject
    const studentCounts = await Promise.all(
      curriculumSubjects.map(async (cs) => {
        const count = await prisma.student.count({
          where: {
            classId: cs.classId,
            isActive: true,
          },
        });
        return { classId: cs.classId, count };
      })
    );

    const studentCountMap = new Map(
      studentCounts.map(sc => [sc.classId, sc.count])
    );

    // Build distribution data
    const distribution = curriculumSubjects.map((cs) => {
      // Get primary teacher (most timetable entries)
      const teacherEntries = cs.timetableEntries.reduce((acc, entry) => {
        acc[entry.teacherId] = (acc[entry.teacherId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const primaryTeacherId = Object.keys(teacherEntries).reduce((a, b) => 
        teacherEntries[a] > teacherEntries[b] ? a : b, Object.keys(teacherEntries)[0]
      );

      const primaryTeacher = cs.timetableEntries.find(
        entry => entry.teacherId === primaryTeacherId
      )?.teacher;

      // Calculate average performance for this class
      const validScores = cs.finalScores.filter(score => score.finalScore !== null);
      const averagePerformance = validScores.length > 0
        ? Math.round(validScores.reduce((sum, score) => sum + (score.finalScore || 0), 0) / validScores.length)
        : 0;

      return {
        classId: cs.classId,
        className: cs.class.name,
        stream: cs.class.stream,
        assignedTeacher: {
          id: primaryTeacher?.id || '',
          name: primaryTeacher ? `${primaryTeacher.firstName} ${primaryTeacher.lastName}` : 'Unassigned',
          qualifications: primaryTeacher?.qualifications,
        },
        weeklyPeriods: cs.periodsPerWeek,
        studentCount: studentCountMap.get(cs.classId) || 0,
        averagePerformance,
      };
    });

    // Sort by class name
    distribution.sort((a, b) => a.className.localeCompare(b.className));

    return NextResponse.json(distribution);

  } catch (error) {
    console.error('Error fetching subject distribution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subject distribution' },
      { status: 500 }
    );
  }
}