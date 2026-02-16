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

    if (!session?.user?.schoolId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const academicYears = await prisma.academicYear.findMany({
      where: {
        schoolId: session.user.schoolId,
      },
      include: {
        terms: {
          orderBy: {
            startDate: 'asc',
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    return NextResponse.json({ academicYears })
  } catch (error) {
    console.error('Error fetching academic years:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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

    if (!session?.user?.schoolId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, startDate, endDate, isActive } = body

    // Validate required fields
    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Name, start date, and end date are required' },
        { status: 400 }
      )
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    // Check for overlapping academic years
    const overlapping = await prisma.academicYear.findFirst({
      where: {
        schoolId: session.user.schoolId,
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } },
            ],
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } },
            ],
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } },
            ],
          },
        ],
      },
    })

    if (overlapping) {
      return NextResponse.json(
        { error: 'Academic year dates overlap with existing academic year' },
        { status: 400 }
      )
    }

    // If this is set to active, deactivate other academic years
    if (isActive) {
      await prisma.academicYear.updateMany({
        where: {
          schoolId: session.user.schoolId,
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
        name,
        startDate: start,
        endDate: end,
        isActive: isActive || false,
        schoolId: session.user.schoolId,
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ 
      academicYear,
      message: 'Academic year created successfully' 
    })
  } catch (error) {
    console.error('Error creating academic year:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/academic-years
 * Update an academic year
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, name, startDate, endDate, isActive } = body

    // Validate required fields
    if (!id || !name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'ID, name, start date, and end date are required' },
        { status: 400 }
      )
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    // Check if academic year exists and belongs to the school
    const existingYear = await prisma.academicYear.findFirst({
      where: {
        id,
        schoolId: session.user.schoolId,
      },
    })

    if (!existingYear) {
      return NextResponse.json(
        { error: 'Academic year not found' },
        { status: 404 }
      )
    }

    // Check for overlapping academic years (excluding current one)
    const overlapping = await prisma.academicYear.findFirst({
      where: {
        schoolId: session.user.schoolId,
        id: { not: id },
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } },
            ],
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } },
            ],
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } },
            ],
          },
        ],
      },
    })

    if (overlapping) {
      return NextResponse.json(
        { error: 'Academic year dates overlap with existing academic year' },
        { status: 400 }
      )
    }

    // If this is set to active, deactivate other academic years
    if (isActive) {
      await prisma.academicYear.updateMany({
        where: {
          schoolId: session.user.schoolId,
          isActive: true,
          id: { not: id },
        },
        data: {
          isActive: false,
        },
      })
    }

    // Update the academic year
    const academicYear = await prisma.academicYear.update({
      where: { id },
      data: {
        name,
        startDate: start,
        endDate: end,
        isActive: isActive || false,
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ 
      academicYear,
      message: 'Academic year updated successfully' 
    })
  } catch (error) {
    console.error('Error updating academic year:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/academic-years
 * Delete an academic year
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const cascade = searchParams.get('cascade') === 'true'

    if (!id) {
      return NextResponse.json(
        { error: 'Academic year ID is required' },
        { status: 400 }
      )
    }

    // Check if academic year exists and belongs to the school
    const existingYear = await prisma.academicYear.findFirst({
      where: {
        id,
        schoolId: session.user.schoolId,
      },
    })

    if (!existingYear) {
      return NextResponse.json(
        { error: 'Academic year not found' },
        { status: 404 }
      )
    }

    // Check if there are any terms associated with this academic year
    const termsCount = await prisma.term.count({
      where: {
        academicYearId: id,
      },
    })

    if (termsCount > 0 && !cascade) {
      return NextResponse.json(
        { 
          error: 'Cannot delete academic year with associated terms',
          termsCount,
          canCascade: true
        },
        { status: 400 }
      )
    }

    // If cascade is true, delete all associated terms first
    if (cascade && termsCount > 0) {
      // Get all terms for this academic year
      const terms = await prisma.term.findMany({
        where: {
          academicYearId: id,
        },
      })

      // Check if any terms have associated data that would prevent deletion
      for (const term of terms) {
        const [
          examsCount, 
          resultsCount, 
          paymentsCount, 
          feeStructuresCount, 
          timetablesCount,
          caEntriesCount,
          examEntriesCount
        ] = await Promise.all([
          prisma.exam.count({ where: { termId: term.id } }),
          prisma.result.count({ where: { termId: term.id } }),
          prisma.payment.count({ where: { termId: term.id } }),
          prisma.feeStructure.count({ where: { termId: term.id } }),
          prisma.timetableDraft.count({ where: { termId: term.id } }),
          prisma.cAEntry.count({ where: { termId: term.id } }),
          prisma.examEntry.count({ where: { termId: term.id } }),
        ])

        if (
          examsCount > 0 || 
          resultsCount > 0 || 
          paymentsCount > 0 || 
          feeStructuresCount > 0 || 
          timetablesCount > 0 ||
          caEntriesCount > 0 ||
          examEntriesCount > 0
        ) {
          const dependencies: any = {
            exams: examsCount,
            results: resultsCount,
            payments: paymentsCount,
            feeStructures: feeStructuresCount,
            timetables: timetablesCount,
            caEntries: caEntriesCount,
            examEntries: examEntriesCount
          }
          
          return NextResponse.json(
            { 
              error: `Cannot delete term "${term.name}" as it has associated data. Please clean up these dependencies first.`,
              termName: term.name,
              dependencies
            },
            { status: 400 }
          )
        }
      }

      // Delete all terms
      await prisma.term.deleteMany({
        where: {
          academicYearId: id,
        },
      })
    }

    // Delete the academic year
    await prisma.academicYear.delete({
      where: { id },
    })

    return NextResponse.json({ 
      message: cascade && termsCount > 0 
        ? `Academic year and ${termsCount} associated term(s) deleted successfully`
        : 'Academic year deleted successfully',
      deletedTermsCount: cascade ? termsCount : 0
    })
  } catch (error) {
    console.error('Error deleting academic year:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}