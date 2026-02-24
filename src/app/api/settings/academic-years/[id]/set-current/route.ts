import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    // Check permissions
    const allowedRoles = [Role.ADMIN, Role.SCHOOL_ADMIN, Role.DOS]
    if (!allowedRoles.includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id } = await params

    // Verify the academic year belongs to this school
    const academicYear = await prisma.academicYear.findFirst({
      where: { id, schoolId }
    })

    if (!academicYear) {
      return NextResponse.json({ error: 'Academic year not found' }, { status: 404 })
    }

    // Unset all other current years
    await prisma.academicYear.updateMany({
      where: { schoolId, isCurrent: true },
      data: { isCurrent: false }
    })

    // Set this year as current
    await prisma.academicYear.update({
      where: { id },
      data: { isCurrent: true }
    })

    return NextResponse.json({
      message: 'Academic year set as current',
      academicYear: {
        id: academicYear.id,
        name: academicYear.name
      }
    })
  } catch (error) {
    console.error('Error setting current academic year:', error)
    return NextResponse.json(
      { error: 'Failed to set current academic year' },
      { status: 500 }
    )
  }
}
