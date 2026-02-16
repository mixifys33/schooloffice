/**
 * Subjects API Route
 * Requirements: 9.3 - Support subject assignment to teachers
 * Requirements: 11.2 - Subject management CRUD operations
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { canWrite } from '@/lib/rbac'
import { Role } from '@/types/enums'

export interface SubjectListItem {
  id: string
  name: string
  code: string
  levelType?: 'O_LEVEL' | 'A_LEVEL' | null
  isCompulsory?: boolean
  teacherCount?: number
  classCount?: number
}

// GET: List subjects for the school
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const activeParam = searchParams.get('active')
    
    const whereClause: any = { schoolId }
    
    // Filter by active status if specified
    if (activeParam !== null) {
      whereClause.isActive = activeParam === 'true'
    }

    const subjects = await prisma.subject.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            staffSubjects: true,
            classSubjects: true,
          }
        }
      },
      orderBy: { name: 'asc' },
    })

    const result: SubjectListItem[] = subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      levelType: subject.levelType,
      isCompulsory: subject.isCompulsory,
      teacherCount: subject._count.staffSubjects,
      classCount: subject._count.classSubjects,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching subjects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subjects' },
      { status: 500 }
    )
  }
}

// POST: Create a new subject
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Check write permission for subjects
    if (!canWrite(userRole, 'subject')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to create subjects' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, code, levelType, isCompulsory } = body

    // Validate required fields
    if (!name || !code || !levelType) {
      return NextResponse.json(
        { error: 'Name, code, and level type are required' },
        { status: 400 }
      )
    }

    // Validate levelType
    if (!['O_LEVEL', 'A_LEVEL'].includes(levelType)) {
      return NextResponse.json(
        { error: 'Invalid level type. Must be O_LEVEL or A_LEVEL' },
        { status: 400 }
      )
    }

    // Check for duplicate code within the school
    const existingSubject = await prisma.subject.findFirst({
      where: {
        schoolId,
        code: code.toUpperCase(),
      },
    })

    if (existingSubject) {
      return NextResponse.json(
        { error: 'A subject with this code already exists' },
        { status: 409 }
      )
    }

    // Create the subject
    // For A-Level subjects, isCompulsory is always false (not applicable)
    const subject = await prisma.subject.create({
      data: {
        schoolId,
        name: name.trim(),
        code: code.toUpperCase().trim(),
        levelType: levelType,
        isCompulsory: levelType === 'O_LEVEL' ? (isCompulsory ?? true) : false,
        educationLevel: 'SECONDARY', // Default to SECONDARY for O/A Level
        isActive: true,
      },
    })

    return NextResponse.json({
      id: subject.id,
      name: subject.name,
      code: subject.code,
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating subject:', error)
    return NextResponse.json(
      { error: 'Failed to create subject' },
      { status: 500 }
    )
  }
}
