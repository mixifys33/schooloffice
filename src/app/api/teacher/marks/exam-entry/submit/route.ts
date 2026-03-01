/**
 * Teacher Exam Entry Submit API Route
 * Handles final submission of exam scores
 * Based on class-teacher implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/marks/exam-entry/submit - POST - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to submit scores'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { 
          error: 'No school context found',
          details: 'Your account is not linked to a school.'
        },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { examId } = body

    if (!examId) {
      return NextResponse.json(
        { 
          error: 'Missing required field',
          details: 'examId is required'
        },
        { status: 400 }
      )
    }

    // If examId is 'pending', return error
    if (examId === 'pending' || examId.length !== 24) {
      return NextResponse.json(
        { 
          error: 'Exam entries not created yet',
          details: 'Please save your scores first before submitting.'
        },
        { status: 404 }
      )
    }

    // Get one exam entry to verify it exists and get term/subject info
    const sampleEntry = await prisma.examEntry.findUnique({
      where: { id: examId },
      select: {
        id: true,
        termId: true,
        subjectId: true,
        schoolId: true,
        student: {
          select: {
            classId: true,
          },
        },
      },
    })

    if (!sampleEntry || sampleEntry.schoolId !== schoolId) {
      return NextResponse.json(
        { 
          error: 'Exam entry not found',
          details: 'The specified exam entry could not be found.'
        },
        { status: 404 }
      )
    }

    // Get all exam entries for this term, subject, and class
    const classId = sampleEntry.student.classId

    // Get all students in the class
    const students = await prisma.student.findMany({
      where: {
        classId: classId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    })

    // Update all exam entries to SUBMITTED status
    const updateResult = await prisma.examEntry.updateMany({
      where: {
        termId: sampleEntry.termId,
        subjectId: sampleEntry.subjectId,
        studentId: { in: students.map(s => s.id) },
      },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    })

    console.log(`✅ [API] /api/teacher/marks/exam-entry/submit - POST - Successfully submitted ${updateResult.count} exam entries`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully submitted exam scores for ${updateResult.count} students`,
      submittedCount: updateResult.count,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/exam-entry/submit - POST - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to submit scores',
        details: error.message || 'An unexpected error occurred.'
      },
      { status: 500 }
    )
  }
}
