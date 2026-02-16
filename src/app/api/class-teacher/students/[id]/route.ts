/**
 * Class Teacher Student Detail API Route
 * Returns detailed information about a specific student
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
        primaryRole: true,
        secondaryRoles: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'No staff profile found' },
        { status: 404 }
      )
    }

    // Verify user has appropriate role
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    const isClassTeacher = userRole === Role.TEACHER || 
                           staff.primaryRole === StaffRole.CLASS_TEACHER ||
                           (staff.secondaryRoles as string[] || []).includes(StaffRole.CLASS_TEACHER)
    
    if (!isClassTeacher && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Class teacher role required.' },
        { status: 403 }
      )
    }

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isActive: true
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    })

    // Get student details
    const student = await prisma.student.findUnique({
      where: {
        id: studentId,
        schoolId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        gender: true,
        dateOfBirth: true,
        status: true,
        class: {
          select: {
            id: true,
            name: true,
            streams: {
              select: {
                id: true,
                name: true
              },
              take: 1
            }
          }
        },
        studentGuardians: {
          select: {
            guardian: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                relationship: true
              }
            }
          },
          take: 1
        }
      }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Calculate age
    const age = student.dateOfBirth 
      ? Math.floor((new Date().getTime() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null

    // Get attendance statistics for current term
    let attendanceStats = {
      rate: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      total: 0
    }

    if (currentTerm) {
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          studentId,
          date: {
            gte: currentTerm.startDate,
            lte: currentTerm.endDate
          }
        },
        select: {
          status: true
        }
      })

      attendanceStats.total = attendanceRecords.length
      attendanceStats.present = attendanceRecords.filter(a => a.status === 'PRESENT').length
      attendanceStats.absent = attendanceRecords.filter(a => a.status === 'ABSENT').length
      attendanceStats.late = attendanceRecords.filter(a => a.status === 'LATE').length
      attendanceStats.excused = attendanceRecords.filter(a => a.status === 'EXCUSED').length
      attendanceStats.rate = attendanceStats.total > 0 
        ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
        : 0
    }

    // Get performance statistics for current term
    let performanceStats = {
      average: 0,
      caAverage: 0,
      examAverage: 0,
      totalAssessments: 0
    }

    if (currentTerm) {
      // Get CA entries
      const caEntries = await prisma.cAEntry.findMany({
        where: {
          studentId,
          termId: currentTerm.id,
          status: 'SUBMITTED'
        },
        select: {
          rawScore: true,
          maxScore: true
        }
      })

      // Get exam entries
      const examEntries = await prisma.examEntry.findMany({
        where: {
          studentId,
          termId: currentTerm.id,
          status: 'SUBMITTED'
        },
        select: {
          examScore: true,
          maxScore: true
        }
      })

      // Calculate CA average
      if (caEntries.length > 0) {
        const caScores = caEntries.map(ca => (ca.rawScore / ca.maxScore) * 100)
        performanceStats.caAverage = Math.round(
          caScores.reduce((sum, score) => sum + score, 0) / caScores.length
        )
      }

      // Calculate Exam average
      if (examEntries.length > 0) {
        const examScores = examEntries.map(exam => (exam.examScore / exam.maxScore) * 100)
        performanceStats.examAverage = Math.round(
          examScores.reduce((sum, score) => sum + score, 0) / examScores.length
        )
      }

      // Calculate overall average
      const allScores = [
        ...caEntries.map(ca => (ca.rawScore / ca.maxScore) * 100),
        ...examEntries.map(exam => (exam.examScore / exam.maxScore) * 100)
      ]

      performanceStats.totalAssessments = allScores.length
      if (allScores.length > 0) {
        performanceStats.average = Math.round(
          allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        )
      }
    }

    // Build response
    const studentDetail = {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.admissionNumber,
      gender: student.gender,
      age,
      dateOfBirth: student.dateOfBirth?.toISOString() || null,
      status: student.status,
      class: {
        id: student.class.id,
        name: student.class.name,
        streamName: student.class.streams[0]?.name || null
      },
      guardian: student.studentGuardians[0] ? {
        name: `${student.studentGuardians[0].guardian.firstName} ${student.studentGuardians[0].guardian.lastName}`,
        phone: student.studentGuardians[0].guardian.phone,
        email: student.studentGuardians[0].guardian.email,
        relationship: student.studentGuardians[0].guardian.relationship
      } : null,
      attendance: attendanceStats,
      performance: performanceStats
    }

    return NextResponse.json(studentDetail)

  } catch (error: any) {
    console.error('Error fetching student detail:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch student details',
        details: 'An unexpected error occurred. Please try refreshing the page.'
      },
      { status: 500 }
    )
  }
}
