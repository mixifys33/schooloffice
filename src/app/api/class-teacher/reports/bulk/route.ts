/**
 * Bulk Report Generation API
 * POST - Start bulk report generation
 * GET - Check bulk generation status
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Role, StaffRole } from '@/types/enums'
import { reportBulkService } from '@/services/report-bulk.service'
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
    const { classId, termId, reportType, subjectId } = body

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

    // Start bulk generation
    const jobId = await reportBulkService.startBulkGeneration(
      classId,
      termId,
      reportType,
      schoolId,
      staff.id,
      subjectId
    )

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Bulk generation started',
    })

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/reports/bulk - POST - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to start bulk generation', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get job ID from query params
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 })
    }

    // Get job status
    const job = reportBulkService.getJobStatus(jobId)

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      totalStudents: job.totalStudents,
      processedStudents: job.processedStudents,
      reportCount: job.reports.length,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/reports/bulk - GET - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to get job status', details: error.message },
      { status: 500 }
    )
  }
}
