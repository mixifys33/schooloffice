/**
 * CA Entry Management API Route
 * Handles updating and deleting CA entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 [API] /api/teacher/assessments/ca/[id] - DELETE - Starting request')
    
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

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: { id: true },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile found' },
        { status: 404 }
      )
    }

    // Await params before accessing id
    const { id: caId } = await params

    // Validate caId is a valid MongoDB ObjectID (not "new" or other invalid strings)
    if (caId === 'new' || caId.length !== 24 || !/^[a-f0-9]{24}$/i.test(caId)) {
      return NextResponse.json(
        { 
          error: 'Invalid CA entry ID',
          details: 'Cannot delete a CA entry that has not been created yet.'
        },
        { status: 400 }
      )
    }

    // Get the CA entry to identify the group
    const sampleEntry = await prisma.cAEntry.findUnique({
      where: { id: caId },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        status: true,
        name: true,
        type: true,
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
        { error: 'CA entry not found' },
        { status: 404 }
      )
    }

    // Prevent deletion of submitted entries
    if (sampleEntry.status === 'SUBMITTED' || sampleEntry.status === 'APPROVED') {
      return NextResponse.json(
        { error: 'Cannot delete submitted CA entries. Set to inactive instead.' },
        { status: 400 }
      )
    }

    // Verify teacher has access via TeacherAssignment
    const hasAccess = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId: teacher.id,
        classId: sampleEntry.student.classId,
        subjectId: sampleEntry.subjectId,
      },
    })

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete ALL CA entries with the same name, type, term, and subject
    // (one entry per student, so we delete the entire group)
    const deleteResult = await prisma.cAEntry.deleteMany({
      where: {
        name: sampleEntry.name,
        type: sampleEntry.type,
        termId: sampleEntry.termId,
        subjectId: sampleEntry.subjectId,
      },
    })

    console.log(`✅ [API] /api/teacher/assessments/ca/[id] - Successfully deleted ${deleteResult.count} CA entries`)
    
    return NextResponse.json({
      success: true,
      message: `CA entry deleted successfully (${deleteResult.count} student records removed)`,
      deletedCount: deleteResult.count,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/assessments/ca/[id] - DELETE - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to delete CA entry', details: error.message },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 [API] /api/teacher/assessments/ca/[id] - PATCH - Starting request')
    
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

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: { id: true },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile found' },
        { status: 404 }
      )
    }

    // Await params before accessing id
    const { id: caId } = await params
    const body = await request.json()
    const { status } = body

    // Validate caId is a valid MongoDB ObjectID (not "new" or other invalid strings)
    if (caId === 'new' || caId.length !== 24 || !/^[a-f0-9]{24}$/i.test(caId)) {
      return NextResponse.json(
        { 
          error: 'Invalid CA entry ID',
          details: 'Cannot update a CA entry that has not been created yet.'
        },
        { status: 400 }
      )
    }

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

    // Get the CA entry to identify the group
    const sampleEntry = await prisma.cAEntry.findUnique({
      where: { id: caId },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        name: true,
        type: true,
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
        { error: 'CA entry not found' },
        { status: 404 }
      )
    }

    // Verify teacher has access via TeacherAssignment
    const hasAccess = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId: teacher.id,
        classId: sampleEntry.student.classId,
        subjectId: sampleEntry.subjectId,
      },
    })

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Update ALL CA entries with the same name, type, term, and subject
    const updateResult = await prisma.cAEntry.updateMany({
      where: {
        name: sampleEntry.name,
        type: sampleEntry.type,
        termId: sampleEntry.termId,
        subjectId: sampleEntry.subjectId,
      },
      data: { status },
    })

    console.log(`✅ [API] /api/teacher/assessments/ca/[id] - Successfully updated ${updateResult.count} CA entry statuses`)
    
    return NextResponse.json({
      success: true,
      message: `CA entry status updated to ${status} (${updateResult.count} student records updated)`,
      updatedCount: updateResult.count,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/assessments/ca/[id] - PATCH - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to update CA entry', details: error.message },
      { status: 500 }
    )
  }
}
