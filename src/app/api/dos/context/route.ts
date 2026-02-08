/**
 * DOS Context API Route
 * Returns context data for Director of Studies operations
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

    // Check if user has DoS role
    const userRoles = Array.isArray(session.user.roles) ? session.user.roles : [session.user.role]
    const hasDoSRole = userRoles.includes('DOS') || userRoles.includes('SCHOOL_ADMIN')

    if (!hasDoSRole) {
      return NextResponse.json({ error: 'Forbidden - DoS access required' }, { status: 403 })
    }

    const schoolId = session.user.schoolId
    
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID not found' }, { status: 400 })
    }

    // Fetch current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isActive: true
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      select: {
        id: true,
        name: true,
        academicYear: true,
        startDate: true,
        endDate: true
      }
    })

    // Get school status
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { 
        status: true,
        schoolType: true
      }
    })

    // Determine school status based on current date and term
    let schoolStatus: 'OPEN' | 'EXAM_PERIOD' | 'REPORTING' | 'CLOSED' = 'OPEN'
    
    if (school?.status === 'SUSPENDED' || school?.status === 'INACTIVE') {
      schoolStatus = 'CLOSED'
    } else if (currentTerm) {
      const now = new Date()
      const termEnd = new Date(currentTerm.endDate)
      const daysToEnd = Math.ceil((termEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysToEnd <= 14 && daysToEnd > 0) {
        schoolStatus = 'EXAM_PERIOD'
      } else if (daysToEnd <= 0) {
        schoolStatus = 'REPORTING'
      }
    }

    // DoS permissions (all true for now, can be made dynamic later)
    const permissions = {
      canApproveCurriculum: true,
      canLockAssessments: true,
      canApproveExams: true,
      canGenerateReports: true,
      canMakePromotionDecisions: true,
    }

    return NextResponse.json({
      currentTerm,
      schoolStatus,
      permissions
    })

  } catch (error) {
    console.error('Error fetching DoS context:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}