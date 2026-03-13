import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/settings/terms
 * Get all terms for the school
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

    const terms = await prisma.term.findMany({
      where: {
        academicYear: {
          schoolId: session.user.schoolId,
        },
      },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { academicYear: { startDate: 'desc' } },
        { startDate: 'asc' },
      ],
    })

    return NextResponse.json({ terms })
  } catch (error) {
    console.error('Error fetching terms:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/terms
 * Create a new term
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

    // Check if user has permission (admin or school admin)
    const userRole = session.user.role
    if (userRole !== 'SUPER_ADMIN' && userRole !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { error: 'You do not have permission to create terms' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, startDate, endDate, academicYearId } = body

    // Validate required fields
    if (!name || !startDate || !endDate || !academicYearId) {
      return NextResponse.json(
        { error: 'Name, start date, end date, and academic year are required' },
        { status: 400 }
      )
    }

    console.log(`[DEBUG] POST - Raw date inputs - startDate: "${startDate}", endDate: "${endDate}"`);
    
    // Validate dates - ensure consistent parsing with UTC to avoid timezone issues
    let start: Date;
    let end: Date;
    
    try {
      // Handle different date formats more robustly
      if (typeof startDate === 'string' && startDate.includes('T')) {
        start = new Date(startDate);
      } else {
        start = new Date(startDate + 'T00:00:00.000Z');
      }
      
      if (typeof endDate === 'string' && endDate.includes('T')) {
        end = new Date(endDate);
      } else {
        end = new Date(endDate + 'T23:59:59.999Z');
      }
      
      // Validate that dates are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error(`[DEBUG] POST - Invalid dates created - start: ${start}, end: ${end}`);
        return NextResponse.json(
          { error: 'Invalid date format provided' },
          { status: 400 }
        )
      }
      
      console.log(`[DEBUG] POST - Parsed dates - start: ${start.toISOString()}, end: ${end.toISOString()}`);
    } catch (error) {
      console.error(`[DEBUG] POST - Date parsing error:`, error);
      return NextResponse.json(
        { error: 'Invalid date format provided' },
        { status: 400 }
      )
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    // Verify academic year exists and belongs to the school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        schoolId: session.user.schoolId,
      },
    })

    if (!academicYear) {
      return NextResponse.json(
        { error: 'Academic year not found' },
        { status: 404 }
      )
    }

    // Check if term dates are within academic year dates
    // Use date-only comparison to avoid timezone precision issues
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const academicStartDateOnly = new Date(academicYear.startDate.getFullYear(), academicYear.startDate.getMonth(), academicYear.startDate.getDate());
    const academicEndDateOnly = new Date(academicYear.endDate.getFullYear(), academicYear.endDate.getMonth(), academicYear.endDate.getDate());
    
    if (startDateOnly < academicStartDateOnly || endDateOnly > academicEndDateOnly) {
      return NextResponse.json(
        { 
          error: 'Term dates must be within the academic year period',
          details: {
            academicYear: academicYear.name,
            academicYearDates: {
              start: academicYear.startDate.toISOString().split('T')[0],
              end: academicYear.endDate.toISOString().split('T')[0]
            },
            attemptedDates: {
              start: startDate,
              end: endDate
            }
          }
        },
        { status: 400 }
      )
    }

    // Check for overlapping terms within the same academic year
    // STRICT VALIDATION: No term dates should overlap at all
    console.log(`[DEBUG] Checking overlap for term: ${name}`);
    console.log(`[DEBUG] Academic Year ID: ${academicYearId}`);
    console.log(`[DEBUG] New term dates: ${start.toISOString()} to ${end.toISOString()}`);
    
    const overlapping = await prisma.term.findFirst({
      where: {
        academicYearId,
        OR: [
          // Case 1: New term starts during an existing term
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } },
            ],
          },
          // Case 2: New term ends during an existing term
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } },
            ],
          },
          // Case 3: New term completely contains an existing term
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } },
            ],
          },
          // Case 4: Existing term completely contains the new term
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: end } },
            ],
          },
        ],
      },
    })

    if (overlapping) {
      console.log(`[DEBUG] ❌ Overlap detected with term: ${overlapping.name}`);
      console.log(`[DEBUG] Existing term dates: ${overlapping.startDate.toISOString()} to ${overlapping.endDate.toISOString()}`);
      
      return NextResponse.json(
        { 
          error: 'Term dates overlap with an existing term. Terms cannot have overlapping dates within the same academic year.',
          details: {
            conflictingTerm: overlapping.name,
            conflictingDates: {
              start: overlapping.startDate.toISOString().split('T')[0],
              end: overlapping.endDate.toISOString().split('T')[0]
            },
            attemptedDates: {
              start: startDate,
              end: endDate
            },
            suggestion: `Adjust your dates to avoid overlap. The conflicting term "${overlapping.name}" runs from ${overlapping.startDate.toISOString().split('T')[0]} to ${overlapping.endDate.toISOString().split('T')[0]}.`
          }
        },
        { status: 400 }
      )
    }

    console.log(`[DEBUG] ✅ No overlap detected - proceeding with term creation`);

    // Calculate week count
    const weekCount = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))

    // Create the term
    const term = await prisma.term.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        weekCount: Math.max(1, weekCount), // Ensure at least 1 week
        academicYearId,
        schoolId: schoolId,
      },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ 
      term,
      message: 'Term created successfully' 
    })
  } catch (error) {
    console.error('Error creating term:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/terms
 * Update a term
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
    const { id, name, startDate, endDate, academicYearId } = body

    // Validate required fields
    if (!id || !name || !startDate || !endDate || !academicYearId) {
      return NextResponse.json(
        { error: 'ID, name, start date, end date, and academic year are required' },
        { status: 400 }
      )
    }

    console.log(`[DEBUG] PUT - Raw date inputs - startDate: "${startDate}", endDate: "${endDate}"`);
    
    // Validate dates - ensure consistent parsing with UTC to avoid timezone issues
    let start: Date;
    let end: Date;
    
    try {
      // Handle different date formats more robustly
      if (typeof startDate === 'string' && startDate.includes('T')) {
        start = new Date(startDate);
      } else {
        start = new Date(startDate + 'T00:00:00.000Z');
      }
      
      if (typeof endDate === 'string' && endDate.includes('T')) {
        end = new Date(endDate);
      } else {
        end = new Date(endDate + 'T23:59:59.999Z');
      }
      
      // Validate that dates are valid
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error(`[DEBUG] PUT - Invalid dates created - start: ${start}, end: ${end}`);
        return NextResponse.json(
          { error: 'Invalid date format provided' },
          { status: 400 }
        )
      }
      
      console.log(`[DEBUG] PUT - Parsed dates - start: ${start.toISOString()}, end: ${end.toISOString()}`);
    } catch (error) {
      console.error(`[DEBUG] PUT - Date parsing error:`, error);
      return NextResponse.json(
        { error: 'Invalid date format provided' },
        { status: 400 }
      )
    }

    if (start >= end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    // Check if term exists - we need to check via academic year since terms don't have schoolId
    const existingTerm = await prisma.term.findFirst({
      where: {
        id,
      },
      include: {
        academicYear: true,
      },
    })

    if (!existingTerm || existingTerm.academicYear.schoolId !== session.user.schoolId) {
      return NextResponse.json(
        { error: 'Term not found' },
        { status: 404 }
      )
    }

    // Verify academic year exists and belongs to the school
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        id: academicYearId,
        schoolId: session.user.schoolId,
      },
    })

    if (!academicYear) {
      return NextResponse.json(
        { error: 'Academic year not found' },
        { status: 404 }
      )
    }

    // Check if term dates are within academic year dates
    // Use date-only comparison to avoid timezone precision issues
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const academicStartDateOnly = new Date(academicYear.startDate.getFullYear(), academicYear.startDate.getMonth(), academicYear.startDate.getDate());
    const academicEndDateOnly = new Date(academicYear.endDate.getFullYear(), academicYear.endDate.getMonth(), academicYear.endDate.getDate());
    
    if (startDateOnly < academicStartDateOnly || endDateOnly > academicEndDateOnly) {
      return NextResponse.json(
        { 
          error: 'Term dates must be within the academic year period',
          details: {
            academicYear: academicYear.name,
            academicYearDates: {
              start: academicYear.startDate.toISOString().split('T')[0],
              end: academicYear.endDate.toISOString().split('T')[0]
            },
            attemptedDates: {
              start: startDate,
              end: endDate
            }
          }
        },
        { status: 400 }
      )
    }

    // Check for overlapping terms within the same academic year (excluding current term)
    // STRICT VALIDATION: No term dates should overlap at all
    console.log(`[DEBUG] Checking overlap for term update: ${name}`);
    console.log(`[DEBUG] Academic Year ID: ${academicYearId}`);
    console.log(`[DEBUG] Updated term dates: ${start.toISOString()} to ${end.toISOString()}`);
    console.log(`[DEBUG] Excluding term ID: ${id}`);
    
    const overlapping = await prisma.term.findFirst({
      where: {
        academicYearId,
        id: { not: id },
        OR: [
          // Case 1: Updated term starts during an existing term
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } },
            ],
          },
          // Case 2: Updated term ends during an existing term
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } },
            ],
          },
          // Case 3: Updated term completely contains an existing term
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } },
            ],
          },
          // Case 4: Existing term completely contains the updated term
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: end } },
            ],
          },
        ],
      },
    })

    if (overlapping) {
      console.log(`[DEBUG] ❌ Overlap detected with term: ${overlapping.name}`);
      console.log(`[DEBUG] Existing term dates: ${overlapping.startDate.toISOString()} to ${overlapping.endDate.toISOString()}`);
      
      return NextResponse.json(
        { 
          error: 'Term dates overlap with an existing term. Terms cannot have overlapping dates within the same academic year.',
          details: {
            conflictingTerm: overlapping.name,
            conflictingDates: {
              start: overlapping.startDate.toISOString().split('T')[0],
              end: overlapping.endDate.toISOString().split('T')[0]
            },
            attemptedDates: {
              start: startDate,
              end: endDate
            },
            suggestion: `Adjust your dates to avoid overlap. The conflicting term "${overlapping.name}" runs from ${overlapping.startDate.toISOString().split('T')[0]} to ${overlapping.endDate.toISOString().split('T')[0]}.`
          }
        },
        { status: 400 }
      )
    }

    console.log(`[DEBUG] ✅ No overlap detected - proceeding with term update`);

    // Calculate week count
    const weekCount = Math.ceil((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000))

    // Update the term
    const term = await prisma.term.update({
      where: { id },
      data: {
        name,
        startDate: start,
        endDate: end,
        weekCount: Math.max(1, weekCount), // Ensure at least 1 week
        academicYearId,
      },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ 
      term,
      message: 'Term updated successfully' 
    })
  } catch (error) {
    console.error('Error updating term:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/terms
 * Delete a term
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

    if (!id) {
      return NextResponse.json(
        { error: 'Term ID is required' },
        { status: 400 }
      )
    }

    // Check if term exists - we need to check via academic year since terms don't have schoolId
    const existingTerm = await prisma.term.findFirst({
      where: {
        id,
      },
      include: {
        academicYear: true,
      },
    })

    if (!existingTerm || existingTerm.academicYear.schoolId !== session.user.schoolId) {
      return NextResponse.json(
        { error: 'Term not found' },
        { status: 404 }
      )
    }

    // Check if there are any associated data that would prevent deletion
    const [
      examsCount, 
      resultsCount, 
      paymentsCount, 
      feeStructuresCount, 
      timetablesCount, 
      studentAccountsCount,
      caEntriesCount,
      examEntriesCount
    ] = await Promise.all([
      prisma.exam.count({
        where: { termId: id },
      }),
      prisma.result.count({
        where: { termId: id },
      }),
      prisma.payment.count({
        where: { termId: id },
      }),
      prisma.feeStructure.count({
        where: { termId: id },
      }),
      prisma.timetableDraft.count({
        where: { termId: id },
      }),
      prisma.studentAccount.count({
        where: { termId: id },
      }),
      prisma.cAEntry.count({
        where: { termId: id },
      }),
      prisma.examEntry.count({
        where: { termId: id },
      }),
    ])

    if (
      examsCount > 0 || 
      resultsCount > 0 || 
      paymentsCount > 0 || 
      feeStructuresCount > 0 || 
      timetablesCount > 0 || 
      studentAccountsCount > 0 ||
      caEntriesCount > 0 ||
      examEntriesCount > 0
    ) {
      const dependencies = [];
      if (examsCount > 0) dependencies.push(`${examsCount} exam(s)`);
      if (resultsCount > 0) dependencies.push(`${resultsCount} result(s)`);
      if (paymentsCount > 0) dependencies.push(`${paymentsCount} payment(s)`);
      if (feeStructuresCount > 0) dependencies.push(`${feeStructuresCount} fee structure(s)`);
      if (timetablesCount > 0) dependencies.push(`${timetablesCount} timetable(s)`);
      if (studentAccountsCount > 0) dependencies.push(`${studentAccountsCount} student account(s)`);
      if (caEntriesCount > 0) dependencies.push(`${caEntriesCount} CA entry/entries`);
      if (examEntriesCount > 0) dependencies.push(`${examEntriesCount} exam entry/entries`);
      
      return NextResponse.json(
        { error: `Cannot delete term with associated data: ${dependencies.join(', ')}. Please delete or move these records first.` },
        { status: 400 }
      )
    }

    // Delete the term
    await prisma.term.delete({
      where: { id },
    })

    console.log(`✅ [API] Successfully deleted term: ${id}`)

    return NextResponse.json({ 
      message: 'Term deleted successfully' 
    })
  } catch (error) {
    console.error('❌ [API] Error deleting term:', error)
    
    // Provide more specific error message
    let errorMessage = 'Internal server error'
    if (error instanceof Error) {
      // Check for common Prisma errors
      if (error.message.includes('Foreign key constraint')) {
        errorMessage = 'Cannot delete term due to existing related records. Please ensure all associated data is removed first.'
      } else if (error.message.includes('Record to delete does not exist')) {
        errorMessage = 'Term not found or already deleted'
      } else {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}