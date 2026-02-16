/**
 * DoS Assessment Plan Approval API
 * Approves an assessment plan by setting all CA entries to SUBMITTED status
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No school context found'
        },
        { status: 400 }
      )
    }

    // Verify DoS role
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    
    // Check if user has DoS role
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        primaryRole: true,
        secondaryRoles: true,
      },
    })

    const isDoS = staff && (
      staff.primaryRole === StaffRole.DOS ||
      ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS)
    )

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Director of Studies access required'
        },
        { status: 403 }
      )
    }

    // Get the sample CA entry to identify the assessment group
    const sampleEntry = await prisma.cAEntry.findUnique({
      where: { id },
      select: {
        name: true,
        type: true,
        subjectId: true,
        termId: true,
        schoolId: true,
      },
    })

    if (!sampleEntry) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Assessment not found'
        },
        { status: 404 }
      )
    }

    // Verify school context
    if (sampleEntry.schoolId !== schoolId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized access'
        },
        { status: 403 }
      )
    }

    // Check if all entries have scores
    const entriesWithoutScores = await prisma.cAEntry.count({
      where: {
        schoolId,
        name: sampleEntry.name,
        type: sampleEntry.type,
        subjectId: sampleEntry.subjectId,
        termId: sampleEntry.termId,
        OR: [
          { rawScore: null },
          { rawScore: 0 },
        ],
      },
    })

    if (entriesWithoutScores > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cannot approve assessment with missing scores',
          details: `${entriesWithoutScores} students do not have scores yet`
        },
        { status: 400 }
      )
    }

    // Update all entries in the group to SUBMITTED status
    const result = await prisma.cAEntry.updateMany({
      where: {
        schoolId,
        name: sampleEntry.name,
        type: sampleEntry.type,
        subjectId: sampleEntry.subjectId,
        termId: sampleEntry.termId,
      },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Assessment approved successfully',
      data: {
        updatedCount: result.count,
      },
    })

  } catch (error) {
    console.error('Error approving assessment:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to approve assessment'
    }, { status: 500 })
  }
}
