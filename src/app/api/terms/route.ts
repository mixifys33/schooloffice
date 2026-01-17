/**
 * Terms API Route
 * GET: Fetch terms for the school
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 400 }
      )
    }

    // Get all terms for the school's academic years
    const terms = await prisma.term.findMany({
      where: {
        academicYear: {
          schoolId,
        },
      },
      include: {
        academicYear: {
          select: {
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { academicYear: { startDate: 'desc' } },
        { startDate: 'desc' },
      ],
    })

    const mappedTerms = terms.map(term => ({
      id: term.id,
      name: term.name,
      academicYear: term.academicYear.name,
      isActive: term.academicYear.isActive,
      startDate: term.startDate,
      endDate: term.endDate,
    }))

    return NextResponse.json({
      terms: mappedTerms,
    })
  } catch (error) {
    console.error('Error fetching terms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch terms' },
      { status: 500 }
    )
  }
}
