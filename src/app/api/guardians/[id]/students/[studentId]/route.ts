/**
 * Guardian-Student Linking API
 * POST - Link student to guardian
 * DELETE - Unlink student from guardian
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id: guardianId, studentId } = await params
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'No school context found' }, { status: 400 })
    }

    // Verify user has appropriate role
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })
    }

    // Verify guardian belongs to school
    const guardian = await prisma.guardian.findFirst({
      where: {
        id: guardianId,
        schoolId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!guardian) {
      return NextResponse.json({ error: 'Guardian not found' }, { status: 404 })
    }

    // Verify student belongs to school
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Check if link already exists
    const existingLink = await prisma.studentGuardian.findFirst({
      where: {
        studentId,
        guardianId,
      },
    })

    if (existingLink) {
      return NextResponse.json(
        { error: 'Student is already linked to this guardian' },
        { status: 400 }
      )
    }

    // Parse request body for additional details
    const body = await request.json()
    const {
      relationshipType = 'GUARDIAN',
      isPrimary = false,
      isFinanciallyResponsible = false,
      receivesAcademicMessages = true,
      receivesFinanceMessages = true,
    } = body

    // If setting as primary, unset other primary guardians for this student
    if (isPrimary) {
      await prisma.studentGuardian.updateMany({
        where: {
          studentId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      })
    }

    // Create the link
    const link = await prisma.studentGuardian.create({
      data: {
        schoolId,
        studentId,
        guardianId,
        relationshipType,
        isPrimary,
        isFinanciallyResponsible,
        receivesAcademicMessages,
        receivesFinanceMessages,
      },
    })

    // Log the action
    await prisma.guardianAuditLog.create({
      data: {
        schoolId,
        guardianId,
        action: 'STUDENT_LINKED',
        field: 'students',
        previousValue: null,
        newValue: `${student.firstName} ${student.lastName} (${student.id})`,
        performedBy: session.user.id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Student linked to guardian successfully',
      link: {
        id: link.id,
        studentName: `${student.firstName} ${student.lastName}`,
        guardianName: `${guardian.firstName} ${guardian.lastName}`,
        relationshipType: link.relationshipType,
        isPrimary: link.isPrimary,
      },
    })

  } catch (error: any) {
    console.error('❌ [API] /api/guardians/[id]/students/[studentId] - POST - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to link student', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const { id: guardianId, studentId } = await params
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'No school context found' }, { status: 400 })
    }

    // Verify user has appropriate role
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 })
    }

    // Find the link
    const link = await prisma.studentGuardian.findFirst({
      where: {
        studentId,
        guardianId,
        schoolId,
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        guardian: { select: { firstName: true, lastName: true } },
      },
    })

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    // Check if this is the last guardian for the student
    const guardianCount = await prisma.studentGuardian.count({
      where: { studentId },
    })

    if (guardianCount === 1) {
      return NextResponse.json(
        { error: 'Cannot unlink the last guardian. Student must have at least one guardian.' },
        { status: 400 }
      )
    }

    // Delete the link
    await prisma.studentGuardian.delete({
      where: { id: link.id },
    })

    // Log the action
    await prisma.guardianAuditLog.create({
      data: {
        schoolId,
        guardianId,
        action: 'STUDENT_UNLINKED',
        field: 'students',
        previousValue: `${link.student.firstName} ${link.student.lastName} (${studentId})`,
        newValue: null,
        performedBy: session.user.id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Student unlinked from guardian successfully',
      unlinkedStudent: `${link.student.firstName} ${link.student.lastName}`,
      guardian: `${link.guardian.firstName} ${link.guardian.lastName}`,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/guardians/[id]/students/[studentId] - DELETE - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to unlink student', details: error.message },
      { status: 500 }
    )
  }
}
