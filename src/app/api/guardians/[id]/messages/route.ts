/**
 * Guardian Messages API Route
 * GET: Return communication history for guardian
 * Requirements: 3.1 - Guardian communication history
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, MessageChannel, MessageStatus } from '@/types/enums'
import { canRead, RoleAccessError } from '@/lib/rbac'
import { TenantIsolationError } from '@/services/tenant-isolation.service'
import { guardianService } from '@/services/guardian.service'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper function to validate MongoDB ObjectId format
function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  return /^[a-fA-F0-9]{24}$/.test(id)
}

/**
 * GET: Get communication history for a guardian
 * Requirement 3.1: Display message history including channel used, delivery status, and timestamp
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

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role

    // Check role-based access
    if (!canRead(userRole, 'student')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have access to communication records' },
        { status: 403 }
      )
    }
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: 'Invalid guardian ID format' },
        { status: 400 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'))
    const channel = searchParams.get('channel') as MessageChannel | null
    const status = searchParams.get('status') as MessageStatus | null
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined

    // Verify guardian belongs to school (tenant isolation)
    const guardian = await prisma.guardian.findFirst({
      where: {
        id,
        studentGuardians: {
          some: {
            student: {
              schoolId,
            },
          },
        },
      },
    })

    if (!guardian) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: 'Guardian not found' },
        { status: 404 }
      )
    }

    // Get communication history using service - Requirement 3.1
    const communicationHistory = await guardianService.getGuardianCommunicationHistory(id, {
      limit,
      offset,
      channel: channel || undefined,
      status: status || undefined,
      startDate,
      endDate,
    })

    return NextResponse.json({
      guardianId: communicationHistory.guardianId,
      guardianName: `${guardian.firstName} ${guardian.lastName}`,
      lastContactDate: communicationHistory.lastContactDate,
      totalCount: communicationHistory.totalCount,
      limit,
      offset,
      messages: communicationHistory.messages.map(msg => ({
        id: msg.id,
        studentId: msg.studentId,
        studentName: msg.studentName,
        channel: msg.channel,
        content: msg.content,
        status: msg.status,
        sentAt: msg.sentAt,
        deliveredAt: msg.deliveredAt,
        readAt: msg.readAt,
        createdAt: msg.createdAt,
      })),
    })
  } catch (error) {
    if (error instanceof RoleAccessError) {
      return NextResponse.json(
        { error: 'Forbidden', message: error.message },
        { status: error.statusCode }
      )
    }
    if (error instanceof TenantIsolationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'GUARDIAN_NOT_FOUND', message: error.message },
        { status: 404 }
      )
    }
    console.error('Error fetching guardian messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch communication history' },
      { status: 500 }
    )
  }
}
