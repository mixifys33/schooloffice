/**
 * DoS Grading Systems Copy API
 * POST - Copy grading system to another category
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()
    const { targetCategory, targetName } = body

    // Validate target category
    const validCategories = ['FINAL', 'EXAM_ONLY', 'CA_ONLY']
    if (!validCategories.includes(targetCategory)) {
      return NextResponse.json({ error: 'Invalid target category' }, { status: 400 })
    }

    // Find source grading system
    const sourceSystem = await prisma.gradingSystem.findFirst({
      where: { id, schoolId },
      include: { grades: true }
    })

    if (!sourceSystem) {
      return NextResponse.json({ error: 'Source grading system not found' }, { status: 404 })
    }

    // Check if target already exists
    const existing = await prisma.gradingSystem.findFirst({
      where: {
        schoolId,
        name: targetName || sourceSystem.name,
        category: targetCategory
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: `A grading system with this name already exists in ${targetCategory} category` },
        { status: 400 }
      )
    }

    // Copy grading system with all grades
    const newSystem = await prisma.gradingSystem.create({
      data: {
        schoolId,
        name: targetName || sourceSystem.name,
        category: targetCategory,
        isDefault: false,
        grades: {
          create: sourceSystem.grades.map(grade => ({
            schoolId, // Add schoolId to each grade
            grade: grade.grade,
            minScore: grade.minScore,
            maxScore: grade.maxScore,
            points: grade.points,
            remarks: grade.remarks
          }))
        }
      },
      include: { grades: true }
    })

    return NextResponse.json({
      success: true,
      message: `Grading system copied to ${targetCategory} category`,
      gradingSystem: newSystem
    })

  } catch (error: any) {
    console.error('Error copying grading system:', error)
    return NextResponse.json(
      { error: 'Failed to copy grading system', details: error.message },
      { status: 500 }
    )
  }
}
