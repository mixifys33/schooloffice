import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/teacher/dashboard
 * Get teacher dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const schoolId = session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 });
    }

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId,
        schoolId,
      },
      include: {
        teacherAssignments: {
          include: {
            subject: true,
            class: {
              include: {
                streams: true,
              },
            },
          },
        },
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    // Get student count for assigned classes
    const classIds = [...new Set(teacher.teacherAssignments.map(ta => ta.classId))];
    const studentCount = await prisma.student.count({
      where: {
        classId: { in: classIds },
      },
    });

    // Get upcoming classes/periods (if timetable exists)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingClasses = await prisma.timetableEntry.findMany({
      where: {
        staffId: teacher.id,
        date: {
          gte: today,
        },
      },
      include: {
        class: true,
        subject: true,
      },
      orderBy: {
        date: 'asc',
      },
      take: 5,
    });

    // Get recent marks entries (if marks table has teacherId field)
    // Note: Check your schema - marks might not have teacherId
    let recentMarks: any[] = [];
    try {
      recentMarks = await prisma.mark.findMany({
        where: {
          teacherId: teacher.id,
        },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          subject: {
            select: {
              name: true,
              code: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });
    } catch (error) {
      // If marks don't have teacherId, just skip this section
      console.log('Marks query skipped - field may not exist');
    }

    // Build dashboard response
    const uniqueClasses = new Map();
    const uniqueSubjects = new Map();
    
    teacher.teacherAssignments.forEach(ta => {
      if (!uniqueClasses.has(ta.classId)) {
        uniqueClasses.set(ta.classId, ta.class);
      }
      if (!uniqueSubjects.has(ta.subjectId)) {
        uniqueSubjects.set(ta.subjectId, ta.subject);
      }
    });

    const dashboardData = {
      teacher: {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        phone: teacher.phone,
        department: teacher.department,
        employmentStatus: teacher.employmentStatus,
      },
      stats: {
        assignedClasses: uniqueClasses.size,
        assignedSubjects: uniqueSubjects.size,
        totalStudents: studentCount,
        upcomingClasses: upcomingClasses.length,
      },
      assignedClasses: Array.from(uniqueClasses.values()).map(cls => ({
        id: cls.id,
        name: cls.name,
        level: cls.level,
        levelType: cls.levelType,
        streams: cls.streams.map(s => ({
          id: s.id,
          name: s.name,
        })),
      })),
      assignedSubjects: Array.from(uniqueSubjects.values()).map(subj => ({
        id: subj.id,
        name: subj.name,
        code: subj.code,
        levelType: subj.levelType,
      })),
      upcomingClasses: upcomingClasses.map(entry => ({
        id: entry.id,
        date: entry.date,
        startTime: entry.startTime,
        endTime: entry.endTime,
        className: entry.class.name,
        subjectName: entry.subject.name,
      })),
      recentMarks: recentMarks.map(mark => ({
        id: mark.id,
        studentName: `${mark.student.firstName} ${mark.student.lastName}`,
        subjectName: mark.subject.name,
        score: mark.score,
        maxScore: mark.maxScore,
        createdAt: mark.createdAt,
      })),
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error fetching teacher dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
