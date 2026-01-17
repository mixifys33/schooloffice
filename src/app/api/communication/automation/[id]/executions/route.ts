/**
 * Communication Automation Rule Executions API Route
 * GET /api/communication/automation/[id]/executions - Get execution history
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { automationService } from '@/services/automation.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/communication/automation/[id]/executions
 * Get execution history for an automation rule
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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const executions = await automationService.getExecutionHistory(id, limit)

    return NextResponse.json({
      success: true,
      executions,
    })
  } catch (error) {
    console.error('Error fetching execution history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch execution history' },
      { status: 500 }
    )
  }
}
