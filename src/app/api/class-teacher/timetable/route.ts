import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role, StaffRole, ResponsibilityType } from '@prisma/client';

/**
 * GET /api/class-teacher/timetable
 * Fetch timetable for class teacher's assigned class
 * 
 * Returns:
 * - Teacher context (name, role, term, academic year)
 * - Class information
 * - Weekly timetable (Monday-Friday)
 * - Today's schedule with current period highlighting
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/class-teacher/timetable - Starting request');
    
    const session = await auth();
    if (!session?.user) {
      console.log('❌ [API] /api/class-teacher/timetable - No session found');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      console.log('❌ [API] /api/class-teacher/timetable - No school context');
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    console.log('✅ [API] /api/class-teacher/timetable - Session found for user:', session.user.id);

    // Get staff profile
    const staff = await prisma.staff.findFirst({
      where: { schoolId, userId: session.user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        primaryRole: true,
        secondaryRoles: true,
      },
    });

    if (!staff) {
      console.log('❌ [API] /api/class-teacher/timetable - Staff profile not found');
      return NextResponse.json(
        { error: 'Staff profile not found' },
        { status: 404 }
      );
    }

    console.log('✅ [API] /api/class-teacher/timetable - Staff profile found:', staff.id);

    // Verify class teacher role
    const userRole = session.user.activeRole || session.user.role;
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY;
    const isClassTeacher = staff.primaryRole === StaffRole.CLASS_TEACHER ||
      ((staff.secondaryRoles as string[]) || []).includes(StaffRole.CLASS_TEACHER);

    if (!isAdmin && !isClassTeacher) {
      console.log('❌ [API] /api/class-teacher/timetable - Invalid role:', userRole);
      return NextResponse.json(
        { error: 'Class Teacher access required' },
        { status: 403 }
      );
    }

    // Get current academic year and term
    const academicYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true, name: true },
    });

    if (!academicYear) {
      return NextResponse.json({
        context: {
          teacherId: staff.id,
          teacherName: `${staff.firstName} ${staff.lastName}`,
          roleName: staff.primaryRole,
          currentTerm: null,
          academicYear: null,
          contextError: 'No active academic year found. Please contact administration.',
        },
        class: null,
        timetable: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
        },
        todaySchedule: [],
      });
    }

    const today = new Date();
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYearId: academicYear.id,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!currentTerm) {
      return NextResponse.json({
        context: {
          teacherId: staff.id,
          teacherName: `${staff.firstName} ${staff.lastName}`,
          roleName: staff.primaryRole,
          currentTerm: null,
          academicYear: { id: academicYear.id, name: academicYear.name },
          contextError: 'No active term found. Please contact administration.',
        },
        class: null,
        timetable: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
        },
        todaySchedule: [],
      });
    }

    // Find class teacher's assigned class
    console.log('🔍 [API] /api/class-teacher/timetable - Finding assigned class...');
    
    let classId: string | null = null;

    // Step 1: Check StaffResponsibility for CLASS_TEACHER_DUTY
    const staffResponsibilities = await prisma.staffResponsibility.findMany({
      where: {
        staffId: staff.id,
        type: ResponsibilityType.CLASS_TEACHER_DUTY,
      },
      select: {
        details: true,
      },
    });

    if (staffResponsibilities.length > 0) {
      // Extract class ID from responsibility details
      const responsibility = staffResponsibilities[0];
      if (responsibility.details && typeof responsibility.details === 'object') {
        const details = responsibility.details as any;
        classId = details.classId || null;
        if (classId) {
          console.log('✅ [API] /api/class-teacher/timetable - Found class via StaffResponsibility:', classId);
        }
      }
    }

    // Step 2: Fallback to StaffClass
    if (!classId) {
      const staffClass = await prisma.staffClass.findFirst({
        where: { staffId: staff.id },
        select: { classId: true },
      });

      if (staffClass) {
        classId = staffClass.classId;
        console.log('✅ [API] /api/class-teacher/timetable - Found class via StaffClass:', classId);
      }
    }

    // Step 3: Fallback to Teacher model
    if (!classId) {
      const teacher = await prisma.teacher.findFirst({
        where: { 
          schoolId: staff.schoolId || schoolId,
          OR: [
            ...(staff.email ? [{ email: staff.email }] : []),
            { firstName: staff.firstName, lastName: staff.lastName }
          ]
        },
        select: { 
          classTeacherForIds: true,
          assignedClassIds: true 
        }
      });

      if (teacher) {
        // Prefer class teacher assignment over regular assignment
        if (teacher.classTeacherForIds.length > 0) {
          classId = teacher.classTeacherForIds[0];
          console.log('✅ [API] /api/class-teacher/timetable - Found class via Teacher.classTeacherForIds:', classId);
        } else if (teacher.assignedClassIds.length > 0) {
          classId = teacher.assignedClassIds[0];
          console.log('✅ [API] /api/class-teacher/timetable - Found class via Teacher.assignedClassIds:', classId);
        }
      }
    }

    // Step 4: Fallback to StaffSubject
    if (!classId) {
      const staffSubject = await prisma.staffSubject.findFirst({
        where: { staffId: staff.id },
        select: { classId: true },
      });

      if (staffSubject) {
        classId = staffSubject.classId;
        console.log('✅ [API] /api/class-teacher/timetable - Found class via StaffSubject:', classId);
      }
    }

    if (!classId) {
      console.log('❌ [API] /api/class-teacher/timetable - No class assignment found');
      return NextResponse.json({
        context: {
          teacherId: staff.id,
          teacherName: `${staff.firstName} ${staff.lastName}`,
          roleName: staff.primaryRole,
          currentTerm: {
            id: currentTerm.id,
            name: currentTerm.name,
            startDate: currentTerm.startDate.toISOString(),
            endDate: currentTerm.endDate.toISOString(),
          },
          academicYear: { id: academicYear.id, name: academicYear.name },
          contextError: 'No class assignment found. Please contact administration.',
        },
        class: null,
        timetable: {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
        },
        todaySchedule: [],
      });
    }

    // Get class details
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        streams: {
          select: { name: true },
        },
      },
    });

    if (!classData) {
      console.log('❌ [API] /api/class-teacher/timetable - Class not found');
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    console.log('✅ [API] /api/class-teacher/timetable - Class found:', classData.name);

    // Get timetable for this class and term
    const timetable = await prisma.doSTimetable.findFirst({
      where: {
        schoolId,
        classId,
        termId: currentTerm.id,
        isLocked: true, // Only show published timetables
      },
      include: {
        entries: {
          include: {
            curriculumSubject: {
              include: {
                subject: { select: { name: true, code: true } },
              },
            },
            teacher: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { period: 'asc' },
          ],
        },
      },
    });

    // Helper function to format time
    const formatTime = (period: number): { start: string; end: string } => {
      const startHour = 8 + Math.floor((period - 1) / 2);
      const startMinute = (period - 1) % 2 === 0 ? 0 : 40;
      const endHour = 8 + Math.floor(period / 2);
      const endMinute = period % 2 === 0 ? 0 : 40;

      return {
        start: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`,
        end: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`,
      };
    };

    // Get current time info
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Determine current period (8:00-8:40 = P1, 8:40-9:20 = P2, etc.)
    const getCurrentPeriod = (): number | null => {
      if (currentTimeInMinutes < 8 * 60) return null; // Before school
      if (currentTimeInMinutes >= 17 * 60) return null; // After school

      const minutesSinceStart = currentTimeInMinutes - 8 * 60;
      const period = Math.floor(minutesSinceStart / 40) + 1;
      
      return period <= 10 ? period : null;
    };

    const currentPeriod = getCurrentPeriod();

    // Organize entries by day
    const weeklyTimetable = {
      monday: [] as any[],
      tuesday: [] as any[],
      wednesday: [] as any[],
      thursday: [] as any[],
      friday: [] as any[],
    };

    const todaySchedule: any[] = [];

    if (timetable) {
      timetable.entries.forEach((entry) => {
        const time = formatTime(entry.period);
        const isToday = entry.dayOfWeek === currentDayOfWeek;
        const isCurrent = isToday && entry.period === currentPeriod;

        const formattedEntry = {
          period: entry.period,
          startTime: time.start,
          endTime: time.end,
          className: classData.name,
          streamName: classData.streams.length > 0 ? classData.streams[0].name : null,
          subjectName: entry.curriculumSubject.subject.name,
          room: entry.room || 'TBA',
          isCurrent,
          isToday,
          isBreak: false,
        };

        // Add to weekly timetable
        const dayMap: Record<number, keyof typeof weeklyTimetable> = {
          1: 'monday',
          2: 'tuesday',
          3: 'wednesday',
          4: 'thursday',
          5: 'friday',
        };

        const dayKey = dayMap[entry.dayOfWeek];
        if (dayKey) {
          weeklyTimetable[dayKey].push(formattedEntry);
        }

        // Add to today's schedule
        if (isToday) {
          todaySchedule.push(formattedEntry);
        }
      });
    }

    // Add break periods to today's schedule (example: P3 = 10:00-10:20 break)
    if (currentDayOfWeek >= 1 && currentDayOfWeek <= 5) {
      const breakPeriods = [
        { period: 3, name: 'Morning Break', start: '10:00', end: '10:20' },
        { period: 6, name: 'Lunch Break', start: '12:00', end: '13:00' },
      ];

      breakPeriods.forEach((breakInfo) => {
        const isBreakCurrent = currentPeriod === breakInfo.period;
        todaySchedule.push({
          period: breakInfo.period,
          startTime: breakInfo.start,
          endTime: breakInfo.end,
          className: '',
          streamName: null,
          subjectName: '',
          room: '',
          isCurrent: isBreakCurrent,
          isToday: true,
          isBreak: true,
          breakName: breakInfo.name,
        });
      });

      // Sort today's schedule by period
      todaySchedule.sort((a, b) => a.period - b.period);
    }

    console.log('✅ [API] /api/class-teacher/timetable - Successfully returning timetable data');

    return NextResponse.json({
      context: {
        teacherId: staff.id,
        teacherName: `${staff.firstName} ${staff.lastName}`,
        roleName: staff.primaryRole,
        currentTerm: {
          id: currentTerm.id,
          name: currentTerm.name,
          startDate: currentTerm.startDate.toISOString(),
          endDate: currentTerm.endDate.toISOString(),
        },
        academicYear: { id: academicYear.id, name: academicYear.name },
        contextError: null,
      },
      class: {
        id: classData.id,
        name: classData.name,
        streamName: classData.streams.length > 0 ? classData.streams[0].name : null,
      },
      timetable: weeklyTimetable,
      todaySchedule,
    });

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/timetable - Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
