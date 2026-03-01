/**
 * CA Submission API Route
 * Handles submitting CA scores for final approval
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/assessments/ca/submit - POST - Starting request')
    
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

    // Parse request body
    const body = await request.json()
    const { caId } = body

    if (!caId) {
      return NextResponse.json(
        { error: 'Missing required field: caId' },
        { status: 400 }
      )
    }

    // Get one CA entry to identify the group (by name, type, term, subject)
    const sampleEntry = await prisma.cAEntry.findUnique({
      where: { id: caId },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        name: true,
        type: true,
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

    // Check if already submitted
    if (sampleEntry.status === 'SUBMITTED' || sampleEntry.status === 'APPROVED') {
      return NextResponse.json(
        { 
          success: true,
          message: 'CA scores have already been submitted',
          alreadySubmitted: true,
        },
        { status: 200 }
      )
    }

    // Get all CA entries in this group to check if any have scores
    const allEntries = await prisma.cAEntry.findMany({
      where: {
        name: sampleEntry.name,
        type: sampleEntry.type,
        termId: sampleEntry.termId,
        subjectId: sampleEntry.subjectId,
      },
      select: {
        id: true,
        rawScore: true,
        status: true,
      },
    })

    // Check if at least some entries have scores (not all zeros)
    const hasScores = allEntries.some(entry => entry.rawScore > 0)
    
    if (!hasScores) {
      return NextResponse.json(
        { 
          error: 'Cannot submit without any scores',
          details: 'Please enter at least some scores before submitting.'
        },
        { status: 400 }
      )
    }

    // Update all CA entries with the same name, type, term, and subject to SUBMITTED
    const updateResult = await prisma.cAEntry.updateMany({
      where: {
        name: sampleEntry.name,
        type: sampleEntry.type,
        termId: sampleEntry.termId,
        subjectId: sampleEntry.subjectId,
      },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    })

    console.log(`✅ [API] /api/teacher/assessments/ca/submit - Successfully submitted ${updateResult.count} CA entries`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully submitted CA scores for ${updateResult.count} students`,
      submittedCount: updateResult.count,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/assessments/ca/submit - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to submit CA scores', details: error.message },
      { status: 500 }
    )
  }
}
