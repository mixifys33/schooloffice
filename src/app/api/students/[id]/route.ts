/**
 * Individual Student API Route
 * Requirements: 3.6 - Navigate to student profile with edit capability
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { StudentStatus, Gender } from '@/types/enums'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper function to validate MongoDB ObjectId format
function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  return /^[a-fA-F0-9]{24}$/.test(id)
}

// GET: Get student by ID with full details
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid student ID format' },
        { status: 400 }
      )
    }

    const student = await prisma.student.findFirst({
      where: {
        id,
        schoolId, // Ensure tenant isolation
      },
      include: {
        class: true,
        stream: true,
        studentGuardians: {
          include: { guardian: true },
          orderBy: { isPrimary: 'desc' },
        },
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Get current term for payment status (with error handling)
    let currentTerm = null
    try {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYear: { schoolId },
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        orderBy: { startDate: 'desc' },
      })
    } catch (termError) {
      console.warn('Could not fetch current term:', termError)
      // Continue without term data - payment status will default to NOT_PAID
    }

    let paymentStatus: 'PAID' | 'NOT_PAID' | 'PARTIAL' = 'NOT_PAID'
    let totalFees = 0
    let totalPaid = 0

    if (currentTerm) {
      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          classId: student.classId,
          termId: currentTerm.id,
        },
      })

      totalFees = feeStructure?.totalAmount || 0

      const payments = await prisma.payment.aggregate({
        where: {
          studentId: student.id,
          termId: currentTerm.id,
        },
        _sum: { amount: true },
      })

      totalPaid = payments._sum.amount || 0

      if (totalPaid >= totalFees && totalFees > 0) {
        paymentStatus = 'PAID'
      } else if (totalPaid > 0) {
        paymentStatus = 'PARTIAL'
      }
    }

    const primaryGuardian = student.studentGuardians.find((sg) => sg.isPrimary)?.guardian

    return NextResponse.json({
      id: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      name: `${student.firstName} ${student.lastName}`,
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      classId: student.classId,
      className: student.class.name,
      streamId: student.streamId,
      streamName: student.stream?.name || null,
      status: student.status,
      pilotType: student.pilotType,
      smsLimitPerTerm: student.smsLimitPerTerm,
      smsSentCount: student.smsSentCount,
      enrollmentDate: student.enrollmentDate,
      photo: student.photo,
      medicalInfo: student.medicalInfo,
      paymentStatus,
      totalFees,
      totalPaid,
      balance: totalFees - totalPaid,
      isActive: student.status === StudentStatus.ACTIVE && paymentStatus === 'PAID',
      guardians: student.studentGuardians.map((sg) => ({
        id: sg.guardian.id,
        firstName: sg.guardian.firstName,
        lastName: sg.guardian.lastName,
        name: `${sg.guardian.firstName} ${sg.guardian.lastName}`,
        phone: sg.guardian.phone,
        email: sg.guardian.email,
        relationship: sg.guardian.relationship,
        isPrimary: sg.isPrimary,
      })),
      primaryGuardian: primaryGuardian ? {
        id: primaryGuardian.id,
        name: `${primaryGuardian.firstName} ${primaryGuardian.lastName}`,
        phone: primaryGuardian.phone,
        email: primaryGuardian.email,
      } : null,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching student:', error)
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    return NextResponse.json(
      { error: 'Failed to fetch student', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT: Update student
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Validate ObjectId format
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: 'Invalid student ID format' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Verify student belongs to school
    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        schoolId,
      },
    })

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    const {
      firstName,
      lastName,
      gender,
      dateOfBirth,
      classId,
      streamId,
      status,
      medicalInfo,
    } = body

    // Validate class if changing
    if (classId && classId !== existingStudent.classId) {
      const classRecord = await prisma.class.findFirst({
        where: { id: classId, schoolId },
      })
      if (!classRecord) {
        return NextResponse.json(
          { error: 'Invalid class' },
          { status: 400 }
        )
      }
    }

    // Validate stream if provided
    if (streamId) {
      const targetClassId = classId || existingStudent.classId
      const stream = await prisma.stream.findFirst({
        where: { id: streamId, classId: targetClassId },
      })
      if (!stream) {
        return NextResponse.json(
          { error: 'Invalid stream for the selected class' },
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (gender !== undefined) updateData.gender = gender as Gender
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null
    if (classId !== undefined) {
      updateData.classId = classId
      // Reset stream if class changes
      if (classId !== existingStudent.classId) {
        updateData.streamId = null
      }
    }
    if (streamId !== undefined) updateData.streamId = streamId || null
    if (status !== undefined) updateData.status = status as StudentStatus
    if (medicalInfo !== undefined) updateData.medicalInfo = medicalInfo

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        class: true,
        stream: true,
      },
    })

    return NextResponse.json({
      id: updatedStudent.id,
      firstName: updatedStudent.firstName,
      lastName: updatedStudent.lastName,
      name: `${updatedStudent.firstName} ${updatedStudent.lastName}`,
      gender: updatedStudent.gender,
      dateOfBirth: updatedStudent.dateOfBirth,
      classId: updatedStudent.classId,
      className: updatedStudent.class.name,
      streamId: updatedStudent.streamId,
      streamName: updatedStudent.stream?.name || null,
      status: updatedStudent.status,
    })
  } catch (error) {
    console.error('Error updating student:', error)
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 }
    )
  }
}
