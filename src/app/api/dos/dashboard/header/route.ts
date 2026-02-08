import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has DoS role
    const userRoles = Array.isArray(session.user.roles) ? session.user.roles : [session.user.role]
    const hasDoSRole = userRoles.includes('DOS') || userRoles.includes('SCHOOL_ADMIN')

    if (!hasDoSRole) {
      return NextResponse.json({ error: 'Forbidden - DoS access required' }, { status: 403 })
    }

    const schoolId = session.user.schoolId

    // Get current term with academic year
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: schoolId,
          isActive: true
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        academicYear: true
      }
    })

    if (!currentTerm) {
      return NextResponse.json({ 
        error: 'No active term found' 
      }, { status: 404 })
    }

    // Get school info
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true,
        code: true
      }
    })

    if (!school) {
      return NextResponse.json({ 
        error: 'School not found' 
      }, { status: 404 })
    }

    // Calculate days remaining in term
    const now = new Date()
    const termEnd = new Date(currentTerm.endDate)
    const daysRemaining = Math.max(0, Math.ceil((termEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

    // Get pending approvals count (simplified for now)
    const pendingApprovals = 0 // TODO: Implement actual count

    // Get critical alerts count (simplified for now)
    const criticalCount = 0 // TODO: Implement actual count

    // Determine school status based on current date and term
    let schoolStatus: 'OPEN' | 'EXAM_PERIOD' | 'REPORTING' | 'CLOSED' = 'OPEN'
    // TODO: Implement logic to determine actual school status

    const headerData = {
      currentTerm: {
        name: currentTerm.name,
        academicYear: currentTerm.academicYear.name, // Convert object to string
        startDate: currentTerm.startDate.toISOString().split('T')[0],
        endDate: currentTerm.endDate.toISOString().split('T')[0],
        daysRemaining
      },
      schoolStatus,
      schoolInfo: {
        name: school.name,
        code: school.code || 'N/A'
      },
      criticalCount,
      pendingApprovals
    }

    return NextResponse.json(headerData)
  } catch (error) {
    console.error('Error fetching DOS header data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch header data' },
      { status: 500 }
    )
  }
}