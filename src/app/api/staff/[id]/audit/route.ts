/**
 * Staff Audit API Route
 * Returns audit log entries for a specific staff member
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/staff/[id]/audit
 * Returns audit log entries related to this staff member
 * Requires SCHOOL_ADMIN, DEPUTY, or SUPER_ADMIN permission
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.SCHOOL_ADMIN && userRole !== Role.SUPER_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to access this resource' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verify staff exists and get their userId
    const staff = await prisma.staff.findUnique({
      where: { id },
      select: { id: true, userId: true, schoolId: true },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Get audit logs where this staff member is the subject (resourceId)
    // or where they performed the action (userId)
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { resourceId: id, resource: 'STAFF' },
          { userId: staff.userId },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        user: {
          select: { email: true },
        },
      },
    })

    // Get actor names
    const actorUserIds = [...new Set(auditLogs.map(a => a.userId))]
    const actorStaff = await prisma.staff.findMany({
      where: { userId: { in: actorUserIds } },
      select: { userId: true, firstName: true, lastName: true },
    })

    const actorMap = new Map<string, string>()
    for (const a of actorStaff) {
      actorMap.set(a.userId, `${a.firstName} ${a.lastName}`)
    }

    const formattedAuditLogs = auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      previousValue: log.previousValue as Record<string, unknown> | undefined,
      newValue: log.newValue as Record<string, unknown> | undefined,
      createdAt: log.timestamp,
      userId: log.userId,
      actorName: actorMap.get(log.userId) || log.user.email,
      ipAddress: log.ipAddress,
    }))

    return NextResponse.json({ data: formattedAuditLogs })
  } catch (error) {
    console.error('Error fetching staff audit logs:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
