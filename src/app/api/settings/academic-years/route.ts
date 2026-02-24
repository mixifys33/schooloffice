import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/settings/academic-years
 * Get all academic years for the school
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId },
      include: {
        terms: {
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { startDate: 'desc' },
    })

    return NextResponse.json({ academicYears })
  } catch (error) {
    console.error('Error fetching academic years:', error)
    return NextResponse.json(
      { error: 'Failed to fetch academic years' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/academic-years
 * Update an academic year (e.g., set as active)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    // Check if user has permission (admin or school admin)
    const userRole = session.user.role
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { error: 'You do not have permission to update academic years' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, isActive } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Academic year ID is required' },
        { status: 400 }
      )
    }

    // Verify the academic year belongs to this school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id,
        schoolId,
      },
    })

    if (!academicYear) {
      return NextResponse.json(
        { error: 'Academic year not found' },
        { status: 404 }
      )
    }

    // If setting as active, deactivate all other years first
    if (isActive === true) {
      await prisma.academicYear.updateMany({
        where: {
          schoolId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      })
    }

    // Update the academic year
    const updatedYear = await prisma.academicYear.update({
      where: { id },
      data: {
        isActive: isActive !== undefined ? isActive : academicYear.isActive,
      },
      include: {
        terms: {
          orderBy: { startDate: 'asc' },
        },
      },
    })

    return NextResponse.json({
      message: 'Academic year updated successfully',
      academicYear: updatedYear,
    })
  } catch (error) {
    console.error('Error updating academic year:', error)
    return NextResponse.json(
      { error: 'Failed to update academic year' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/academic-years
 * Create a new academic year
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    // Check if user has permission
    const userRole = session.user.role
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { error: 'You do not have permission to create academic years' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, startDate, endDate, isActive } = body

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Name, start date, and end date are required' },
        { status: 400 }
      )
    }

    // If setting as active, deactivate all other years first
    if (isActive === true) {
      await prisma.academicYear.updateMany({
        where: {
          schoolId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      })
    }

    // Create the academic year
    const academicYear = await prisma.academicYear.create({
      data: {
        schoolId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive || false,
      },
      include: {
        terms: true,
      },
    })

    return NextResponse.json({
      message: 'Academic year created successfully',
      academicYear,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating academic year:', error)
    return NextResponse.json(
      { error: 'Failed to create academic year' },
      { status: 500 }
    )
  }
}
