/**
 * School Admin Dashboard API Route
 * Returns real-time dashboard data for school administrators
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { canRead } from '@/lib/rbac'

export interface SchoolAdminDashboardData {
  schoolId: string
  schoolName: string
  overview: {
    totalStudents: number
    activeStudents: number
    totalStaff: number
    activeStaff: number
    totalClasses: number
    currentTerm: string | null
    currentAcademicYear: string | null
  }
  staffSummary: {
    totalStaff: number
    activeStaff: number
    inactiveStaff: number
    byRole: { role: string; count: number }[]
  }
  academicCalendar: {
    currentYear: {
      id: string
      name: string
      startDate: string
      endDate: string
    } | null
    currentTerm: {
      id: string
      name: string
      startDate: string
      endDate: string
      currentWeek: number
    } | null
    upcomingTerms: {
      id: string
      name: string
      startDate: string
    }[]
  }
  communicationReport: {
    totalMessages: number
    sentCount: number
    deliveredCount: number
    failedCount: number
    readCount: number
    byChannel: { channel: string; count: number }[]
    deliveryRate: number
  }
  financeSummary: {
    totalExpected: number
    totalCollected: number
    totalOutstanding: number
    collectionRate: number
  }
  supportRequests: {
    pending: number
    inProgress: number
    total: number
  }
}

function calculateCurrentWeek(termStartDate: Date): number {
  const now = new Date()
  const diffTime = now.getTime() - termStartDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(1, Math.ceil(diffDays / 7))
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role

    // Check permissions
    if (!['SCHOOL_ADMIN', 'DEPUTY', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const today = new Date()

    // Fetch all data in parallel
    const [
      school,
      totalStudents,
      activeStudents,
      totalStaff,
      activeStaff,
      totalClasses,
      staffByRole,
      currentAcademicYear,
      messages,
      studentAccounts,
      supportRequestCounts,
    ] = await Promise.all([
      // School info
      prisma.school.findUnique({
        where: { id: schoolId },
        select: { id: true, name: true },
      }),
      // Total students
      prisma.student.count({ where: { schoolId } }),
      // Active students
      prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),
      // Total staff
      prisma.staff.count({ where: { schoolId } }),
      // Active staff
      prisma.staff.count({ where: { schoolId, status: 'ACTIVE' } }),
      // Total classes
      prisma.class.count({ where: { schoolId } }),
      // Staff by role
      prisma.staff.groupBy({
        by: ['role'],
        where: { schoolId },
        _count: { role: true },
      }),
      // Current academic year with terms
      prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        include: {
          terms: { orderBy: { startDate: 'asc' } },
        },
      }),
      // Messages for communication report
      prisma.message.groupBy({
        by: ['status', 'channel'],
        where: { schoolId },
        _count: { id: true },
      }),
      // Student accounts for finance summary
      prisma.studentAccount.findMany({
        where: { schoolId },
        select: { totalFees: true, totalPaid: true, balance: true },
      }),
      // Support requests
      prisma.supportRequest.groupBy({
        by: ['status'],
        where: { schoolId },
        _count: { id: true },
      }),
    ])

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    // Process current term
    let currentTerm = null
    let upcomingTerms: { id: string; name: string; startDate: string }[] = []
    
    if (currentAcademicYear?.terms) {
      const activeTerm = currentAcademicYear.terms.find(
        t => t.startDate <= today && t.endDate >= today
      )
      if (activeTerm) {
        currentTerm = {
          id: activeTerm.id,
          name: activeTerm.name,
          startDate: activeTerm.startDate.toISOString(),
          endDate: activeTerm.endDate.toISOString(),
          currentWeek: calculateCurrentWeek(activeTerm.startDate),
        }
      }
      upcomingTerms = currentAcademicYear.terms
        .filter(t => t.startDate > today)
        .map(t => ({
          id: t.id,
          name: t.name,
          startDate: t.startDate.toISOString(),
        }))
    }

    // Process communication stats
    const messageStats = {
      totalMessages: 0,
      sentCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      readCount: 0,
      byChannel: {} as Record<string, number>,
    }
    
    for (const msg of messages) {
      messageStats.totalMessages += msg._count.id
      if (msg.status === 'SENT') messageStats.sentCount += msg._count.id
      if (msg.status === 'DELIVERED') messageStats.deliveredCount += msg._count.id
      if (msg.status === 'FAILED') messageStats.failedCount += msg._count.id
      if (msg.status === 'READ') messageStats.readCount += msg._count.id
      
      if (!messageStats.byChannel[msg.channel]) {
        messageStats.byChannel[msg.channel] = 0
      }
      messageStats.byChannel[msg.channel] += msg._count.id
    }

    const deliveryRate = messageStats.totalMessages > 0
      ? Math.round(((messageStats.deliveredCount + messageStats.readCount) / messageStats.totalMessages) * 100)
      : 0

    // Process finance summary
    const totalExpected = studentAccounts.reduce((sum, a) => sum + a.totalFees, 0)
    const totalCollected = studentAccounts.reduce((sum, a) => sum + a.totalPaid, 0)
    const totalOutstanding = studentAccounts.reduce((sum, a) => sum + Math.max(0, a.balance), 0)
    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0

    // Process support requests
    const supportStats = { pending: 0, inProgress: 0, total: 0 }
    for (const sr of supportRequestCounts) {
      supportStats.total += sr._count.id
      if (sr.status === 'PENDING') supportStats.pending = sr._count.id
      if (sr.status === 'IN_PROGRESS') supportStats.inProgress = sr._count.id
    }

    const data: SchoolAdminDashboardData = {
      schoolId: school.id,
      schoolName: school.name,
      overview: {
        totalStudents,
        activeStudents,
        totalStaff,
        activeStaff,
        totalClasses,
        currentTerm: currentTerm?.name || null,
        currentAcademicYear: currentAcademicYear?.name || null,
      },
      staffSummary: {
        totalStaff,
        activeStaff,
        inactiveStaff: totalStaff - activeStaff,
        byRole: staffByRole.map(s => ({ role: s.role, count: s._count.role })),
      },
      academicCalendar: {
        currentYear: currentAcademicYear ? {
          id: currentAcademicYear.id,
          name: currentAcademicYear.name,
          startDate: currentAcademicYear.startDate.toISOString(),
          endDate: currentAcademicYear.endDate.toISOString(),
        } : null,
        currentTerm,
        upcomingTerms,
      },
      communicationReport: {
        totalMessages: messageStats.totalMessages,
        sentCount: messageStats.sentCount,
        deliveredCount: messageStats.deliveredCount,
        failedCount: messageStats.failedCount,
        readCount: messageStats.readCount,
        byChannel: Object.entries(messageStats.byChannel).map(([channel, count]) => ({ channel, count })),
        deliveryRate,
      },
      financeSummary: {
        totalExpected,
        totalCollected,
        totalOutstanding,
        collectionRate: Math.round(collectionRate * 100) / 100,
      },
      supportRequests: supportStats,
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching school admin dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
