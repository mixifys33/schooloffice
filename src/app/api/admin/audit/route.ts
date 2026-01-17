/**
 * Admin Audit Logs API Route
 * Requirements: 18.1, 18.2
 * - Display all system events with timestamp, user, action, affected entity
 * - Filter by school, user, action type, date range
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { auditService } from '@/services/audit.service'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify Super Admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Super Admin privileges required.' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId') || undefined
    const userId = searchParams.get('userId') || undefined
    const action = searchParams.get('action') || undefined
    const resource = searchParams.get('resource') || undefined
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)

    // Build filter
    const filter = {
      schoolId,
      userId,
      action,
      resource,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    }

    // Get audit logs with pagination
    const offset = (page - 1) * pageSize
    const [logs, totalCount] = await Promise.all([
      auditService.getAuditLogs(filter, pageSize, offset),
      auditService.countAuditLogs(filter)
    ])

    // Enrich logs with user and school names
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const [user, school] = await Promise.all([
          prisma.user.findUnique({
            where: { id: log.userId },
            select: { email: true }
          }),
          prisma.school.findUnique({
            where: { id: log.schoolId },
            select: { name: true, code: true }
          })
        ])

        return {
          ...log,
          userName: user?.email || 'Unknown User',
          schoolName: school?.name || 'Unknown School',
          schoolCode: school?.code || 'N/A'
        }
      })
    )

    return NextResponse.json({
      logs: enrichedLogs,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
