import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    const { id: classId } = await params

    // Verify class belongs to school
    const classExists = await prisma.class.findFirst({
      where: { id: classId, schoolId }
    })

    if (!classExists) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Get curriculum subjects for this class
    const curriculumSubjects = await prisma.curriculumSubject.findMany({
      where: {
        classId,
        schoolId,
        isActive: true
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true
          }
        }
      }
    })

    // Transform to match expected format
    const classSubjects = curriculumSubjects.map(cs => ({
      id: cs.id,
      maxMark: 100, // Default, can be customized later
      appearsOnReport: true,
      affectsPosition: true,
      subject: cs.subject
    }))

    return NextResponse.json({
      classSubjects
    })

  } catch (error) {
    console.error('Error fetching class subjects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class subjects' },
      { status: 500 }
    )
  }
}
