/**
 * Individual Grade Range Operations
 * PATCH - Update grade range
 * DELETE - Delete grade range
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gradeId: string }> }
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

    const { id: gradingSystemId, gradeId } = await params
    const body = await request.json()
    const { grade, minScore, maxScore, points, remarks } = body

    // Check if grade range exists
    const existingGrade = await prisma.gradeRange.findFirst({
      where: {
        id: gradeId,
        gradingSystemId,
        gradingSystem: { schoolId }
      }
    })

    if (!existingGrade) {
      return NextResponse.json({ error: 'Grade range not found' }, { status: 404 })
    }

    // Validation
    if (minScore !== undefined && maxScore !== undefined && minScore >= maxScore) {
      return NextResponse.json(
        { error: 'Minimum score must be less than maximum score' },
        { status: 400 }
      )
    }

    // Update grade range
    const updatedGrade = await prisma.gradeRange.update({
      where: { id: gradeId },
      data: {
        ...(grade !== undefined && { grade: grade.trim() }),
        ...(minScore !== undefined && { minScore: parseFloat(minScore.toString()) }),
        ...(maxScore !== undefined && { maxScore: parseFloat(maxScore.toString()) }),
        ...(points !== undefined && { points: parseFloat(points.toString()) }),
        ...(remarks !== undefined && { remarks: remarks?.trim() || null })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Grade range updated successfully',
      gradeRange: updatedGrade
    })

  } catch (error: any) {
    console.error('Error updating grade range:', error)
    return NextResponse.json(
      { error: 'Failed to update grade range', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gradeId: string }> }
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

    const { id: gradingSystemId, gradeId } = await params

    // Check if grade range exists
    const existingGrade = await prisma.gradeRange.findFirst({
      where: {
        id: gradeId,
        gradingSystemId,
        gradingSystem: { schoolId }
      }
    })

    if (!existingGrade) {
      return NextResponse.json({ error: 'Grade range not found' }, { status: 404 })
    }

    // Delete grade range
    await prisma.gradeRange.delete({
      where: { id: gradeId }
    })

    return NextResponse.json({
      success: true,
      message: 'Grade range deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting grade range:', error)
    return NextResponse.json(
      { error: 'Failed to delete grade range', details: error.message },
      { status: 500 }
    )
  }
}
