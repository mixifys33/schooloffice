/**
 * SMS Templates Reset API Route
 * Reset custom templates to default values
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { MessageChannel } from '@/types/enums'

/**
 * POST /api/sms/templates/reset
 * Reset a template to its default value
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID not found in session' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { type } = body

    if (!type) {
      return NextResponse.json(
        { error: 'Template type is required' },
        { status: 400 }
      )
    }

    // Delete the custom template to revert to default
    await prisma.messageTemplate.deleteMany({
      where: {
        schoolId,
        type,
        channel: MessageChannel.SMS,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Template reset to default successfully'
    })
  } catch (error) {
    console.error('Error resetting SMS template:', error)
    return NextResponse.json(
      { error: 'Failed to reset SMS template' },
      { status: 500 }
    )
  }
}