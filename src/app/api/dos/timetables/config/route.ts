/**
 * TIMETABLE CONFIGURATION API
 * 
 * DoS-only endpoints for configuring the foundational data that drives
 * the timetable generation engine.
 * 
 * This is the CONFIGURATION LAYER - where 90% of failures are prevented.
 * 
 * CONFIGURATION AREAS:
 * - School time structure (periods, breaks, duration)
 * - Subject period requirements (new curriculum compliance)
 * - Teacher constraints (workload, availability)
 * - Room constraints (capacity, equipment, availability)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { timetableService } from '@/services/timetable.service'
import { 
  SchoolTimeStructure,
  SubjectPeriodRequirement,
  TeacherConstraint,
  RoomConstraint 
} from '@/types/timetable'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const configType = searchParams.get('type')
    const schoolId = searchParams.get('schoolId') || session.user.schoolId

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 })
    }

    switch (configType) {
      case 'time-structure':
        const timeStructure = await prisma.schoolTimeStructure.findFirst({
          where: { schoolId, isActive: true }
        })
        return NextResponse.json({ timeStructure })

      case 'subject-requirements':
        const subjectRequirements = await prisma.subjectPeriodRequirement.findMany({
          where: { schoolId },
          include: {
            subject: { select: { name: true, code: true } },
            class: { select: { name: true, level: true } }
          }
        })
        return NextResponse.json({ subjectRequirements })

      case 'teacher-constraints':
        const teacherConstraints = await prisma.teacherConstraint.findMany({
          where: { schoolId },
          include: {
            teacher: { 
              select: { 
                firstName: true, 
                lastName: true,
                staffSubjects: {
                  include: { subject: { select: { name: true } } }
                }
              } 
            }
          }
        })
        return NextResponse.json({ teacherConstraints })

      case 'room-constraints':
        const roomConstraints = await prisma.roomConstraint.findMany({
          where: { schoolId }
        })
        return NextResponse.json({ roomConstraints })

      case 'all':
        const [timeStruct, subjReqs, teacherConsts, roomConsts] = await Promise.all([
          prisma.schoolTimeStructure.findFirst({
            where: { schoolId, isActive: true }
          }),
          prisma.subjectPeriodRequirement.findMany({
            where: { schoolId },
            include: {
              subject: { select: { name: true, code: true } },
              class: { select: { name: true, level: true } }
            }
          }),
          prisma.teacherConstraint.findMany({
            where: { schoolId },
            include: {
              teacher: { 
                select: { 
                  firstName: true, 
                  lastName: true,
                  staffSubjects: {
                    include: { subject: { select: { name: true } } }
                  }
                } 
              }
            }
          }),
          prisma.roomConstraint.findMany({
            where: { schoolId }
          })
        ])

        return NextResponse.json({
          timeStructure: timeStruct,
          subjectRequirements: subjReqs,
          teacherConstraints: teacherConsts,
          roomConstraints: roomConsts
        })

      default:
        return NextResponse.json({ error: 'Invalid configuration type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Timetable config GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { configType, data } = body
    const schoolId = body.schoolId || session.user.schoolId

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 })
    }

    switch (configType) {
      case 'time-structure':
        const timeStructure = await timetableService.configureSchoolTimeStructure(
          schoolId,
          data,
          session.user.id
        )
        return NextResponse.json({ 
          success: true, 
          timeStructure,
          message: 'School time structure configured successfully'
        })

      case 'subject-requirements':
        const subjectRequirements = await timetableService.configureSubjectRequirements(
          schoolId,
          data,
          session.user.id
        )
        return NextResponse.json({ 
          success: true, 
          subjectRequirements,
          message: `Configured ${subjectRequirements.length} subject requirements`
        })

      case 'teacher-constraints':
        const teacherConstraints = await timetableService.configureTeacherConstraints(
          schoolId,
          data,
          session.user.id
        )
        return NextResponse.json({ 
          success: true, 
          teacherConstraints,
          message: `Configured ${teacherConstraints.length} teacher constraints`
        })

      case 'room-constraints':
        // This would be implemented similar to other constraints
        return NextResponse.json({ error: 'Room constraints configuration not yet implemented' }, { status: 501 })

      default:
        return NextResponse.json({ error: 'Invalid configuration type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Timetable config POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { configType, id, data } = body

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID required for update' }, { status: 400 })
    }

    switch (configType) {
      case 'time-structure':
        const updatedTimeStructure = await prisma.schoolTimeStructure.update({
          where: { id },
          data
        })
        return NextResponse.json({ 
          success: true, 
          timeStructure: updatedTimeStructure,
          message: 'Time structure updated successfully'
        })

      case 'subject-requirement':
        const updatedSubjectReq = await prisma.subjectPeriodRequirement.update({
          where: { id },
          data
        })
        return NextResponse.json({ 
          success: true, 
          subjectRequirement: updatedSubjectReq,
          message: 'Subject requirement updated successfully'
        })

      case 'teacher-constraint':
        const updatedTeacherConstraint = await prisma.teacherConstraint.update({
          where: { id },
          data
        })
        return NextResponse.json({ 
          success: true, 
          teacherConstraint: updatedTeacherConstraint,
          message: 'Teacher constraint updated successfully'
        })

      case 'room-constraint':
        const updatedRoomConstraint = await prisma.roomConstraint.update({
          where: { id },
          data
        })
        return NextResponse.json({ 
          success: true, 
          roomConstraint: updatedRoomConstraint,
          message: 'Room constraint updated successfully'
        })

      default:
        return NextResponse.json({ error: 'Invalid configuration type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Timetable config PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const configType = searchParams.get('type')
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID required' }, { status: 400 })
    }

    switch (configType) {
      case 'subject-requirement':
        await prisma.subjectPeriodRequirement.delete({
          where: { id }
        })
        return NextResponse.json({ 
          success: true,
          message: 'Subject requirement deleted successfully'
        })

      case 'teacher-constraint':
        await prisma.teacherConstraint.delete({
          where: { id }
        })
        return NextResponse.json({ 
          success: true,
          message: 'Teacher constraint deleted successfully'
        })

      case 'room-constraint':
        await prisma.roomConstraint.delete({
          where: { id }
        })
        return NextResponse.json({ 
          success: true,
          message: 'Room constraint deleted successfully'
        })

      default:
        return NextResponse.json({ error: 'Invalid configuration type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Timetable config DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}