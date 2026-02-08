/**
 * Teacher Alert API Routes
 * Requirements: Alert management for CA pending submission, evidence not uploaded, deadlines, etc.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

/**
 * GET /api/teacher/alerts
 * Returns teacher's active alerts and obligations
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has TEACHER role
    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Access denied. Teacher role required.' },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Get teacher record
    const teacher = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Get teacher alerts
    const alerts = await prisma.teacherAlert.findMany({
      where: {
        staffId: teacher.id,
      },
      orderBy: {
        priority: 'desc',
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Error fetching teacher alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher alerts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teacher/alerts/mark-read
 * Marks alerts as read
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has TEACHER role
    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Access denied. Teacher role required.' },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { alertIds } = body

    if (!alertIds || !Array.isArray(alertIds)) {
      return NextResponse.json(
        { error: 'Missing required field: alertIds (array)' },
        { status: 400 }
      )
    }

    // Get teacher record
    const teacher = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Update alerts as read
    await prisma.teacherAlert.updateMany({
      where: {
        id: { in: alertIds },
        staffId: teacher.id,
      },
      data: {
        isRead: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: `${alertIds.length} alerts marked as read`,
    })
  } catch (error) {
    console.error('Error updating teacher alerts:', error)
    return NextResponse.json(
      { error: 'Failed to update teacher alerts' },
      { status: 500 }
    )
  }
}