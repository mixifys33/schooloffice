import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role, StaffRole } from '@prisma/client';

/**
 * GET /api/dos/timetable/helpers
 * Fetch helper data for timetable creation
 * 
 * Query params:
 * - type: 'classes' | 'terms' | 'subjects' | 'teachers'
 * - classId?: string (for subjects query)
 * 
 * Returns:
 * - classes: All classes in the school
 * - terms: All terms in current academic year
 * - subjects: Curriculum subjects for a class (with periodsPerWeek)
 * - teachers: All active teachers
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    // Verify DoS access
    const userRole = session.user.activeRole || session.user.role;
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY;
    
    let isDoS = false;
    if (!isAdmin) {
      const staff = await prisma.staff.findFirst({
        where: { schoolId, userId: session.user.id },
        select: { primaryRole: true, secondaryRoles: true },
      });

      isDoS = staff && (
        staff.primaryRole === StaffRole.DOS ||
        ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS)
      );
    }

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const classId = searchParams.get('classId');

    // ========================================
    // FETCH CLASSES
    // ========================================
    if (type === 'classes') {
      const classes = await prisma.class.findMany({
        where: { schoolId },
        select: {
          id: true,
          name: true,
          level: true,
        },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({ classes });
    }

    // ========================================
    // FETCH TERMS
    // ========================================
    if (type === 'terms') {
      // Get current academic year
      const currentAcademicYear = await prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
        select: { id: true },
      });

      if (!currentAcademicYear) {
        // If no current academic year, get the most recent one
        const latestAcademicYear = await prisma.academicYear.findFirst({
          where: { schoolId },
          select: { id: true },
          orderBy: { startDate: 'desc' },
        });

        if (!latestAcademicYear) {
          return NextResponse.json(
            { error: 'No academic years found. Please create an academic year first.' },
            { status: 404 }
          );
        }

        const terms = await prisma.term.findMany({
          where: {
            academicYearId: latestAcademicYear.id,
          },
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
          orderBy: { startDate: 'asc' },
        });

        return NextResponse.json({ 
          terms,
          warning: 'No current academic year set. Showing terms from the most recent academic year.'
        });
      }

      const terms = await prisma.term.findMany({
        where: {
          academicYearId: currentAcademicYear.id,
        },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { startDate: 'asc' },
      });

      return NextResponse.json({ terms });
    }

    // ========================================
    // FETCH SUBJECTS (for a class)
    // ========================================
    if (type === 'subjects') {
      // For school-wide timetables, classId might be "null" string or actually null
      if (!classId || classId === 'null') {
        // Return empty array for school-wide timetables (subjects loaded per class when adding entry)
        return NextResponse.json({ 
          subjects: [],
          total: 0,
          message: 'For school-wide timetables, select a class first to see subjects',
        });
      }

      const search = searchParams.get('search') || '';

      console.log('🔍 Fetching subjects for classId:', classId, 'schoolId:', schoolId, 'search:', search);

      // Build where clause
      const where: any = {
        schoolId,
        classId,
        isActive: true,
      };

      // Add search filter if provided
      if (search) {
        where.subject = {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        };
      }

      const subjects = await prisma.doSCurriculumSubject.findMany({
        where,
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: {
          subject: { name: 'asc' },
        },
      });

      console.log('📊 Found subjects:', subjects.length);
      if (subjects.length === 0 && !search) {
        console.log('⚠️ No subjects found. Checking if any exist without isActive filter...');
        const allSubjects = await prisma.doSCurriculumSubject.findMany({
          where: { schoolId, classId },
          select: { id: true, isActive: true },
        });
        console.log('📊 Total subjects for this class (including inactive):', allSubjects.length);
        console.log('   Active:', allSubjects.filter(s => s.isActive).length);
        console.log('   Inactive:', allSubjects.filter(s => !s.isActive).length);
      }

      // Get timetable ID if provided (for usage count)
      const timetableId = searchParams.get('timetableId');
      
      // Calculate usage count for each subject if timetableId provided
      const formattedSubjects = await Promise.all(
        subjects.map(async (cs) => {
          let usageCount = 0;
          
          if (timetableId) {
            // Count how many times this subject is used in the timetable
            usageCount = await prisma.doSTimetableEntry.count({
              where: {
                timetableId,
                curriculumSubjectId: cs.id,
                isSpecialPeriod: false, // Don't count special periods
              },
            });
          }

          return {
            id: cs.id, // curriculumSubjectId
            subjectId: cs.subjectId,
            subjectName: cs.subject.name,
            subjectCode: cs.subject.code,
            isCore: cs.isCore,
            periodsPerWeek: cs.periodsPerWeek,
            usageCount, // NEW: How many times already used
            isAtLimit: usageCount >= cs.periodsPerWeek, // NEW: Whether limit reached
          };
        })
      );

      console.log('✅ Subjects with usage counts:', formattedSubjects.map(s => ({
        code: s.subjectCode,
        used: s.usageCount,
        limit: s.periodsPerWeek,
        atLimit: s.isAtLimit,
      })));

      return NextResponse.json({ 
        subjects: formattedSubjects,
        total: formattedSubjects.length,
      });
    }

    // ========================================
    // FETCH TEACHERS
    // ========================================
    if (type === 'teachers') {
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const search = searchParams.get('search') || '';
      
      const skip = (page - 1) * limit;

      console.log('🔍 [Timetable Helpers] Fetching teachers:', { page, limit, search });

      // Build where clause for search
      const where: any = {
        schoolId,
        status: 'ACTIVE',
      };

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { employeeNumber: { contains: search, mode: 'insensitive' } },
          { teacherCode: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Fetch teachers with pagination
      const [teachers, total] = await Promise.all([
        prisma.staff.findMany({
          where,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            teacherCode: true,
            primaryRole: true,
          },
          orderBy: [
            { firstName: 'asc' },
            { lastName: 'asc' },
          ],
          skip,
          take: limit,
        }),
        prisma.staff.count({ where }),
      ]);

      const formattedTeachers = teachers.map((t) => ({
        id: t.id,
        name: `${t.firstName} ${t.lastName}`,
        employeeNumber: t.employeeNumber,
        teacherCode: t.teacherCode,
        role: t.primaryRole,
      }));

      console.log('📊 [Timetable Helpers] Teachers fetched:', {
        count: formattedTeachers.length,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });

      return NextResponse.json({
        teachers: formattedTeachers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + teachers.length < total,
        },
      });
    }

    // ========================================
    // FETCH STREAMS (for a class)
    // ========================================
    if (type === 'streams') {
      if (!classId || classId === 'null') {
        return NextResponse.json({ 
          streams: [],
          total: 0,
          message: 'classId is required to fetch streams',
        });
      }

      console.log('🔍 [Timetable Helpers] Fetching streams for classId:', classId);

      const streams = await prisma.stream.findMany({
        where: {
          classId,
        },
        select: {
          id: true,
          name: true,
          classId: true,
        },
        orderBy: { name: 'asc' },
      });

      console.log('📊 [Timetable Helpers] Streams fetched:', streams.length);

      return NextResponse.json({
        streams,
        total: streams.length,
      });
    }

    // Invalid type
    return NextResponse.json(
      { error: 'Invalid type. Must be: classes, terms, subjects, teachers, or streams' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[API] Error fetching helper data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch helper data' },
      { status: 500 }
    );
  }
}
