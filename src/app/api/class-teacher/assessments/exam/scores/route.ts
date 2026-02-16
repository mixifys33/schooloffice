/**
 * Exam Scores Update API Route
 * Handles updating individual student exam scores
 * 
 * IMPORTANT: Each student has their own ExamEntry record.
 * The examId passed is just a sample entry ID to identify which exam entry group (by term/subject).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/class-teacher/assessments/exam/scores - POST - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to update scores'
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
    console.log('📝 [API] Request body:', JSON.stringify(body, null, 2))
    const { examId, scores, isDraft } = body

    if (!examId || !Array.isArray(scores)) {
      console.log('❌ [API] Missing required fields:', { examId, scoresIsArray: Array.isArray(scores), scoresLength: scores?.length })
      return NextResponse.json(
        { error: 'Missing required fields: examId and scores array' },
        { status: 400 }
      )
    }

    // Validate examId is a valid MongoDB ObjectID (not "new" or other invalid strings)
    if (examId === 'new' || examId.length !== 24 || !/^[a-f0-9]{24}$/i.test(examId)) {
      console.log('❌ [API] Invalid examId:', examId, 'length:', examId?.length)
      return NextResponse.json(
        { 
          error: 'Invalid exam entry ID',
          details: 'Please create the exam entry first before entering scores.'
        },
        { status: 400 }
      )
    }

    console.log('✅ [API] Validation passed, finding exam entry...')

    // Get one exam entry to identify the group (by term, subject)
    const sampleEntry = await prisma.examEntry.findUnique({
      where: { id: examId },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        maxScore: true,
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

    // Update scores for each student
    const updates = await Promise.all(
      scores.map(async ({ studentId, score }: { studentId: string; score: number | null }) => {
        try {
          // Find the exam entry for this specific student with matching term/subject
          const studentExamEntry = await prisma.examEntry.findFirst({
            where: {
              studentId,
              subjectId: sampleEntry.subjectId,
              termId: sampleEntry.termId,
            },
          })

          if (!studentExamEntry) {
            console.log(`⚠️ No exam entry found for student ${studentId}`)
            return null
          }

          // Update the score
          return await prisma.examEntry.update({
            where: { id: studentExamEntry.id },
            data: {
              examScore: score !== null ? score : 0,
              status: isDraft ? 'DRAFT' : 'SUBMITTED',
            },
          })
        } catch (err) {
          console.error(`❌ Error updating score for student ${studentId}:`, err)
          return null
        }
      })
    )

    const successCount = updates.filter(u => u !== null).length

    console.log(`✅ [API] /api/class-teacher/assessments/exam/scores - Successfully updated ${successCount} scores`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully updated ${successCount} student scores`,
      updatedCount: successCount,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/assessments/exam/scores - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to update scores', details: error.message },
      { status: 500 }
    )
  }
}
