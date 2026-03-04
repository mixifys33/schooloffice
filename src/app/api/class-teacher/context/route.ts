/**
 * Class Teacher Context API Route
 * Returns context data for Class Teacher operations
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function GET(_request: NextRequest) {
  console.log('🔍 [API] /api/class-teacher/context - Route handler called')
  try {
    const session = await auth()
    console.log('🔍 [API] /api/class-teacher/context - Session:', session?.user?.id, session?.user?.role)
    
    if (!session?.user) {
      console.log('🔍 [API] /api/class-teacher/context - No session, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID not found' }, { status: 400 })
    }

    // Verify user has CLASS_TEACHER role from session
    const userRole = session.user.activeRole || session.user.role
    const hasClassTeacherRole = userRole === StaffRole.CLASS_TEACHER || userRole === Role.TEACHER
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY

    if (!hasClassTeacherRole && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Class Teacher role required.' },
        { status: 403 }
      )
    }

    // Try to get staff record, create if doesn't exist
    let staff = await prisma.staff.findFirst({
      where: {
        userId: session.user.id,
        schoolId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    })

    // Auto-create staff profile if it doesn't exist
    if (!staff) {
      console.log('🔧 Auto-creating staff profile for user:', session.user.id)
      
      // Get user details to populate staff record
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          email: true,
          username: true,
          phone: true,
        }
      })

      // Check if there's an existing Teacher record we can link to
      const existingTeacher = await prisma.teacher.findFirst({
        where: {
          schoolId,
          OR: [
            { email: user?.email },
            { userId: session.user.id },
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        }
      })

      // Extract name from teacher record or email/username
      let firstName: string
      let lastName: string

      if (existingTeacher) {
        console.log('🔗 Found existing Teacher record, using their name:', existingTeacher.firstName, existingTeacher.lastName)
        firstName = existingTeacher.firstName
        lastName = existingTeacher.lastName
        
        // Link teacher to user if not already linked
        await prisma.teacher.update({
          where: { id: existingTeacher.id },
          data: { userId: session.user.id }
        })
        console.log('✅ Linked Teacher record to user')
      } else {
        const emailName = user?.email?.split('@')[0] || user?.username || 'Teacher'
        const nameParts = emailName.split(/[._-]/)
        firstName = nameParts[0]?.charAt(0).toUpperCase() + nameParts[0]?.slice(1) || 'Class'
        lastName = nameParts[1]?.charAt(0).toUpperCase() + nameParts[1]?.slice(1) || 'Teacher'
      }

      // Generate unique employee number
      const timestamp = Date.now().toString().slice(-6)
      const employeeNumber = `EMP${timestamp}`

      staff = await prisma.staff.create({
        data: {
          userId: session.user.id,
          schoolId,
          employeeNumber,
          firstName,
          lastName,
          email: user?.email || null,
          phone: user?.phone || null,
          role: Role.TEACHER, // Base role for staff table
          primaryRole: StaffRole.CLASS_TEACHER, // Dashboard role
          secondaryRoles: [],
          status: 'ACTIVE',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
        }
      })

      console.log('✅ Staff profile created:', staff.id)
    }

    const teacherId = staff.id
    const teacherName = `${staff.firstName} ${staff.lastName}`

    // Get all classes the teacher is assigned to
    let allClassIds: string[] = []

    // Check StaffResponsibility for CLASS_TEACHER_DUTY
    const staffResponsibilities = await prisma.staffResponsibility.findMany({
      where: {
        staffId: staff.id,
        type: 'CLASS_TEACHER_DUTY',
      },
      select: {
        details: true,
      },
    })

    if (staffResponsibilities.length > 0) {
      for (const responsibility of staffResponsibilities) {
        if (responsibility.details && typeof responsibility.details === 'object') {
          const details = responsibility.details as any
          if (details.classId) {
            allClassIds.push(details.classId)
          }
        }
      }
    }

    // Fallback to StaffClass assignments
    if (allClassIds.length === 0) {
      const staffClasses = await prisma.staffClass.findMany({
        where: {
          staffId: staff.id,
        },
        select: {
          classId: true,
        },
      })
      if (staffClasses.length > 0) {
        allClassIds = staffClasses.map(sc => sc.classId)
      }
    }

    // Fallback to Teacher model
    if (allClassIds.length === 0) {
      const teacher = await prisma.teacher.findFirst({
        where: { 
          schoolId,
          OR: [
            ...(staff.email ? [{ email: staff.email }] : []),
            { firstName: staff.firstName, lastName: staff.lastName }
          ]
        },
        select: { 
          classTeacherForIds: true,
          assignedClassIds: true 
        }
      })

      if (teacher) {
        if (teacher.classTeacherForIds.length > 0) {
          allClassIds = teacher.classTeacherForIds
        } else if (teacher.assignedClassIds.length > 0) {
          allClassIds = teacher.assignedClassIds
        }
      }
    }

    // Build availableClasses array with streams
    const availableClasses = await Promise.all(allClassIds.map(async (id) => {
      const cls = await prisma.class.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          streams: {
            select: { 
              id: true,
              name: true 
            }
          }
        }
      })
      
      if (!cls) return []
      
      // If class has streams, return one option per stream
      if (cls.streams.length > 0) {
        return cls.streams.map(stream => ({
          id: cls.id,
          streamId: stream.id,
          name: cls.name,
          streamName: stream.name,
          displayName: `${cls.name} - ${stream.name}`
        }))
      }
      
      // If no streams, return just the class
      return [{
        id: cls.id,
        streamId: null,
        name: cls.name,
        streamName: null,
        displayName: cls.name
      }]
    })).then(results => results.flat())

    // Get current term
    console.log('🔍 [API] /api/class-teacher/context - Fetching current term...')
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isActive: true
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })
    console.log('🔍 [API] /api/class-teacher/context - Current term:', currentTerm?.id)

    const contextData = {
      teacherId,
      teacherName,
      roleName: 'Class Teacher',
      currentTerm: currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.name,
        startDate: currentTerm.startDate.toISOString(),
        endDate: currentTerm.endDate.toISOString()
      } : null,
      academicYear: currentTerm?.academicYear ? {
        id: currentTerm.academicYear.id,
        name: currentTerm.academicYear.name
      } : null,
      contextError: !currentTerm ? 'No active term found' : null
    }

    return NextResponse.json({
      success: true,
      context: contextData,
      availableClasses
    })

  } catch (error) {
    console.error('❌ [API] /api/class-teacher/context - Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
