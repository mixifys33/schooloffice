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

    // Get upcoming classes/periods (based on current day of week)
    const today = new Date();
    const currentDayOfWeek = today.getDay() || 7; // Convert Sunday (0) to 7
    
    const upcomingClasses = await prisma.timetableEntry.findMany({
      where: {
        staffId: teacher.id,
        dayOfWeek: {
          gte: currentDayOfWeek,
        },
      },
      include: {
        class: true,
        subject: true,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { period: 'asc' },
      ],
      take: 5,
    });

    // Get recent CA and Exam entries
    let recentCAEntries: any[] = [];
    let recentExamEntries: any[] = [];
    
    try {
      // First, find the staff record linked to this teacher
      const staff = await prisma.staff.findFirst({
        where: {
          userId: userId,
          schoolId: schoolId,
        },
      });

      if (staff) {
        // Get recent CA entries
        recentCAEntries = await prisma.cAEntry.findMany({
          where: {
            teacherId: staff.id,
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
          take: 5,
        });

        // Get recent Exam entries
        recentExamEntries = await prisma.examEntry.findMany({
          where: {
            teacherId: staff.id,
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
          take: 5,
        });
      }
    } catch (error) {
      console.log('CA/Exam entries query error:', error);
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

    // Get student count for each class
    const classStudentCounts = new Map<string, number>();
    for (const classId of uniqueClasses.keys()) {
      const count = await prisma.student.count({
        where: {
          classId: classId,
          status: 'ACTIVE',
        },
      });
      classStudentCounts.set(classId, count);
    }

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
        studentCount: classStudentCounts.get(cls.id) || 0,
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
        dayOfWeek: entry.dayOfWeek,
        period: entry.period,
        room: entry.room,
        className: entry.class.name,
        subjectName: entry.subject.name,
      })),
      recentCAEntries: recentCAEntries.map(ca => ({
        id: ca.id,
        studentName: `${ca.student.firstName} ${ca.student.lastName}`,
        subjectName: ca.subject.name,
        name: ca.name,
        type: ca.type,
        rawScore: ca.rawScore,
        maxScore: ca.maxScore,
        status: ca.status,
        createdAt: ca.createdAt,
      })),
      recentExamEntries: recentExamEntries.map(exam => ({
        id: exam.id,
        studentName: `${exam.student.firstName} ${exam.student.lastName}`,
        subjectName: exam.subject.name,
        examScore: exam.examScore,
        maxScore: exam.maxScore,
        status: exam.status,
        createdAt: exam.createdAt,
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
