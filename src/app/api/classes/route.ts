/**
 * Classes API Route
 * Requirements: 4.1 - Display all classes with their streams
 * Requirements: 4.3 - Create class with name uniqueness validation
 * Requirements: 6.1, 6.2 - Tenant isolation for all queries
 * Requirements: 9.4 - Teachers can only view their assigned classes
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { getTeacherAssignments } from '@/lib/teacher-access'
import { 
  tenantIsolationService, 
  TenantContext, 
  TenantIsolationError 
} from '@/services/tenant-isolation.service'

export interface ClassWithStreams {
  id: string
  name: string
  level: number
  streams: {
    id: string
    name: string
  }[]
}

// GET: List classes with streams for the school
// Requirement 6.1: All queries scoped by school_id
// Requirement 9.4: Teachers can only view their assigned classes
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
    const userRole = session.user.role as Role
    const userId = session.user.id as string
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Create tenant context for isolation (Requirement 6.1)
    const tenantContext: TenantContext = {
      schoolId,
      userId,
      role: userRole,
    }

    // Build where clause with tenant scoping (Requirement 6.1)
    const where: Record<string, unknown> = tenantIsolationService.scopeQuery({}, tenantContext)

    // Requirement 9.4: Teachers can only view their assigned classes
    if (userRole === Role.TEACHER) {
      const assignments = await getTeacherAssignments(userId)
      if (!assignments || assignments.classIds.length === 0) {
        // Teacher has no class assignments - return empty result
        return NextResponse.json([])
      }
      where.id = { in: assignments.classIds }
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        streams: {
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            students: true
          }
        }
      },
      orderBy: { level: 'asc' },
    })

    const result: ClassWithStreams[] = classes.map((c) => ({
      id: c.id,
      name: c.name,
      level: c.level,
      streams: c.streams.map((s) => ({
        id: s.id,
        name: s.name,
      })),
    }))

    // Return in format expected by message-composer: { classes: [...] }
    return NextResponse.json({ classes: classes.map(c => ({
      id: c.id,
      name: c.name,
      level: c.level,
      _count: (c as typeof c & { _count: { students: number } })._count,
      streams: c.streams
    })) })
  } catch (error) {
    // Handle tenant isolation errors specifically (Requirement 6.4)
    if (error instanceof TenantIsolationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error('Error fetching classes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    )
  }
}

// POST: Create a new class
// Requirement 6.1: All queries scoped by school_id
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
    const userId = session.user.id as string
    
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Create tenant context for isolation (Requirement 6.1)
    const tenantContext: TenantContext = {
      schoolId,
      userId,
      role: userRole,
    }

    const body = await request.json()
    const { name, level } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Class name is required' },
        { status: 400 }
      )
    }

    if (level === undefined || typeof level !== 'number') {
      return NextResponse.json(
        { error: 'Class level is required' },
        { status: 400 }
      )
    }

    // Check for duplicate class name with tenant scoping (Requirement 4.3, 6.1)
    const existingClass = await prisma.class.findFirst({
      where: tenantIsolationService.scopeQuery(
        { name: name.trim() },
        tenantContext
      ),
    })

    if (existingClass) {
      return NextResponse.json(
        { error: `Class with name "${name}" already exists in this school` },
        { status: 400 }
      )
    }

    // Create the class with tenant scoping
    const newClass = await prisma.class.create({
      data: {
        schoolId,
        name: name.trim(),
        level,
      },
    })

    return NextResponse.json({
      id: newClass.id,
      name: newClass.name,
      level: newClass.level,
    }, { status: 201 })
  } catch (error) {
    // Handle tenant isolation errors specifically (Requirement 6.4)
    if (error instanceof TenantIsolationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }
    console.error('Error creating class:', error)
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    )
  }
}
