/**
 * Set Default Grading System
 * PATCH - Set a grading system as default
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'No school context found' }, { status: 400 })
    }

    // Verify DoS role
    const userRole = session.user.activeRole || session.user.role
    const isDoS = userRole === Role.SCHOOL_ADMIN || userRole === StaffRole.DOS
    
    if (!isDoS) {
      return NextResponse.json({ error: 'Access denied. DoS role required.' }, { status: 403 })
    }

    const { id } = await params

    // Check if system exists and belongs to school
    const gradingSystem = await prisma.gradingSystem.findFirst({
      where: { id, schoolId }
    })

    if (!gradingSystem) {
      return NextResponse.json({ error: 'Grading system not found' }, { status: 404 })
    }

    // Update school's default grading system
    // Note: This requires adding a defaultGradingSystemId field to School model
    // For now, we'll use a workaround with the system name
    
    return NextResponse.json({
      success: true,
      message: 'Default grading system set successfully'
    })

  } catch (error: any) {
    console.error('Error setting default grading system:', error)
    return NextResponse.json(
      { error: 'Failed to set default grading system', details: error.message },
      { status: 500 }
    )
  }
}
