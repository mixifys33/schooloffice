/**
 * Communication Automation Rules API Route
 * GET /api/communication/automation - List automation rules
 * POST /api/communication/automation - Create automation rule
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { automationService } from '@/services/automation.service'
import { TriggerType, TargetType, MessageChannel } from '@/types/enums'

interface CreateRuleRequestBody {
  name: string
  description?: string
  triggerType: TriggerType
  triggerConfig: Record<string, unknown>
  targetType: TargetType
  targetCriteria: Record<string, unknown>
  templateId?: string
  channel: MessageChannel
  isActive?: boolean
}

/**
 * GET /api/communication/automation
 * List all automation rules for the school
 */
export async function GET(request: NextRequest) {
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

    const rules = await automationService.getAutomationRules(schoolId)

    return NextResponse.json({
      success: true,
      rules,
    })
  } catch (error) {
    console.error('Error fetching automation rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation rules' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/communication/automation
 * Create a new automation rule
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
    const userId = (session.user as { id?: string }).id

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID not found in session' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 400 }
      )
    }

    const body: CreateRuleRequestBody = await request.json()

    // Validate required fields
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Rule name is required' },
        { status: 400 }
      )
    }

    if (!body.triggerType) {
      return NextResponse.json(
        { error: 'Trigger type is required' },
        { status: 400 }
      )
    }

    if (!body.channel) {
      return NextResponse.json(
        { error: 'Channel is required' },
        { status: 400 }
      )
    }

    const rule = await automationService.createAutomationRule({
      schoolId,
      name: body.name,
      description: body.description,
      triggerType: body.triggerType,
      triggerConfig: body.triggerConfig || {},
      targetType: body.targetType || TargetType.ENTIRE_SCHOOL,
      targetCriteria: body.targetCriteria || {},
      templateId: body.templateId,
      channel: body.channel,
      createdBy: userId,
    })

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Error creating automation rule:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create automation rule' },
      { status: 500 }
    )
  }
}
