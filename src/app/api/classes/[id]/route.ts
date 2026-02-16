/**
 * Class Detail API Route
 * Requirements: 4.2 - Display assigned class teacher and subject teachers
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export interface ClassDetailResponse {
  id: string
  name: string
  level: number
  levelType?: 'O_LEVEL' | 'A_LEVEL' | null
  streams: {
    id: string
    name: string
    studentCount: number
  }[]
  classTeacher: {
    id: string
    firstName: string
    lastName: string
    email: string | null
  } | null
  subjectTeachers: {
    staffId: string
    firstName: string
    lastName: string
    subjects: {
      id: string
      name: string
      code: string
    }[]
  }[]
  studentCount: number
  assignedSubjects?: {
    id: string
    subjectId: string
    subjectName: string
    subjectCode: string
    isCompulsory: boolean
  }[]
}

// GET: Get class details with teachers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Get class with streams
    const classRecord = await prisma.class.findFirst({
      where: { 
        id,
        schoolId 
      },
      include: {
        streams: {
          orderBy: { name: 'asc' },
        },
      },
    })

    if (!classRecord) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Get student counts per stream
    const streamStudentCounts = await prisma.student.groupBy({
      by: ['streamId'],
      where: {
        classId: id,
        streamId: { not: null },
      },
      _count: true,
    })

    const streamCountMap = new Map(
      streamStudentCounts.map(s => [s.streamId, s._count])
    )

    // Get total student count for the class
    const totalStudentCount = await prisma.student.count({
      where: { classId: id },
    })

    // Get staff assigned to this class (class teachers)
    const staffClasses = await prisma.staffClass.findMany({
      where: { classId: id },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    })

    // Find the class teacher (first assigned staff or one with TEACHER role)
    const classTeacherAssignment = staffClasses.find(
      sc => sc.staff.role === 'TEACHER'
    ) || staffClasses[0]

    // Get subject teachers for this class
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId: id },
      include: {
        subject: true,
      },
    })

    // Prepare assigned subjects for O-Level classes
    const assignedSubjects = classRecord.levelType === 'O_LEVEL' 
      ? classSubjects.map(cs => ({
          id: cs.id,
          subjectId: cs.subject.id,
          subjectName: cs.subject.name,
          subjectCode: cs.subject.code,
          isCompulsory: cs.subject.isCompulsory ?? true,
        }))
      : undefined

    // Get staff who teach subjects in this class
    const subjectIds = classSubjects.map(cs => cs.subjectId)
    const staffSubjects = await prisma.staffSubject.findMany({
      where: {
        subjectId: { in: subjectIds },
        staff: { schoolId },
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    // Group subjects by teacher
    const teacherSubjectsMap = new Map<string, {
      staffId: string
      firstName: string
      lastName: string
      subjects: { id: string; name: string; code: string }[]
    }>()

    for (const ss of staffSubjects) {
      const existing = teacherSubjectsMap.get(ss.staffId)
      if (existing) {
        existing.subjects.push({
          id: ss.subject.id,
          name: ss.subject.name,
          code: ss.subject.code,
        })
      } else {
        teacherSubjectsMap.set(ss.staffId, {
          staffId: ss.staff.id,
          firstName: ss.staff.firstName,
          lastName: ss.staff.lastName,
          subjects: [{
            id: ss.subject.id,
            name: ss.subject.name,
            code: ss.subject.code,
          }],
        })
      }
    }

    const result: ClassDetailResponse = {
      id: classRecord.id,
      name: classRecord.name,
      level: classRecord.level,
      levelType: classRecord.levelType,
      streams: classRecord.streams.map(s => ({
        id: s.id,
        name: s.name,
        studentCount: streamCountMap.get(s.id) || 0,
      })),
      classTeacher: classTeacherAssignment ? {
        id: classTeacherAssignment.staff.id,
        firstName: classTeacherAssignment.staff.firstName,
        lastName: classTeacherAssignment.staff.lastName,
        email: classTeacherAssignment.staff.email,
      } : null,
      subjectTeachers: Array.from(teacherSubjectsMap.values()),
      studentCount: totalStudentCount,
      assignedSubjects,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching class details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class details' },
      { status: 500 }
    )
  }
}

// PUT: Update class (including teacher assignment)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()
    const { name, level, levelType, classTeacherId } = body

    // Validate levelType if provided
    if (levelType && !['O_LEVEL', 'A_LEVEL'].includes(levelType)) {
      return NextResponse.json(
        { error: 'Invalid level type. Must be O_LEVEL or A_LEVEL' },
        { status: 400 }
      )
    }

    // Verify class belongs to school
    const existingClass = await prisma.class.findFirst({
      where: { id, schoolId },
    })

    if (!existingClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existingClass.name) {
      const duplicateClass = await prisma.class.findFirst({
        where: {
          schoolId,
          name,
          id: { not: id },
        },
      })

      if (duplicateClass) {
        return NextResponse.json(
          { error: `Class with name "${name}" already exists` },
          { status: 400 }
        )
      }
    }

    // Update class
    const updateData: { name?: string; level?: number; levelType?: string } = {}
    if (name) updateData.name = name
    if (level !== undefined) updateData.level = level
    if (levelType) updateData.levelType = levelType

    const updatedClass = await prisma.class.update({
      where: { id },
      data: updateData,
    })

    // Update class teacher assignment if provided
    if (classTeacherId !== undefined) {
      // Remove existing class teacher assignments
      await prisma.staffClass.deleteMany({
        where: { classId: id },
      })

      // Add new class teacher if provided
      if (classTeacherId) {
        // Verify staff belongs to school
        const staff = await prisma.staff.findFirst({
          where: { id: classTeacherId, schoolId },
        })

        if (!staff) {
          return NextResponse.json(
            { error: 'Staff not found' },
            { status: 400 }
          )
        }

        await prisma.staffClass.create({
          data: {
            staffId: classTeacherId,
            classId: id,
          },
        })
      }
    }

    return NextResponse.json({
      id: updatedClass.id,
      name: updatedClass.name,
      level: updatedClass.level,
    })
  } catch (error) {
    console.error('Error updating class:', error)
    return NextResponse.json(
      { error: 'Failed to update class' },
      { status: 500 }
    )
  }
}
