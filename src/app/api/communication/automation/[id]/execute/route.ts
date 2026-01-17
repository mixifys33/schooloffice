/**
 * Communication Automation Rule Execute API Route
 * POST /api/communication/automation/[id]/execute - Execute rule manually
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { automationService } from '@/services/automation.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/communication/automation/[id]/execute
 * Execute an automation rule manually
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const result = await automationService.executeRule(id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error executing automation rule:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute automation rule' },
      { status: 500 }
    )
  }
}
