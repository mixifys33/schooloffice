/**
 * Exam Submission API Route
 * Handles submitting exam scores for final approval
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/class-teacher/assessments/exam/submit - POST - Starting request')
    
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

    // Parse request body
    const body = await request.json()
    const { examId } = body

    if (!examId) {
      return NextResponse.json(
        { error: 'Missing required field: examId' },
        { status: 400 }
      )
    }

    // Get one exam entry to identify the group (by term, subject)
    const sampleEntry = await prisma.examEntry.findUnique({
      where: { id: examId },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        termId: true,
        status: true,
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

    // Check if already submitted
    if (sampleEntry.status === 'SUBMITTED' || sampleEntry.status === 'APPROVED') {
      return NextResponse.json(
        { 
          success: true,
          message: 'Exam scores have already been submitted',
          alreadySubmitted: true,
        },
        { status: 200 }
      )
    }

    // Get all exam entries in this group to check if any have scores
    const allEntries = await prisma.examEntry.findMany({
      where: {
        termId: sampleEntry.termId,
        subjectId: sampleEntry.subjectId,
      },
      select: {
        id: true,
        examScore: true,
        status: true,
      },
    })

    // Check if at least some entries have scores (not all zeros)
    const hasScores = allEntries.some(entry => entry.examScore > 0)
    
    if (!hasScores) {
      return NextResponse.json(
        { 
          error: 'Cannot submit without any scores',
          details: 'Please enter at least some scores before submitting.'
        },
        { status: 400 }
      )
    }

    // Update all exam entries with the same term and subject to SUBMITTED
    const updateResult = await prisma.examEntry.updateMany({
      where: {
        termId: sampleEntry.termId,
        subjectId: sampleEntry.subjectId,
      },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    })

    console.log(`✅ [API] /api/class-teacher/assessments/exam/submit - Successfully submitted ${updateResult.count} exam entries`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully submitted exam scores for ${updateResult.count} students`,
      submittedCount: updateResult.count,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/assessments/exam/submit - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to submit exam scores', details: error.message },
      { status: 500 }
    )
  }
}
