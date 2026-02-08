import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/dos/subjects - Get all subjects
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    // Get user's school context
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        staff: {
          include: {
            school: true
          }
        }
      }
    })

    if (!user?.staff?.school) {
      return NextResponse.json({ error: 'School context not found' }, { status: 404 })
    }

    const schoolId = user.staff.school.id

    // Fetch subjects for the school
    const subjects = await prisma.subject.findMany({
      where: {
        schoolId: schoolId
      },
      include: {
        classSubjects: {
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        staffSubjects: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            class: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({ 
      subjects,
      total: subjects.length,
      active: subjects.filter(s => s.isActive).length
    })

  } catch (error) {
    console.error('Error fetching subjects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's school context
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        staff: {
          include: {
            school: true
          }
        }
      }
    })

    if (!user?.staff?.school) {
      return NextResponse.json({ error: 'School context not found' }, { status: 404 })
    }

    const schoolId = user.staff.school.id
    const body = await request.json()
    const { name, code, educationLevel } = body

    // Validate required fields
    if (!name || !code || !educationLevel) {
      return NextResponse.json(
        { error: 'Name, code, and education level are required' },
        { status: 400 }
      )
    }

    // Check if subject code already exists in this school
    const existingSubject = await prisma.subject.findFirst({
      where: {
        schoolId: schoolId,
        code: code.toUpperCase()
      }
    })

    if (existingSubject) {
      return NextResponse.json(
        { error: 'Subject code already exists' },
        { status: 409 }
      )
    }

    // Create the subject
    const subject = await prisma.subject.create({
      data: {
        name: name.trim(),
        code: code.toUpperCase().trim(),
        educationLevel,
        schoolId: schoolId,
        isActive: true,
        createdBy: session.user.id
      },
      include: {
        classSubjects: {
          include: {
            class: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        staffSubjects: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            class: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ 
      subject,
      message: 'Subject created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating subject:', error)
    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    )
  }
}