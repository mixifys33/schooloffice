/**
 * Class Teacher Context API Route
 * Returns context data for Class Teacher operations
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function GET(_request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID not found' }, { status: 400 })
    }

    // Get staff record for the user
    const staff = await prisma.staff.findFirst({
      where: {
        userId: session.user.id,
        schoolId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        primaryRole: true,
        secondaryRoles: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'No staff profile linked to this account' },
        { status: 404 }
      )
    }

    // Verify user has CLASS_TEACHER role
    const hasClassTeacherRole =
      staff.primaryRole === StaffRole.CLASS_TEACHER ||
      (staff.secondaryRoles as string[] || []).includes(StaffRole.CLASS_TEACHER)

    // Allow SCHOOL_ADMIN and DEPUTY to access as well
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY

    if (!hasClassTeacherRole && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Class Teacher role required.' },
        { status: 403 }
      )
    }

    // Get current term
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

    const contextData = {
      teacherId: staff.id,
      teacherName: `${staff.firstName} ${staff.lastName}`,
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
      context: contextData
    })

  } catch (error) {
    console.error('Error fetching Class Teacher context:', error)
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
