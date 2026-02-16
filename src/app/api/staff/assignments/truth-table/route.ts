/**
 * Staff Assignments Truth Table API
 * Provides DoS-focused view of teaching assignments with conflict detection
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

/**
 * GET /api/staff/assignments/truth-table
 * Returns teaching assignments organized by teacher and by class
 * with conflict detection and coverage analysis
 * Requires DoS, SCHOOL_ADMIN, DEPUTY, or SUPER_ADMIN permission
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.activeRole || session.user.role
    const schoolId = session.user.schoolId

    if (!schoolId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'School context required' },
        { status: 400 }
      )
    }

    // Check if user has DoS access
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY || userRole === Role.SUPER_ADMIN
    
    let isDoS = false
    if (!isAdmin) {
      const staff = await prisma.staff.findFirst({
        where: { 
          schoolId, 
          userId: session.user.id,
          status: 'ACTIVE' // Use status field instead of isActive
        },
        select: { primaryRole: true, secondaryRoles: true },
      })
      
      isDoS = staff && (
        staff.primaryRole === StaffRole.DOS ||
        ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS)
      )
    }

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Director of Studies access required' },
        { status: 403 }
      )
    }

    // Get all staff subject assignments
    const staffSubjects = await prisma.staffSubject.findMany({
      where: {
        staff: { schoolId },
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    // Get all class subjects to map subjects to classes
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        class: { schoolId },
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    // Build teacher-centric view
    const teacherMap = new Map<string, {
      teacherId: string
      teacherName: string
      employeeNumber: string
      assignments: Map<string, {
        classId: string
        className: string
        subjects: {
          subjectId: string
          subjectName: string
          subjectCode: string
          isPrimary: boolean
          isActive: boolean
        }[]
      }>
    }>()

    // Build class-centric view with conflict detection
    const classMap = new Map<string, {
      classId: string
      className: string
      level: number
      subjects: Map<string, {
        subjectId: string
        subjectName: string
        subjectCode: string
        primaryTeacher: {
          id: string
          name: string
          employeeNumber: string
        } | null
        coTeacher?: {
          id: string
          name: string
          employeeNumber: string
        }
        isActive: boolean
        hasConflict: boolean
        teacherCount: number
      }>
    }>()

    // Initialize class map
    for (const cs of classSubjects) {
      if (!classMap.has(cs.classId)) {
        classMap.set(cs.classId, {
          classId: cs.classId,
          className: cs.class.name,
          level: cs.class.level,
          subjects: new Map(),
        })
      }
      
      const classData = classMap.get(cs.classId)!
      classData.subjects.set(cs.subjectId, {
        subjectId: cs.subjectId,
        subjectName: cs.subject.name,
        subjectCode: cs.subject.code,
        primaryTeacher: null,
        isActive: true,
        hasConflict: false,
        teacherCount: 0,
      })
    }

    // Process staff subject assignments
    for (const ss of staffSubjects) {
      const teacherName = `${ss.staff.firstName} ${ss.staff.lastName}`
      
      // Update teacher map
      if (!teacherMap.has(ss.staffId)) {
        teacherMap.set(ss.staffId, {
          teacherId: ss.staffId,
          teacherName,
          employeeNumber: ss.staff.employeeNumber,
          assignments: new Map(),
        })
      }
      
      const teacher = teacherMap.get(ss.staffId)!
      
      // Find all classes that have this subject
      const classesWithSubject = classSubjects.filter(cs => cs.subjectId === ss.subjectId)
      
      for (const cs of classesWithSubject) {
        if (!teacher.assignments.has(cs.classId)) {
          teacher.assignments.set(cs.classId, {
            classId: cs.classId,
            className: cs.class.name,
            subjects: [],
          })
        }
        
        teacher.assignments.get(cs.classId)!.subjects.push({
          subjectId: ss.subjectId,
          subjectName: ss.subject.name,
          subjectCode: ss.subject.code,
          isPrimary: true, // All StaffSubject assignments are primary
          isActive: true,
        })
        
        // Update class map with teacher assignment
        const classData = classMap.get(cs.classId)
        if (classData && classData.subjects.has(ss.subjectId)) {
          const subjectData = classData.subjects.get(ss.subjectId)!
          subjectData.teacherCount++
          
          if (!subjectData.primaryTeacher) {
            subjectData.primaryTeacher = {
              id: ss.staffId,
              name: teacherName,
              employeeNumber: ss.staff.employeeNumber,
            }
          } else {
            // Conflict detected - multiple teachers for same subject
            subjectData.hasConflict = true
            subjectData.coTeacher = {
              id: ss.staffId,
              name: teacherName,
              employeeNumber: ss.staff.employeeNumber,
            }
          }
        }
      }
    }

    // Convert maps to arrays
    const teacherAssignments = Array.from(teacherMap.values()).map(teacher => ({
      teacherId: teacher.teacherId,
      teacherName: teacher.teacherName,
      employeeNumber: teacher.employeeNumber,
      assignments: Array.from(teacher.assignments.values()),
    }))

    const classAssignments = Array.from(classMap.values()).map(classData => ({
      classId: classData.classId,
      className: classData.className,
      level: classData.level,
      subjects: Array.from(classData.subjects.values()),
    }))

    // Calculate stats
    const totalTeachers = teacherMap.size
    const totalClasses = classMap.size
    let totalSubjects = 0
    let assignedSubjects = 0
    let unassignedSubjects = 0
    let conflictCount = 0

    for (const classData of classMap.values()) {
      for (const subject of classData.subjects.values()) {
        totalSubjects++
        if (subject.primaryTeacher) {
          assignedSubjects++
        } else {
          unassignedSubjects++
        }
        if (subject.hasConflict) {
          conflictCount++
        }
      }
    }

    return NextResponse.json({
      teacherAssignments,
      classAssignments,
      stats: {
        totalTeachers,
        totalClasses,
        totalSubjects,
        assignedSubjects,
        unassignedSubjects,
        conflictCount,
      },
    })
  } catch (error) {
    console.error('Error fetching assignments truth table:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
