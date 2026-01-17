/**
 * Communication Hub Usage Report API Route
 * Requirements: 8.1, 8.2
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hubReportService } from '@/services/hub-report.service'
import { ReportParams, MessageChannel } from '@/types/communication-hub'

/**
 * POST /api/admin/communication-hub/reports/usage
 * Generates a usage report for daily/weekly/monthly periods
 * Only accessible by Super Admin role
 * Requirements: 8.1, 8.2
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden - Super Admin access required' 
      }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()

    // Validate required fields
    if (!body.startDate || !body.endDate) {
      return NextResponse.json({ 
        error: 'startDate and endDate are required' 
      }, { status: 400 })
    }

    // Parse and validate dates
    let startDate: Date
    let endDate: Date

    try {
      startDate = new Date(body.startDate)
      endDate = new Date(body.endDate)
    } catch {
      return NextResponse.json({ 
        error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)' 
      }, { status: 400 })
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ 
        error: 'Invalid date values' 
      }, { status: 400 })
    }

    if (startDate >= endDate) {
      return NextResponse.json({ 
        error: 'startDate must be before endDate' 
      }, { status: 400 })
    }

    // Validate period if provided
    const validPeriods = ['daily', 'weekly', 'monthly']
    if (body.period && !validPeriods.includes(body.period)) {
      return NextResponse.json({ 
        error: 'Invalid period. Must be daily, weekly, or monthly' 
      }, { status: 400 })
    }

    // Validate channels if provided
    if (body.channels) {
      if (!Array.isArray(body.channels)) {
        return NextResponse.json({ 
          error: 'channels must be an array' 
        }, { status: 400 })
      }

      const validChannels = Object.values(MessageChannel)
      const invalidChannels = body.channels.filter(
        (channel: string) => !validChannels.includes(channel as MessageChannel)
      )

      if (invalidChannels.length > 0) {
        return NextResponse.json({ 
          error: `Invalid channels: ${invalidChannels.join(', ')}. Must be SMS, WHATSAPP, or EMAIL` 
        }, { status: 400 })
      }
    }

    // Validate schoolIds if provided
    if (body.schoolIds) {
      if (!Array.isArray(body.schoolIds)) {
        return NextResponse.json({ 
          error: 'schoolIds must be an array' 
        }, { status: 400 })
      }

      const invalidIds = body.schoolIds.filter(
        (id: any) => typeof id !== 'string' || id.trim().length === 0
      )

      if (invalidIds.length > 0) {
        return NextResponse.json({ 
          error: 'All school IDs must be non-empty strings' 
        }, { status: 400 })
      }
    }

    // Build report parameters
    const params: ReportParams = {
      period: body.period || 'daily',
      startDate,
      endDate,
      schoolIds: body.schoolIds,
      channels: body.channels,
    }

    // Generate usage report
    const report = await hubReportService.generateUsageReport(params)

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error generating usage report:', error)
    return NextResponse.json(
      { error: 'Failed to generate usage report' },
      { status: 500 }
    )
  }
}