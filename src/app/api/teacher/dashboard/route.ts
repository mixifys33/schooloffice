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
        staffSubjects: {
          include: {
            subject: true,
          },
        },
        staffClasses: {
          include: {
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
    const classIds = teacher.staffClasses.map(sc => sc.classId);
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
        teacherId: teacher.id,
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

    // Get recent marks entries
    const recentMarks = await prisma.mark.findMany({
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

    // Build dashboard response
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
        assignedClasses: teacher.staffClasses.length,
        assignedSubjects: teacher.staffSubjects.length,
        totalStudents: studentCount,
        upcomingClasses: upcomingClasses.length,
      },
      assignedClasses: teacher.staffClasses.map(sc => ({
        id: sc.class.id,
        name: sc.class.name,
        level: sc.class.level,
        levelType: sc.class.levelType,
        streams: sc.class.streams.map(s => ({
          id: s.id,
          name: s.name,
        })),
      })),
      assignedSubjects: teacher.staffSubjects.map(ss => ({
        id: ss.subject.id,
        name: ss.subject.name,
        code: ss.subject.code,
        levelType: ss.subject.levelType,
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
