import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    const body = await request.json()
    const { classId, assignments } = body

    if (!classId || !Array.isArray(assignments)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    // Verify class belongs to school
    const classExists = await prisma.class.findFirst({
      where: { id: classId, schoolId }
    })

    if (!classExists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Get existing curriculum subjects for this class
    const existing = await prisma.curriculumSubject.findMany({
      where: { classId, schoolId }
    })

    const existingSubjectIds = new Set(existing.map(e => e.subjectId))
    const newSubjectIds = new Set(assignments.map((a: any) => a.subjectId))

    // Delete curriculum subjects that are no longer assigned
    const toDelete = existing.filter(e => !newSubjectIds.has(e.subjectId))
    if (toDelete.length > 0) {
      await prisma.curriculumSubject.deleteMany({
        where: {
          id: { in: toDelete.map(d => d.id) }
        }
      })
    }

    // Create or update curriculum subjects
    for (const assignment of assignments) {
      const { subjectId, markStructure } = assignment

      // Verify subject exists and belongs to school
      const subject = await prisma.subject.findFirst({
        where: { id: subjectId, schoolId }
      })

      if (!subject) {
        continue // Skip invalid subjects
      }

      if (existingSubjectIds.has(subjectId)) {
        // Update existing
        await prisma.curriculumSubject.updateMany({
          where: { classId, subjectId, schoolId },
          data: {
            isActive: true,
            updatedAt: new Date()
          }
        })
      } else {
        // Create new
        await prisma.curriculumSubject.create({
          data: {
            schoolId,
            classId,
            subjectId,
            isCore: true,
            caWeight: 40,
            examWeight: 60,
            minPassMark: 50,
            periodsPerWeek: 4,
            isActive: true,
            dosApproved: false
          }
        })
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Class subjects updated successfully'
    })

  } catch (error) {
    console.error('Error updating class subjects:', error)
    return NextResponse.json(
      { error: 'Failed to update class subjects' },
      { status: 500 }
    )
  }
}
