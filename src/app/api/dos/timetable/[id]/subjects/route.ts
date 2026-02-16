import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role, StaffRole } from '@prisma/client';

/**
 * GET /api/dos/timetable/[id]/subjects
 * Fetch all subjects for a timetable (for customization in auto-generation dialog)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: timetableId } = await params;

    // 1. Authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get school context
    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    // 3. Authorization - Check if user is DoS
    const userRole = session.user.activeRole || session.user.role;
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY;

    // Check staff role for DoS
    const staff = await prisma.staff.findFirst({
      where: { schoolId, userId: session.user.id },
      select: { primaryRole: true, secondaryRoles: true },
    });

    const isDoS =
      staff &&
      (staff.primaryRole === StaffRole.DOS ||
        ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS));

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    // 4. Fetch timetable
    const timetable = await prisma.doSTimetable.findUnique({
      where: { id: timetableId },
      select: { id: true, classId: true, schoolId: true },
    });

    if (!timetable) {
      return NextResponse.json({ error: 'Timetable not found' }, { status: 404 });
    }

    if (timetable.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Unauthorized access to timetable' }, { status: 403 });
    }

    // 5. Handle school-wide timetables (no classId)
    if (!timetable.classId) {
      // For school-wide timetables, we need to aggregate subjects across all classes
      // Since each class may have the same subject with different periods, we'll show unique subjects
      // with the TOTAL periods needed across all classes
      
      const allClasses = await prisma.class.findMany({
        where: { schoolId },
        select: { id: true, name: true },
      });

      // Map to track unique subjects and their total periods
      const subjectMap = new Map<string, {
        curriculumSubjectIds: string[];
        subjectName: string;
        subjectCode: string;
        totalPeriodsPerWeek: number;
        classCount: number;
        classes: string[];
      }>();

      for (const classInfo of allClasses) {
        const curriculumSubjects = await prisma.doSCurriculumSubject.findMany({
          where: {
            classId: classInfo.id,
            schoolId,
          },
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        });

        curriculumSubjects.forEach((cs) => {
          const key = cs.subject.id; // Group by actual subject ID
          
          if (subjectMap.has(key)) {
            const existing = subjectMap.get(key)!;
            existing.curriculumSubjectIds.push(cs.id);
            existing.totalPeriodsPerWeek += cs.periodsPerWeek;
            existing.classCount++;
            existing.classes.push(classInfo.name);
          } else {
            subjectMap.set(key, {
              curriculumSubjectIds: [cs.id],
              subjectName: cs.subject.name,
              subjectCode: cs.subject.code,
              totalPeriodsPerWeek: cs.periodsPerWeek,
              classCount: 1,
              classes: [classInfo.name],
            });
          }
        });
      }

      // Convert map to array
      const aggregatedSubjects = Array.from(subjectMap.values()).map(s => ({
        curriculumSubjectId: s.curriculumSubjectIds[0], // Use first ID as representative
        curriculumSubjectIds: s.curriculumSubjectIds, // All IDs for this subject across classes
        subjectName: s.subjectName,
        subjectCode: s.subjectCode,
        periodsPerWeek: s.totalPeriodsPerWeek,
        classCount: s.classCount,
        classes: s.classes,
      }));

      return NextResponse.json({
        subjects: aggregatedSubjects,
        isSchoolWide: true,
        totalClasses: allClasses.length,
      });
    }

    // 6. Single-class timetable - fetch subjects for that class
    const curriculumSubjects = await prisma.doSCurriculumSubject.findMany({
      where: {
        classId: timetable.classId,
        schoolId,
      },
      include: {
        subject: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    const subjects = curriculumSubjects.map((cs) => ({
      curriculumSubjectId: cs.id,
      subjectName: cs.subject.name,
      subjectCode: cs.subject.code,
      periodsPerWeek: cs.periodsPerWeek,
    }));

    return NextResponse.json({
      subjects,
      isSchoolWide: false,
    });
  } catch (error) {
    console.error('❌ [Timetable Subjects API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
