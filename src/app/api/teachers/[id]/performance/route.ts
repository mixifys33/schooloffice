/**
 * Teacher Performance Metrics API Route
 * Requirements: 6.1-6.7
 * 
 * Implements performance metrics retrieval for teachers:
 * - GET: Retrieve performance data with role-based access control
 * 
 * Core principle: Performance data is auto-generated and immutable.
 * Only SCHOOL_ADMIN, HEAD_TEACHER, and DIRECTOR_OF_STUDIES can view.
 * Teachers cannot edit their own performance data.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { 
  teacherPerformanceService,
  PerformanceAccessDeniedError,
} from '@/services/teacher-performance.service'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'
import { canViewTeacherPerformance } from '@/lib/rbac'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET: Retrieve performance metrics for a teacher
 * Requirements 6.6, 6.7: Role-based access control, read-only data
 * 
 * Query params:
 * - startDate: Optional start date for the period (ISO string)
 * - endDate: Optional end date for the period (ISO string)
 * - period: Optional preset period ('current', 'lastMonth', 'lastQuarter')
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as string
    const userId = session.user.id as string

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Check authorization using RBAC - Requirement 6.6
    if (!canViewTeacherPerformance(userRole)) {
      await auditService.log({
        schoolId,
        userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF_PERFORMANCE,
        newValue: {
          attemptedAction: 'view_teacher_performance',
          userRole,
          reason: 'Role not authorized to view performance data',
        },
      })

      return NextResponse.json(
        { 
          error: 'Forbidden', 
          message: 'Only SCHOOL_ADMIN, HEAD_TEACHER, and DIRECTOR_OF_STUDIES can view performance data' 
        },
        { status: 403 }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    
    // Parse period parameters
    let period: { start: Date; end: Date }
    
    const presetPeriod = searchParams.get('period')
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    if (presetPeriod) {
      period = getPresetPeriod(presetPeriod)
    } else if (startDateStr && endDateStr) {
      const startDate = new Date(startDateStr)
      const endDate = new Date(endDateStr)
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use ISO date strings.' },
          { status: 400 }
        )
      }
      
      if (startDate > endDate) {
        return NextResponse.json(
          { error: 'Start date must be before end date' },
          { status: 400 }
        )
      }
      
      period = { start: startDate, end: endDate }
    } else {
      // Default to current month
      period = getPresetPeriod('current')
    }

    const metrics = await teacherPerformanceService.getMetrics(
      id,
      schoolId,
      period,
      userId,
      userRole
    )

    return NextResponse.json({
      teacherId: id,
      period: {
        start: period.start.toISOString(),
        end: period.end.toISOString(),
      },
      metrics,
      // Requirement 6.7: Explicitly state data is read-only
      _meta: {
        readOnly: true,
        message: 'Performance data is auto-generated and cannot be modified',
      },
    })
  } catch (error) {
    if (error instanceof PerformanceAccessDeniedError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }

    console.error('Error fetching teacher performance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch performance metrics' },
      { status: 500 }
    )
  }
}

/**
 * Get preset period boundaries
 */
function getPresetPeriod(preset: string): { start: Date; end: Date } {
  const now = new Date()
  
  switch (preset) {
    case 'current':
      // Current month
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      }
    
    case 'lastMonth':
      // Previous month
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      }
    
    case 'lastQuarter':
      // Last 3 months
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 3, 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      }
    
    case 'yearToDate':
      // From start of year to now
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      }
    
    default:
      // Default to current month
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      }
  }
}
