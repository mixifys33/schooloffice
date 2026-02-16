/**
 * DoS Context API Route
 * 
 * Provides critical academic context for the DoS portal:
 * - Current term and academic year status
 * - School academic operations mode
 * - DoS permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId;
    
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    // Validate DoS access - check both user role and staff role
    const userRole = session.user.activeRole || session.user.role;
    const isAdmin = userRole === 'SCHOOL_ADMIN' || userRole === 'DEPUTY' || userRole === 'SUPER_ADMIN';
    
    let isDoS = userRole === 'DOS';
    
    // If not admin and not DoS user role, check staff role
    if (!isAdmin && !isDoS) {
      const staffCheck = await prisma.staff.findFirst({
        where: { 
          schoolId,
          userId: session.user.id 
        },
        select: { 
          primaryRole: true,
          secondaryRoles: true
        }
      });

      isDoS = staffCheck && (
        staffCheck.primaryRole === 'DOS' ||
        ((staffCheck.secondaryRoles as string[]) || []).includes('DOS')
      );
    }

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      )
    }

    // Get current term and academic year
    const currentTerm = await prisma.term.findFirst({
      where: {
        schoolId,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        academicYear: true
      }
    })

    // Get school information
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true,
        isActive: true
      }
    })

    // Determine school status
    const now = new Date()
    let schoolStatus: 'OPEN' | 'EXAM_PERIOD' | 'REPORTING' | 'CLOSED' = 'OPEN'

    if (currentTerm) {
      const termProgress = (now.getTime() - currentTerm.startDate.getTime()) / 
                          (currentTerm.endDate.getTime() - currentTerm.startDate.getTime())
      
      if (termProgress > 0.9) {
        schoolStatus = 'REPORTING'
      } else if (termProgress > 0.8) {
        schoolStatus = 'EXAM_PERIOD'
      }
    }

    // Check if term is closed
    if (currentTerm && now > currentTerm.endDate) {
      schoolStatus = 'CLOSED'
    }

    // DoS permissions based on role
    const permissions = {
      canApproveCurriculum: isDoS || isAdmin,
      canLockAssessments: isDoS || isAdmin,
      canApproveExams: isDoS || isAdmin,
      canGenerateReports: isDoS || isAdmin,
      canMakePromotionDecisions: isDoS || isAdmin
    }

    return NextResponse.json({
      currentTerm: currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.name,
        academicYear: currentTerm.academicYear.name,
        startDate: currentTerm.startDate.toISOString(),
        endDate: currentTerm.endDate.toISOString()
      } : null,
      academicYear: currentTerm?.academicYear ? {
        id: currentTerm.academicYear.id,
        name: currentTerm.academicYear.name,
        startDate: currentTerm.academicYear.startDate.toISOString(),
        endDate: currentTerm.academicYear.endDate.toISOString(),
        isCurrent: currentTerm.academicYear.isCurrent
      } : null,
      schoolStatus,
      permissions
    })

  } catch (error) {
    console.error('Error fetching DoS context:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch DoS context',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
