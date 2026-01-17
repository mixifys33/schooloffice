/**
 * Communication Automation Rule API Route
 * GET /api/communication/automation/[id] - Get single rule
 * PUT /api/communication/automation/[id] - Update rule
 * DELETE /api/communication/automation/[id] - Delete rule
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { automationService } from '@/services/automation.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/communication/automation/[id]
 * Get a single automation rule
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

    const { id } = await params
    const rule = await automationService.getAutomationRuleById(id)

    if (!rule) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Error fetching automation rule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch automation rule' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/communication/automation/[id]
 * Update an automation rule
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const rule = await automationService.updateAutomationRule(id, body)

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Error updating automation rule:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update automation rule' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/communication/automation/[id]
 * Delete an automation rule
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    await automationService.deleteAutomationRule(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting automation rule:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete automation rule' },
      { status: 500 }
    )
  }
}
