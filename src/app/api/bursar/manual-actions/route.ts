/**
 * Bursar Manual Actions API
 * Handle manual controls for fee reminders: pause, resume, send manual
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is bursar or admin
    if (!['ACCOUNTANT', 'SCHOOL_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { action, studentId, reason, guardianId, customMessage, termId } = body

    if (!action || !studentId) {
      return NextResponse.json({ error: 'Action and studentId are required' }, { status: 400 })
    }

    // Import the service function
    const { enhancedBursarService } = await import('@/services/enhanced-bursar.service')

    let result: { success: boolean; error?: string }

    switch (action) {
      case 'pause':
        if (!reason) {
          return NextResponse.json({ error: 'Reason is required to pause reminders' }, { status: 400 })
        }
        if (!termId) {
          return NextResponse.json({ error: 'Term ID is required to pause reminders' }, { status: 400 })
        }
        result = await enhancedBursarService.pauseRemindersForStudent(
          session.user.schoolId,
          studentId,
          termId,
          reason,
          session.user.id
        )
        break

      case 'resume':
        if (!termId) {
          return NextResponse.json({ error: 'Term ID is required to resume reminders' }, { status: 400 })
        }
        result = await enhancedBursarService.resumeRemindersForStudent(
          session.user.schoolId,
          studentId,
          termId,
          session.user.id
        )
        break

      case 'sendManual':
        if (!guardianId || !termId) {
          return NextResponse.json({ error: 'Guardian ID and Term ID are required to send manual reminder' }, { status: 400 })
        }
        result = await enhancedBursarService.sendManualFeeReminder({
          schoolId: session.user.schoolId,
          studentId,
          guardianId,
          termId,
          customMessage,
          senderId: session.user.id
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Action ${action} completed successfully`
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Action failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in manual actions:', error)
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    )
  }
}