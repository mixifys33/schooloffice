/**
 * Grade Ranges Management
 * POST - Add new grade range
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

    const { id: gradingSystemId } = await params
    const body = await request.json()
    const { grade, minScore, maxScore, points, remarks } = body

    // Validation
    if (!grade?.trim()) {
      return NextResponse.json({ error: 'Grade letter is required' }, { status: 400 })
    }

    if (minScore === undefined || maxScore === undefined) {
      return NextResponse.json({ error: 'Score range is required' }, { status: 400 })
    }

    if (minScore >= maxScore) {
      return NextResponse.json(
        { error: 'Minimum score must be less than maximum score' },
        { status: 400 }
      )
    }

    if (minScore < 0 || maxScore > 100) {
      return NextResponse.json(
        { error: 'Scores must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Check if grading system exists
    const gradingSystem = await prisma.gradingSystem.findFirst({
      where: { id: gradingSystemId, schoolId }
    })

    if (!gradingSystem) {
      return NextResponse.json({ error: 'Grading system not found' }, { status: 404 })
    }

    // Check for overlapping ranges
    const overlapping = await prisma.gradeRange.findFirst({
      where: {
        gradingSystemId,
        OR: [
          { AND: [{ minScore: { lte: minScore } }, { maxScore: { gte: minScore } }] },
          { AND: [{ minScore: { lte: maxScore } }, { maxScore: { gte: maxScore } }] },
          { AND: [{ minScore: { gte: minScore } }, { maxScore: { lte: maxScore } }] }
        ]
      }
    })

    if (overlapping) {
      return NextResponse.json(
        { error: `Score range overlaps with existing grade "${overlapping.grade}" (${overlapping.minScore}-${overlapping.maxScore})` },
        { status: 400 }
      )
    }

    // Create grade range
    const gradeRange = await prisma.gradeRange.create({
      data: {
        gradingSystemId,
        grade: grade.trim(),
        minScore: parseFloat(minScore.toString()),
        maxScore: parseFloat(maxScore.toString()),
        points: parseFloat(points?.toString() || '0'),
        remarks: remarks?.trim() || null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Grade range added successfully',
      gradeRange
    })

  } catch (error: any) {
    console.error('Error adding grade range:', error)
    return NextResponse.json(
      { error: 'Failed to add grade range', details: error.message },
      { status: 500 }
    )
  }
}
