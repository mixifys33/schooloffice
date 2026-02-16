/**
 * CA Scores Update API Route
 * Handles updating individual student CA scores
 * 
 * IMPORTANT: Each student has their own CAEntry record.
 * The caId passed is just a sample entry ID to identify which CA entry group (by name/type).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/class-teacher/assessments/ca/scores - POST - Starting request')
    
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
    const { caId, scores, isDraft } = body

    if (!caId || !Array.isArray(scores)) {
      return NextResponse.json(
        { error: 'Missing required fields: caId and scores array' },
        { status: 400 }
      )
    }

    // Validate caId is a valid MongoDB ObjectID (not "new" or other invalid strings)
    if (caId === 'new' || caId.length !== 24 || !/^[a-f0-9]{24}$/i.test(caId)) {
      return NextResponse.json(
        { 
          error: 'Invalid CA entry ID',
          details: 'Please create the CA entry first before entering scores. Click "Create CA Entry" button.'
        },
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
        maxScore: true,
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
          // Find the CA entry for this specific student with matching name/type
          const studentCaEntry = await prisma.cAEntry.findFirst({
            where: {
              studentId,
              subjectId: sampleEntry.subjectId,
              termId: sampleEntry.termId,
              name: sampleEntry.name,
              type: sampleEntry.type,
            },
          })

          if (!studentCaEntry) {
            console.log(`⚠️ No CA entry found for student ${studentId}`)
            return null
          }

          // Update the score
          return await prisma.cAEntry.update({
            where: { id: studentCaEntry.id },
            data: {
              rawScore: score !== null ? score : 0,
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

    console.log(`✅ [API] /api/class-teacher/assessments/ca/scores - Successfully updated ${successCount} scores`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully updated ${successCount} student scores`,
      updatedCount: successCount,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/assessments/ca/scores - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to update scores', details: error.message },
      { status: 500 }
    )
  }
}
