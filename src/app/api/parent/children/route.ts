/**
 * Parent Children API Route
 * Requirement 23.1: Fetch and return children data for authenticated parent
 * GET: Return all children linked to the authenticated parent/guardian
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

export interface ChildData {
  id: string
  name: string
  firstName: string
  lastName: string
  admissionNumber: string
  className: string
  classId: string
  streamName: string | null
  streamId: string | null
  status: string
  photo: string | null
  gender: string | null
  feeSummary: {
    totalFees: number
    totalPaid: number
    balance: number
    hasArrears: boolean
  }
  academicSummary: {
    lastTermAverage: number | null
    lastTermPosition: number | null
    totalStudents: number | null
    lastTermGrade: string | null
  }
  attendanceSummary: {
    presentDays: number
    totalDays: number
    percentage: number
  }
}

export interface ParentChildrenResponse {
  parentName: string
  children: ChildData[]
}

// GET: Fetch children data for authenticated parent
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a parent
    if (session.user.role !== Role.PARENT) {
      return NextResponse.json(
        { error: 'Forbidden - Parent access only' },
        { status: 403 }
      )
    }

    const userId = session.user.id

    // Get the guardian record linked to this user
    // First, find the user to get their email/phone to match with guardian
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find guardian by email or phone
    const guardian = await prisma.guardian.findFirst({
      where: {
        OR: [
          { email: user.email },
          { phone: user.phone || '' }
        ]
      }
    })

    if (!guardian) {
      return NextResponse.json({
        parentName: user.email,
        children: []
      })
    }

    // Get all students linked to this guardian
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: { guardianId: guardian.id },
      include: {
        student: {
          include: {
            class: true,
            stream: true,
            school: true
          }
        }
      }
    })

    // Get current term for fee and attendance calculations
    const currentTerm = await prisma.term.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      orderBy: { startDate: 'desc' }
    })

    // Build children data with summaries
    const children: ChildData[] = await Promise.all(
      studentGuardians.map(async (sg) => {
        const student = sg.student
        
        // Calculate fee summary
        let feeSummary = {
          totalFees: 0,
          totalPaid: 0,
          balance: 0,
          hasArrears: false
        }

        if (currentTerm) {
          const feeStructure = await prisma.feeStructure.findFirst({
            where: {
              classId: student.classId,
              termId: currentTerm.id
            }
          })

          const totalFees = feeStructure?.totalAmount || 0

          const payments = await prisma.payment.aggregate({
            where: {
              studentId: student.id,
              termId: currentTerm.id
            },
            _sum: { amount: true }
          })

          const totalPaid = payments._sum.amount || 0
          const balance = totalFees - totalPaid

          feeSummary = {
            totalFees,
            totalPaid,
            balance,
            hasArrears: balance > 0
          }
        }

        // Calculate academic summary (last term results)
        let academicSummary = {
          lastTermAverage: null as number | null,
          lastTermPosition: null as number | null,
          totalStudents: null as number | null,
          lastTermGrade: null as string | null
        }

        const lastResult = await prisma.result.findFirst({
          where: { studentId: student.id },
          orderBy: { createdAt: 'desc' }
        })

        if (lastResult) {
          academicSummary = {
            lastTermAverage: lastResult.average,
            lastTermPosition: lastResult.position,
            totalStudents: lastResult.totalStudents,
            lastTermGrade: lastResult.grade
          }
        }

        // Calculate attendance summary for current term
        let attendanceSummary = {
          presentDays: 0,
          totalDays: 0,
          percentage: 0
        }

        if (currentTerm) {
          const attendanceRecords = await prisma.attendance.findMany({
            where: {
              studentId: student.id,
              date: {
                gte: currentTerm.startDate,
                lte: new Date()
              }
            }
          })

          // Count unique days
          const uniqueDates = new Set(
            attendanceRecords.map(a => a.date.toISOString().split('T')[0])
          )
          const totalDays = uniqueDates.size

          // Count present days (at least one PRESENT record per day)
          const presentDates = new Set(
            attendanceRecords
              .filter(a => a.status === 'PRESENT')
              .map(a => a.date.toISOString().split('T')[0])
          )
          const presentDays = presentDates.size

          attendanceSummary = {
            presentDays,
            totalDays,
            percentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
          }
        }

        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          className: student.class.name,
          classId: student.classId,
          streamName: student.stream?.name || null,
          streamId: student.streamId,
          status: student.status,
          photo: student.photo,
          gender: student.gender,
          feeSummary,
          academicSummary,
          attendanceSummary
        }
      })
    )

    const response: ParentChildrenResponse = {
      parentName: `${guardian.firstName} ${guardian.lastName}`,
      children
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching parent children:', error)
    return NextResponse.json(
      { error: 'Failed to fetch children data' },
      { status: 500 }
    )
  }
}
