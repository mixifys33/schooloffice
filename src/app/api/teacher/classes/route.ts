/**
 * Teacher Classes API Route
 * Requirements: 3.1, 3.2, 3.4 - Return only classes explicitly assigned to the teacher
 * with subject name, class name, and student count
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StudentStatus } from '@/types/enums'

/**
 * Assigned class data for teacher's My Classes section
 * Requirements: 3.1, 3.2 - Display subject name, class name, student count
 */
export interface AssignedClassData {
  id: string
  classId: string
  className: string
  streamName: string | null
  subject: {
    id: string
    name: string
  }
  studentCount: number
  isClassTeacher: boolean
}

/**
 * GET /api/teacher/classes
 * Returns only classes explicitly assigned to the authenticated teacher
 * Requirements: 3.1, 3.2, 3.4 - Enforce teacher assignment validation
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/classes - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      console.log('❌ [API] /api/teacher/classes - No session found')
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to access your classes'
      }, { status: 401 })
    }

    console.log('✅ [API] /api/teacher/classes - Session found for user:', session.user.id)

    // Verify user has TEACHER role
    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      console.log('❌ [API] /api/teacher/classes - Invalid role:', userRole)
      return NextResponse.json(
        { 
          error: 'Access denied. Teacher role required.',
          details: `Current role: ${userRole}. Teacher access required.`
        },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      console.log('❌ [API] /api/teacher/classes - No school context')
      return NextResponse.json(
        { 
          error: 'No school context found',
          details: 'Your account is not linked to a school. Please contact support.'
        },
        { status: 400 }
      )
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Get teacher record for the user
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employmentStatus: true,
        classTeacherForIds: true,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { 
          error: 'No teacher profile linked to this account',
          details: 'Your teacher profile is not set up. Please contact your school administrator.'
        },
        { status: 404 }
      )
    }

    // Get teacher assignments (subject-class combinations)
    const teacherAssignments = await prisma.teacherAssignment.findMany({
      where: { teacherId: teacher.id },
      include: {
        subject: { select: { id: true, name: true } },
        class: { 
          select: { 
            id: true, 
            name: true,
            streams: {
              select: {
                id: true,
                name: true,
              },
            },
          } 
        }
      }
    })

    // Requirements: 3.1, 3.4 - Return only classes explicitly assigned to the teacher
    if (teacherAssignments.length === 0) {
      return NextResponse.json({ classes: [] })
    }

    // Build assigned class data with subject combinations
    // Requirements: 3.2 - Include subject name, class name, student count
    const assignedClasses: AssignedClassData[] = []

    for (const assignment of teacherAssignments) {
      // Get student count for this class
      const studentCount = await prisma.student.count({
        where: {
          classId: assignment.classId,
          status: StudentStatus.ACTIVE,
        },
      })

      // Check if teacher is class teacher for this class
      const isClassTeacher = teacher.classTeacherForIds?.includes(assignment.classId) || false

      assignedClasses.push({
        id: `${assignment.classId}-${assignment.subjectId}`,
        classId: assignment.classId,
        className: assignment.class.name,
        streamName: assignment.class.streams.length > 0 ? assignment.class.streams[0].name : null,
        subject: {
          id: assignment.subject.id,
          name: assignment.subject.name,
        },
        studentCount,
        isClassTeacher,
      })
    }

    console.log('✅ [API] /api/teacher/classes - Successfully returning', assignedClasses.length, 'classes')
    return NextResponse.json({ classes: assignedClasses })
  } catch (error: any) {
    console.error('❌ [API] /api/teacher/classes - Error:', error)
    
    // Enhanced error handling with specific error types
    if (error.code === 'P1001') {
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: 'Unable to connect to the database. Please try again in a moment.'
        },
        { status: 503 }
      )
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { 
          error: 'Teacher profile not found',
          details: 'Your teacher profile is not set up. Please contact your school administrator.'
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch teacher classes',
        details: 'An unexpected error occurred. Please try refreshing the page.'
      },
      { status: 500 }
    )
  }
}
