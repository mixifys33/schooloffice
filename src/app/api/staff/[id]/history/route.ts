/**
 * Staff History API Route
 * Returns history entries for a specific staff member
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/staff/[id]/history
 * Returns staff history entries (promotions, role changes, transfers, etc.)
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

    // Verify staff exists and belongs to the same school
    const staff = await prisma.staff.findUnique({
      where: { id },
      select: { id: true, schoolId: true },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Get history entries
    const historyEntries = await prisma.staffHistoryEntry.findMany({
      where: { staffId: id },
      orderBy: { performedAt: 'desc' },
      take: 100,
    })

    // Get performer names for the history entries
    const performerIds = [...new Set(historyEntries.map(h => h.performedBy))]
    const performers = await prisma.user.findMany({
      where: { id: { in: performerIds } },
      select: { id: true, email: true },
    })
    const performerStaff = await prisma.staff.findMany({
      where: { userId: { in: performerIds } },
      select: { userId: true, firstName: true, lastName: true },
    })

    const performerMap = new Map<string, string>()
    for (const p of performers) {
      const staffInfo = performerStaff.find(s => s.userId === p.id)
      performerMap.set(
        p.id,
        staffInfo ? `${staffInfo.firstName} ${staffInfo.lastName}` : p.email
      )
    }

    const formattedHistory = historyEntries.map((entry) => ({
      id: entry.id,
      staffId: entry.staffId,
      eventType: entry.eventType,
      previousValue: entry.previousValue || undefined,
      newValue: entry.newValue || undefined,
      reason: entry.reason || undefined,
      performedBy: performerMap.get(entry.performedBy) || entry.performedBy,
      performedAt: entry.performedAt,
    }))

    return NextResponse.json({ data: formattedHistory })
  } catch (error) {
    console.error('Error fetching staff history:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
