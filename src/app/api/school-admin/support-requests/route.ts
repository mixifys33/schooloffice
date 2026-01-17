/**
 * Support Requests API Route
 * List and manage support requests for school admins
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role

    if (!['SCHOOL_ADMIN', 'DEPUTY', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const where: any = { schoolId }
    if (status) {
      where.status = status
    }

    const [requests, total] = await Promise.all([
      prisma.supportRequest.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.supportRequest.count({ where }),
    ])

    return NextResponse.json({
      requests: requests.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        issueType: r.issueType,
        message: r.message,
        status: r.status,
        priority: r.priority,
        resolution: r.resolution,
        createdAt: r.createdAt.toISOString(),
        resolvedAt: r.resolvedAt?.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Error fetching support requests:', error)
    return NextResponse.json({ error: 'Failed to fetch support requests' }, { status: 500 })
  }
}
