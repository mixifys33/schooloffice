/**
 * Communication Hub Scheduled Reports API Route
 * Requirements: 8.7
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hubReportService } from '@/services/hub-report.service'
import { ScheduledReportConfig, HubReportType, ReportFrequency, MessageChannel } from '@/types/communication-hub'

/**
 * GET /api/admin/communication-hub/reports/scheduled
 * Fetches all scheduled reports
 * Only accessible by Super Admin role
 * Requirements: 8.7
 */
export async function GET(request: NextRequest) {
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

    // Get scheduled reports
    const scheduledReports = await hubReportService.getScheduledReports()

    return NextResponse.json({ scheduledReports })
  } catch (error) {
    console.error('Error fetching scheduled reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scheduled reports' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/communication-hub/reports/scheduled
 * Creates a new scheduled report
 * Only accessible by Super Admin role
 * Requirements: 8.7
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
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Report name is required' 
      }, { status: 400 })
    }

    if (!body.reportType) {
      return NextResponse.json({ 
        error: 'Report type is required' 
      }, { status: 400 })
    }

    if (!Object.values(HubReportType).includes(body.reportType)) {
      return NextResponse.json({ 
        error: 'Invalid report type. Must be USAGE, DELIVERY, or COST' 
      }, { status: 400 })
    }

    if (!body.frequency) {
      return NextResponse.json({ 
        error: 'Frequency is required' 
      }, { status: 400 })
    }

    if (!Object.values(ReportFrequency).includes(body.frequency)) {
      return NextResponse.json({ 
        error: 'Invalid frequency. Must be DAILY, WEEKLY, or MONTHLY' 
      }, { status: 400 })
    }

    if (!body.recipients || !Array.isArray(body.recipients) || body.recipients.length === 0) {
      return NextResponse.json({ 
        error: 'At least one recipient email is required' 
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalidEmails = body.recipients.filter((email: string) => !emailRegex.test(email))
    if (invalidEmails.length > 0) {
      return NextResponse.json({ 
        error: `Invalid email addresses: ${invalidEmails.join(', ')}` 
      }, { status: 400 })
    }

    // Validate filters if provided
    if (body.filters) {
      if (body.filters.channels) {
        if (!Array.isArray(body.filters.channels)) {
          return NextResponse.json({ 
            error: 'filters.channels must be an array' 
          }, { status: 400 })
        }

        const validChannels = Object.values(MessageChannel)
        const invalidChannels = body.filters.channels.filter(
          (channel: string) => !validChannels.includes(channel as MessageChannel)
        )

        if (invalidChannels.length > 0) {
          return NextResponse.json({ 
            error: `Invalid channels in filters: ${invalidChannels.join(', ')}` 
          }, { status: 400 })
        }
      }

      if (body.filters.schoolIds) {
        if (!Array.isArray(body.filters.schoolIds)) {
          return NextResponse.json({ 
            error: 'filters.schoolIds must be an array' 
          }, { status: 400 })
        }

        const invalidIds = body.filters.schoolIds.filter(
          (id: any) => typeof id !== 'string' || id.trim().length === 0
        )

        if (invalidIds.length > 0) {
          return NextResponse.json({ 
            error: 'All school IDs in filters must be non-empty strings' 
          }, { status: 400 })
        }
      }
    }

    // Build scheduled report config
    const config: ScheduledReportConfig = {
      name: body.name.trim(),
      reportType: body.reportType,
      frequency: body.frequency,
      recipients: body.recipients,
      filters: body.filters || {},
      isActive: body.isActive !== undefined ? body.isActive : true,
    }

    // Schedule the report
    await hubReportService.scheduleReport(config)

    return NextResponse.json({ 
      success: true, 
      message: 'Scheduled report created successfully' 
    })
  } catch (error) {
    console.error('Error creating scheduled report:', error)
    return NextResponse.json(
      { error: 'Failed to create scheduled report' },
      { status: 500 }
    )
  }
}