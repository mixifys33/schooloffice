/**
 * Exam Entry Management API Route
 * Handles updating and deleting exam entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 [API] /api/class-teacher/assessments/exam/[id] - DELETE - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: { id: true },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'No staff profile found' },
        { status: 404 }
      )
    }

    // Await params before accessing id
    const { id: examId } = await params

    // Get the exam entry to identify the group
    const sampleEntry = await prisma.examEntry.findUnique({
      where: { id: examId },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        status: true,
        termId: true,
        student: {
          select: {
            classId: true,
          },
        },
      },
    })

    if (!sampleEntry) {
      return NextResponse.json(
        { error: 'Exam entry not found' },
        { status: 404 }
      )
    }

    // Prevent deletion of submitted entries
    if (sampleEntry.status === 'SUBMITTED' || sampleEntry.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Cannot delete submitted exam entries. Set to inactive instead.' },
        { status: 400 }
      )
    }

    // Verify teacher has access
    const hasAccess = await prisma.staffSubject.findFirst({
      where: {
        staffId: staff.id,
        classId: sampleEntry.student.classId,
        subjectId: sampleEntry.subjectId,
      },
    }) || await prisma.staffClass.findFirst({
      where: {
        staffId: staff.id,
        classId: sampleEntry.student.classId,
      },
    })

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete ALL exam entries with the same term and subject
    // (one entry per student, so we delete the entire group)
    const deleteResult = await prisma.examEntry.deleteMany({
      where: {
        termId: sampleEntry.termId,
        subjectId: sampleEntry.subjectId,
      },
    })

    console.log(`✅ [API] /api/class-teacher/assessments/exam/[id] - Successfully deleted ${deleteResult.count} exam entries`)
    
    return NextResponse.json({
      success: true,
      message: `Exam entry deleted successfully (${deleteResult.count} student records removed)`,
      deletedCount: deleteResult.count,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/assessments/exam/[id] - DELETE - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to delete exam entry', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 [API] /api/class-teacher/assessments/exam/[id] - PATCH - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: { id: true },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'No staff profile found' },
        { status: 404 }
      )
    }

    // Await params before accessing id
    const { id: examId } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Missing required field: status' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      )
    }

    // Get the exam entry to identify the group
    const sampleEntry = await prisma.examEntry.findUnique({
      where: { id: examId },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        termId: true,
        student: {
          select: {
            classId: true,
          },
        },
      },
    })

    if (!sampleEntry) {
      return NextResponse.json(
        { error: 'Exam entry not found' },
        { status: 404 }
      )
    }

    // Verify teacher has access
    const hasAccess = await prisma.staffSubject.findFirst({
      where: {
        staffId: staff.id,
        classId: sampleEntry.student.classId,
        subjectId: sampleEntry.subjectId,
      },
    }) || await prisma.staffClass.findFirst({
      where: {
        staffId: staff.id,
        classId: sampleEntry.student.classId,
      },
    })

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Update ALL exam entries with the same term and subject
    const updateResult = await prisma.examEntry.updateMany({
      where: {
        termId: sampleEntry.termId,
        subjectId: sampleEntry.subjectId,
      },
      data: { status },
    })

    console.log(`✅ [API] /api/class-teacher/assessments/exam/[id] - Successfully updated ${updateResult.count} exam entry statuses`)
    
    return NextResponse.json({
      success: true,
      message: `Exam entry status updated to ${status} (${updateResult.count} student records updated)`,
      updatedCount: updateResult.count,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/assessments/exam/[id] - PATCH - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to update exam entry', details: error.message },
      { status: 500 }
    )
  }
}
