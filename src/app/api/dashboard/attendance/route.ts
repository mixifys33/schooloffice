/**
 * Real-Time Attendance Dashboard API Route
 * Requirements: 39.1, 39.2, 39.3, 39.4, 39.5
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { dashboardService } from '@/services/dashboard.service'

/**
 * GET /api/dashboard/attendance
 * Fetches real-time attendance dashboard data for a school
 * Query params:
 *   - schoolId: string (required)
 *   - date: string (optional, ISO date format, defaults to today)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const dateParam = searchParams.get('date')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      )
    }

    // Parse date if provided
    const date = dateParam ? new Date(dateParam) : undefined

    // Fetch attendance dashboard data
    const dashboardData = await dashboardService.getRealTimeAttendanceDashboard(
      schoolId,
      date
    )

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Error fetching attendance dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance dashboard data' },
      { status: 500 }
    )
  }
}
