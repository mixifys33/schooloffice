/**
 * DoS Dashboard Context API Route
 * 
 * Provides critical academic context for the DoS portal:
 * - Current term and academic year status
 * - School academic operations mode
 * - System-wide alerts and permissions
 * - DoS authority level indicators
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

    // Validate DoS role
    if (session.user.role !== 'DOS' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId

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
        status: true,
        settings: true
      }
    })

    // Get user information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        role: true
      }
    })

    // Calculate alerts
    const [
      pendingCurriculumSubjects,
      pendingAssessmentPlans,
      pendingExamResults,
      pendingFinalScores,
      pendingReportCards
    ] = await Promise.all([
      // Curriculum subjects awaiting approval
      prisma.doSCurriculumSubject.count({
        where: {
          schoolId,
          dosApproved: false
        }
      }),
      
      // Assessment plans awaiting approval
      prisma.doSAssessmentPlan.count({
        where: {
          curriculumSubject: {
            schoolId
          },
          dosApproved: false
        }
      }),
      
      // Exam results awaiting approval
      prisma.doSExam.count({
        where: {
          curriculumSubject: {
            schoolId
          },
          dosApproved: false,
          isLocked: false
        }
      }),
      
      // Final scores awaiting approval
      prisma.doSFinalScore.count({
        where: {
          curriculumSubject: {
            schoolId
          },
          dosApproved: false
        }
      }),
      
      // Report cards awaiting approval
      prisma.doSReportCard.count({
        where: {
          schoolId,
          status: 'PENDING_DOS_APPROVAL'
        }
      })
    ])

    // Determine school academic status
    const now = new Date()
    let academicOperations: 'OPEN' | 'EXAM_MODE' | 'REPORTING_MODE' | 'LOCKED' = 'OPEN'
    let dataEntryAllowed = true
    let reportingAllowed = false

    if (currentTerm) {
      const termProgress = (now.getTime() - currentTerm.startDate.getTime()) / 
                          (currentTerm.endDate.getTime() - currentTerm.startDate.getTime())
      
      if (termProgress > 0.8) {
        academicOperations = 'EXAM_MODE'
        dataEntryAllowed = false // Lock CA entry during exams
      } else if (termProgress > 0.9) {
        academicOperations = 'REPORTING_MODE'
        dataEntryAllowed = false
        reportingAllowed = true
      }
    }

    // Check if term is closed
    if (currentTerm && now > currentTerm.endDate) {
      academicOperations = 'LOCKED'
      dataEntryAllowed = false
      reportingAllowed = true
    }

    // Calculate total alerts
    const totalPendingApprovals = pendingCurriculumSubjects + pendingAssessmentPlans + 
                                 pendingExamResults + pendingFinalScores + pendingReportCards
    
    const criticalAlerts = totalPendingApprovals > 10 ? 1 : 0
    const warnings = totalPendingApprovals > 5 ? 1 : 0

    // DoS permissions based on role
    const permissions = {
      canApprove: session.user.role === 'DOS' || session.user.role === 'SUPER_ADMIN',
      canLock: session.user.role === 'DOS' || session.user.role === 'SUPER_ADMIN',
      canOverride: session.user.role === 'SUPER_ADMIN',
      canGenerateReports: session.user.role === 'DOS' || session.user.role === 'SUPER_ADMIN'
    }

    const contextData = {
      dosName: user?.name || 'DoS User',
      schoolName: school?.name || 'School',
      currentTerm: currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.name,
        startDate: currentTerm.startDate.toISOString(),
        endDate: currentTerm.endDate.toISOString(),
        status: now > currentTerm.endDate ? 'CLOSED' : 'ACTIVE'
      } : null,
      academicYear: currentTerm?.academicYear ? {
        id: currentTerm.academicYear.id,
        name: currentTerm.academicYear.name,
        status: currentTerm.academicYear.endDate && now > currentTerm.academicYear.endDate ? 'CLOSED' : 'ACTIVE'
      } : null,
      schoolStatus: {
        academicOperations,
        dataEntryAllowed,
        reportingAllowed,
        lastStatusChange: new Date().toISOString()
      },
      alerts: {
        critical: criticalAlerts,
        warnings: warnings,
        pendingApprovals: totalPendingApprovals
      },
      permissions
    }

    return NextResponse.json({
      success: true,
      context: contextData
    })

  } catch (error) {
    console.error('Error fetching DoS context:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch DoS context',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}