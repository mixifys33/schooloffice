/**
 * Teacher Exam Entry Scores API Route
 * Handles saving individual exam scores
 * Based on class-teacher implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/marks/exam-entry/scores - POST - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to save scores'
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
    const { examId, scores, isDraft } = body

    if (!examId || !scores || !Array.isArray(scores)) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'examId and scores array are required'
        },
        { status: 400 }
      )
    }

    // If examId is 'pending', return error - entries must be created first
    if (examId === 'pending' || examId.length !== 24) {
      return NextResponse.json(
        { 
          error: 'Exam entries not created yet',
          details: 'Please save manually first to create exam entries.'
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

    // Update scores for each student
    const updatedCount = await Promise.all(
      scores.map(async (scoreEntry: { studentId: string; score: number | null }) => {
        const { studentId, score } = scoreEntry

        // Find the exam entry for this student
        const examEntry = await prisma.examEntry.findFirst({
          where: {
            studentId: studentId,
            subjectId: sampleEntry.subjectId,
            termId: sampleEntry.termId,
          },
        })

        if (!examEntry) {
          console.warn(`⚠️ No exam entry found for student ${studentId}`)
          return null
        }

        // Update the exam entry
        return await prisma.examEntry.update({
          where: { id: examEntry.id },
          data: {
            examScore: score ?? 0,
            examDate: new Date(),
            status: isDraft ? 'DRAFT' : 'SUBMITTED',
          },
        })
      })
    )

    const successCount = updatedCount.filter(e => e !== null).length

    console.log(`✅ [API] /api/teacher/marks/exam-entry/scores - POST - Successfully updated ${successCount} scores`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully updated ${successCount} exam scores`,
      updatedCount: successCount,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/exam-entry/scores - POST - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to save scores',
        details: error.message || 'An unexpected error occurred.'
      },
      { status: 500 }
    )
  }
}
