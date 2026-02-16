/**
 * Generate Report API
 * POST - Generate CA-Only, Exam-Only, or Final reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Role, StaffRole } from '@/types/enums'
import { reportGenerationService } from '@/services/report-generation.service'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'No school context found' }, { status: 400 })
    }

    // Get request body
    const body = await request.json()
    const { classId, subjectId, termId, reportType, studentIds } = body

    // Validate required fields
    if (!classId || !termId || !reportType) {
      return NextResponse.json(
        { error: 'Missing required fields: classId, termId, reportType' },
        { status: 400 }
      )
    }

    // Validate report type
    if (!['ca-only', 'exam-only', 'final'].includes(reportType)) {
      return NextResponse.json(
        { error: 'Invalid report type. Must be: ca-only, exam-only, or final' },
        { status: 400 }
      )
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
        primaryRole: true,
        secondaryRoles: true,
      },
    })

    if (!staff) {
      return NextResponse.json({ error: 'No staff profile found' }, { status: 404 })
    }

    // Verify user has appropriate role
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    const isClassTeacher = userRole === Role.TEACHER || 
                           staff.primaryRole === StaffRole.CLASS_TEACHER ||
                           (staff.secondaryRoles as string[] || []).includes(StaffRole.CLASS_TEACHER)
    
    if (!isClassTeacher && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Class teacher role required.' },
        { status: 403 }
      )
    }

    // Generate reports based on type
    let reports: any[]

    if (reportType === 'ca-only') {
      if (!subjectId) {
        return NextResponse.json(
          { error: 'subjectId required for CA-only reports' },
          { status: 400 }
        )
      }

      reports = await reportGenerationService.generateCAOnlyReport({
        classId,
        subjectId,
        termId,
        schoolId,
        teacherId: staff.id,
        studentIds,
      })
    } else if (reportType === 'exam-only') {
      if (!subjectId) {
        return NextResponse.json(
          { error: 'subjectId required for Exam-only reports' },
          { status: 400 }
        )
      }

      reports = await reportGenerationService.generateExamOnlyReport({
        classId,
        subjectId,
        termId,
        schoolId,
        teacherId: staff.id,
        studentIds,
      })
    } else {
      // Final report
      reports = await reportGenerationService.generateFinalReport(
        classId,
        termId,
        schoolId,
        staff.id,
        studentIds
      )
    }

    return NextResponse.json({
      success: true,
      reportType,
      studentCount: reports.length,
      generatedAt: new Date().toISOString(),
      reports,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/reports/generate - POST - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to generate reports', details: error.message },
      { status: 500 }
    )
  }
}
