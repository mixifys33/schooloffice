/**
 * DoS Grading Systems API
 * GET - Fetch all grading systems
 * POST - Create new grading system
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'No school context found' }, { status: 400 })
    }

    // Verify DoS role
    const userRole = session.user.activeRole || session.user.role
    const isDoS = userRole === Role.SCHOOL_ADMIN || userRole === StaffRole.DOS
    
    if (!isDoS) {
      return NextResponse.json({ error: 'Access denied. DoS role required.' }, { status: 403 })
    }

    // Fetch all grading systems for the school
    const gradingSystems = await prisma.gradingSystem.findMany({
      where: { schoolId },
      include: {
        grades: {
          orderBy: { minScore: 'desc' }
        },
        class: {
          select: { id: true, name: true }
        },
        term: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ gradingSystems })

  } catch (error: any) {
    console.error('Error fetching grading systems:', error)
    return NextResponse.json(
      { error: 'Failed to fetch grading systems', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'No school context found' }, { status: 400 })
    }

    // Verify DoS role
    const userRole = session.user.activeRole || session.user.role
    const isDoS = userRole === Role.SCHOOL_ADMIN || userRole === StaffRole.DOS
    
    if (!isDoS) {
      return NextResponse.json({ error: 'Access denied. DoS role required.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, category = 'FINAL', classId = null, termId = null } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'System name is required' }, { status: 400 })
    }

    // Validate category
    const validCategories = ['FINAL', 'EXAM_ONLY', 'CA_ONLY']
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    // Validate class if provided
    if (classId) {
      const classExists = await prisma.class.findFirst({
        where: { id: classId, schoolId }
      })
      if (!classExists) {
        return NextResponse.json({ error: 'Invalid class selected' }, { status: 400 })
      }
    }

    // Validate term if provided
    if (termId) {
      const termExists = await prisma.term.findFirst({
        where: { id: termId, academicYear: { schoolId } }
      })
      if (!termExists) {
        return NextResponse.json({ error: 'Invalid term selected' }, { status: 400 })
      }
    }

    // Check if name already exists for this category/class/term combination
    const existing = await prisma.gradingSystem.findFirst({
      where: {
        schoolId,
        name: name.trim(),
        category,
        classId: classId || null,
        termId: termId || null
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: `A grading system with this name already exists for the selected options` },
        { status: 400 }
      )
    }

    // Create grading system
    const gradingSystem = await prisma.gradingSystem.create({
      data: {
        schoolId,
        name: name.trim(),
        category,
        classId: classId || undefined,
        termId: termId || undefined
      },
      include: {
        grades: true,
        class: true,
        term: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Grading system created successfully',
      gradingSystem
    })

  } catch (error: any) {
    console.error('Error creating grading system:', error)
    return NextResponse.json(
      { error: 'Failed to create grading system', details: error.message },
      { status: 500 }
    )
  }
}
