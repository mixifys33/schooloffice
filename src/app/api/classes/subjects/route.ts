import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

/**
 * CLASS-SUBJECT RELATIONSHIPS API
 * 
 * Returns the curriculum subjects (which subjects are offered by which classes).
 * This is used by the assignments page to populate the subject dropdown
 * based on the selected class.
 */

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    // Fetch all curriculum subjects (class-subject relationships)
    const curriculumSubjects = await prisma.curriculumSubject.findMany({
      where: {
        isActive: true,
        class: {
          schoolId,
          isActive: true
        },
        subject: {
          isActive: true
        }
      },
      select: {
        classId: true,
        subjectId: true,
        class: {
          select: {
            name: true
          }
        },
        subject: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: [
        { class: { name: 'asc' } },
        { subject: { name: 'asc' } }
      ]
    })

    // Transform to simple relationship format
    const relationships = curriculumSubjects.map(cs => ({
      classId: cs.classId,
      subjectId: cs.subjectId,
      className: cs.class.name,
      subjectName: cs.subject.name,
      subjectCode: cs.subject.code
    }))

    return NextResponse.json({
      relationships,
      count: relationships.length
    })

  } catch (error) {
    console.error('Error fetching class-subject relationships:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class-subject relationships' },
      { status: 500 }
    )
  }
}