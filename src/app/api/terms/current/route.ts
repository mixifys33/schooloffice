import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    
    // First, try to find a term that's currently active (within date range)
    let currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: session.user.schoolId,
          isActive: true
        },
        startDate: { lte: today },
        endDate: { gte: today }
      },
      include: {
        academicYear: true
      },
      orderBy: {
        startDate: 'desc'
      }
    })

    // If no term is currently active, try to find the most recent active academic year's latest term
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYear: {
            schoolId: session.user.schoolId,
            isActive: true
          }
        },
        include: {
          academicYear: true
        },
        orderBy: [
          { academicYear: { startDate: 'desc' } },
          { startDate: 'desc' }
        ]
      })
    }

    // If still no term found, try to find any term from the most recent academic year
    if (!currentTerm) {
      const latestAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId: session.user.schoolId
        },
        include: {
          terms: {
            orderBy: { startDate: 'desc' },
            take: 1
          }
        },
        orderBy: { startDate: 'desc' }
      })

      if (latestAcademicYear && latestAcademicYear.terms.length > 0) {
        const term = latestAcademicYear.terms[0]
        currentTerm = {
          ...term,
          academicYear: {
            id: latestAcademicYear.id,
            name: latestAcademicYear.name,
            startDate: latestAcademicYear.startDate,
            endDate: latestAcademicYear.endDate,
            isActive: latestAcademicYear.isActive,
            schoolId: latestAcademicYear.schoolId,
            createdAt: latestAcademicYear.createdAt,
            updatedAt: latestAcademicYear.updatedAt
          }
        }
      }
    }

    if (!currentTerm) {
      // Check if there are any academic years at all
      const academicYearCount = await prisma.academicYear.count({
        where: { schoolId: session.user.schoolId }
      })

      if (academicYearCount === 0) {
        return NextResponse.json({ 
          error: 'No academic years found. Please set up an academic year first.', 
          term: null,
          suggestion: 'setup_academic_year'
        }, { status: 404 })
      }

      // Check if there are any terms
      const termCount = await prisma.term.count({
        where: {
          academicYear: {
            schoolId: session.user.schoolId
          }
        }
      })

      if (termCount === 0) {
        return NextResponse.json({ 
          error: 'No terms found. Please create terms for your academic year.', 
          term: null,
          suggestion: 'setup_terms'
        }, { status: 404 })
      }

      return NextResponse.json({ 
        error: 'No active term found. Please activate an academic year or check term dates.', 
        term: null,
        suggestion: 'activate_academic_year'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      term: {
        id: currentTerm.id,
        name: currentTerm.name,
        startDate: currentTerm.startDate,
        endDate: currentTerm.endDate,
        academicYear: {
          id: currentTerm.academicYear.id,
          name: currentTerm.academicYear.name
        }
      }
    })
  } catch (error) {
    console.error('Error fetching current term:', error)
    return NextResponse.json(
      { error: 'Failed to fetch current term' },
      { status: 500 }
    )
  }
}