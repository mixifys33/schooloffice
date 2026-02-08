/**
 * SMS Template Sending API
 * Send SMS using the new template system with proper validation and audit
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { smsSendingService } from '@/services/sms-sending.service'
import { SMSTemplateKey } from '@/types/sms-templates'

/**
 * POST /api/sms/send-template
 * Send SMS using template system
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = session.user as { 
      id?: string
      role?: string
      schoolId?: string
    }

    const {
      templateType,
      targetType,
      targetOptions = {}
    } = await request.json()

    if (!templateType) {
      return NextResponse.json(
        { error: 'Template type is required' },
        { status: 400 }
      )
    }

    if (!user.schoolId) {
      return NextResponse.json(
        { error: 'School ID not found in session' },
        { status: 400 }
      )
    }

    let result

    switch (templateType) {
      case 'FEES_BALANCE':
        result = await smsSendingService.sendFeesReminders(
          user.schoolId,
          user.id || '',
          user.role || '',
          {
            minimumBalance: targetOptions.minimumBalance,
            classIds: targetOptions.classIds,
            studentIds: targetOptions.studentIds
          }
        )
        break

      case 'ATTENDANCE_ALERT':
        result = await smsSendingService.sendAttendanceAlerts(
          user.schoolId,
          user.id || '',
          user.role || '',
          {
            date: targetOptions.date ? new Date(targetOptions.date) : undefined,
            classIds: targetOptions.classIds
          }
        )
        break

      case 'REPORT_READY':
        if (!targetOptions.termId) {
          return NextResponse.json(
            { error: 'Term ID is required for report notifications' },
            { status: 400 }
          )
        }
        result = await smsSendingService.sendReportReadyNotifications(
          user.schoolId,
          targetOptions.termId,
          user.id || '',
          user.role || '',
          {
            classIds: targetOptions.classIds,
            studentIds: targetOptions.studentIds
          }
        )
        break

      default:
        return NextResponse.json(
          { error: 'Unsupported template type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: result.success,
      totalRecipients: result.totalRecipients,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      totalCost: result.totalCost,
      errors: result.errors
    })

  } catch (error) {
    console.error('Error sending SMS with template:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to send SMS'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}