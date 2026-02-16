/**
 * Class Teacher Dashboard API Route
 * Returns dashboard data for Class Teacher operations
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function GET(_request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID not found' }, { status: 400 })
    }

    // Get staff record for the user
    const staff = await prisma.staff.findFirst({
      where: {
        userId: session.user.id,
        schoolId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        primaryRole: true,
        secondaryRoles: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'No staff profile linked to this account' },
        { status: 404 }
      )
    }

    // Verify user has CLASS_TEACHER role
    const hasClassTeacherRole =
      staff.primaryRole === StaffRole.CLASS_TEACHER ||
      (staff.secondaryRoles as string[] || []).includes(StaffRole.CLASS_TEACHER)

    // Allow SCHOOL_ADMIN and DEPUTY to access as well
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY

    if (!hasClassTeacherRole && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Class Teacher role required.' },
        { status: 403 }
      )
    }

    // Get subjects taught by this teacher
    const assignedSubjects = await prisma.staffSubject.findMany({
      where: {
        staffId: staff.id
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        class: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Get academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isActive: true
      }
    })

    // Get current term
    const today = new Date()
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isActive: true
        },
        startDate: { lte: today },
        endDate: { gte: today }
      }
    })

    // Determine context error
    let contextError: string | null = null
    if (!academicYear) {
      contextError = 'No active academic year found. Please contact administration.'
    } else if (!currentTerm) {
      contextError = 'No active term found. Please contact administration.'
    }

    // Enhanced class finding logic - same as class-details
    let classId: string | null = null
    let classSource = 'none'

    // Step 1: Check StaffResponsibility for CLASS_TEACHER_DUTY
    const staffResponsibilities = await prisma.staffResponsibility.findMany({
      where: {
        staffId: staff.id,
        type: 'CLASS_TEACHER_DUTY',
      },
      select: {
        details: true,
      },
    })
    
    if (staffResponsibilities.length > 0) {
      const responsibility = staffResponsibilities[0]
      if (responsibility.details && typeof responsibility.details === 'object') {
        const details = responsibility.details as any
        classId = details.classId || null
        if (classId) {
          classSource = 'StaffResponsibility'
        }
      }
    }

    // Step 2: Fallback to StaffClass assignments
    if (!classId) {
      const staffClass = await prisma.staffClass.findFirst({
        where: {
          staffId: staff.id,
        },
        select: {
          classId: true,
        },
      })
      if (staffClass) {
        classId = staffClass.classId
        classSource = 'StaffClass'
      }
    }

    // Step 3: Check Teacher model
    if (!classId) {
      const teacher = await prisma.teacher.findFirst({
        where: { 
          schoolId,
          OR: [
            { firstName: staff.firstName, lastName: staff.lastName }
          ]
        },
        select: { 
          id: true,
          classTeacherForIds: true,
          assignedClassIds: true 
        }
      })

      if (teacher) {
        if (teacher.classTeacherForIds.length > 0) {
          classId = teacher.classTeacherForIds[0]
          classSource = 'Teacher.classTeacherForIds'
        } else if (teacher.assignedClassIds.length > 0) {
          classId = teacher.assignedClassIds[0]
          classSource = 'Teacher.assignedClassIds'
        }
      }
    }

    // Step 4: Check StaffSubject assignments as final fallback
    if (!classId) {
      const staffSubject = await prisma.staffSubject.findFirst({
        where: { staffId: staff.id },
        select: { classId: true },
      })
      if (staffSubject) {
        classId = staffSubject.classId
        classSource = 'StaffSubject'
      }
    }

    // Get primary class
    const primaryClass = classId ? await prisma.class.findFirst({
      where: { id: classId },
      include: {
        streams: {
          select: {
            name: true,
          },
        },
      },
    }) : null

    // Get students for primary class
    const students = primaryClass ? await prisma.student.findMany({
      where: {
        classId: primaryClass.id,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        gender: true,
        dateOfBirth: true,
        status: true,
        studentGuardians: {
          select: {
            guardian: {
              select: {
                phone: true,
                email: true
              }
            }
          },
          take: 1
        }
      },
      take: 10
    }) : []

    // Calculate real attendance rate for the class
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000))
    
    const attendanceRecords = primaryClass ? await prisma.attendance.findMany({
      where: {
        classId: primaryClass.id,
        date: {
          gte: thirtyDaysAgo,
          lte: today,
        },
      },
      select: {
        status: true,
        studentId: true,
      },
    }) : []
    
    // Calculate attendance rate
    const totalAttendanceRecords = attendanceRecords.length
    const presentRecords = attendanceRecords.filter(record => 
      record.status === 'PRESENT' || record.status === 'LATE'
    ).length
    const averageAttendance = totalAttendanceRecords > 0 
      ? Math.round((presentRecords / totalAttendanceRecords) * 100)
      : 0

    // Calculate real performance from marks
    let averagePerformance = 0
    if (currentTerm && primaryClass) {
      const marks = await prisma.mark.findMany({
        where: {
          student: {
            classId: primaryClass.id,
            status: 'ACTIVE',
          },
          exam: {
            termId: currentTerm.id,
          },
        },
        select: {
          score: true,
          maxScore: true,
        },
      })
      
      if (marks.length > 0) {
        const totalPercentage = marks.reduce((sum, mark) => {
          const percentage = mark.maxScore > 0 ? (mark.score / mark.maxScore) * 100 : 0
          return sum + percentage
        }, 0)
        averagePerformance = Math.round(totalPercentage / marks.length)
      }
    }

    // Format student data with real information - OPTIMIZED with batch queries
    const studentIds = students.map(s => s.id)
    
    // Batch fetch all CA entries for all students at once
    const allCAEntries = currentTerm && studentIds.length > 0 ? await prisma.cAEntry.findMany({
      where: {
        studentId: { in: studentIds },
        termId: currentTerm.id,
        status: 'SUBMITTED',
      },
      select: {
        studentId: true,
        rawScore: true,
        maxScore: true,
      },
    }) : []

    // Batch fetch all Exam entries for all students at once
    const allExamEntries = currentTerm && studentIds.length > 0 ? await prisma.examEntry.findMany({
      where: {
        studentId: { in: studentIds },
        termId: currentTerm.id,
        status: 'SUBMITTED',
      },
      select: {
        studentId: true,
        examScore: true,
        maxScore: true,
      },
    }) : []

    // Batch fetch last attendance for all students
    const allLastAttendance = primaryClass && studentIds.length > 0 ? await prisma.attendance.groupBy({
      by: ['studentId'],
      where: {
        studentId: { in: studentIds },
        classId: primaryClass.id,
      },
      _max: {
        date: true,
      },
    }) : []

    // Batch fetch last mark entry for all students
    const allLastMarks = studentIds.length > 0 ? await prisma.mark.groupBy({
      by: ['studentId'],
      where: {
        studentId: { in: studentIds },
      },
      _max: {
        createdAt: true,
      },
    }) : []

    // Now format students using the batched data
    const formattedStudents = students.map((student) => {
      const age = student.dateOfBirth 
        ? Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

      const primaryGuardian = student.studentGuardians[0]?.guardian

      // Get real attendance rate for this student (last 30 days)
      const studentAttendance = attendanceRecords.filter(record => record.studentId === student.id)
      const studentPresentRecords = studentAttendance.filter(record => 
        record.status === 'PRESENT' || record.status === 'LATE'
      ).length
      const attendanceRate = studentAttendance.length > 0 
        ? Math.round((studentPresentRecords / studentAttendance.length) * 100)
        : 0

      // Get real performance for this student using batched CA and Exam entries
      let performance = 0
      let caScore = 0
      let examScore = 0
      let finalScore = null

      if (currentTerm) {
        // Get CA entries for this student from batched data
        const caEntries = allCAEntries.filter(entry => entry.studentId === student.id)

        // Calculate CA average (out of 20)
        if (caEntries.length > 0) {
          const caPercentages = caEntries.map(entry => 
            entry.maxScore > 0 ? (entry.rawScore / entry.maxScore) * 100 : 0
          )
          const caAverage = caPercentages.reduce((sum, p) => sum + p, 0) / caPercentages.length
          caScore = Math.round((caAverage / 100) * 20)
        }

        // Get Exam entries for this student from batched data
        const examEntries = allExamEntries.filter(entry => entry.studentId === student.id)

        // Calculate Exam average (out of 80)
        if (examEntries.length > 0) {
          const examPercentages = examEntries.map(entry => 
            entry.maxScore > 0 ? (entry.examScore / entry.maxScore) * 100 : 0
          )
          const examAverage = examPercentages.reduce((sum, p) => sum + p, 0) / examPercentages.length
          examScore = Math.round((examAverage / 100) * 80)
        }

        // Calculate final score (CA + Exam)
        if (caScore > 0 || examScore > 0) {
          finalScore = caScore + examScore
          performance = finalScore
        }
      }

      // Get last attendance date from batched data
      const lastAttendanceData = allLastAttendance.find(a => a.studentId === student.id)
      const lastAttendanceDate = lastAttendanceData?._max.date?.toISOString() || null

      // Get last mark entry date from batched data
      const lastMarkData = allLastMarks.find(m => m.studentId === student.id)
      const lastMarkEntryDate = lastMarkData?._max.createdAt?.toISOString() || null

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        gender: student.gender,
        age,
        parentPhone: primaryGuardian?.phone || null,
        parentEmail: primaryGuardian?.email || null,
        status: student.status,
        attendanceRate,
        performance,
        caScore,
        examScore,
        finalScore,
        lastAttendanceDate,
        lastMarkEntryDate,
      }
    })

    // Get pending CA entries
    const pendingCAEntries = await prisma.cAEntry.count({
      where: {
        teacherId: staff.id,
        status: 'DRAFT',
        termId: currentTerm?.id
      }
    })

    // Get pending exam entries
    const pendingExamEntries = await prisma.examEntry.count({
      where: {
        teacherId: staff.id,
        status: 'DRAFT',
        termId: currentTerm?.id
      }
    })

    // Check if attendance recorded today
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    
    const attendanceToday = primaryClass ? await prisma.attendance.count({
      where: {
        date: todayStart,
        recordedBy: staff.id,
        classId: primaryClass.id
      }
    }) : 0

    const dashboardData = {
      context: {
        teacherId: staff.id,
        teacherName: `${staff.firstName} ${staff.lastName}`,
        roleName: staff.primaryRole,
        currentTerm: currentTerm ? {
          id: currentTerm.id,
          name: currentTerm.name,
          startDate: currentTerm.startDate.toISOString(),
          endDate: currentTerm.endDate.toISOString()
        } : null,
        academicYear: academicYear ? {
          id: academicYear.id,
          name: academicYear.name
        } : null,
        contextError
      },
      class: primaryClass ? {
        id: primaryClass.id,
        name: primaryClass.name,
        streamName: primaryClass.streams[0]?.name || null,
        studentCount: students.length,
        averageAttendance,
        averagePerformance,
        caContribution: 20,
        examContribution: 80,
        isClassTeacher: true
      } : null,
      students: formattedStudents,
      performance: [],
      curriculumTopics: [],
      alerts: {
        pendingAttendance: attendanceToday === 0 && primaryClass ? [{
          id: '1',
          classId: primaryClass.id,
          className: primaryClass.name,
          date: today.toISOString(),
          message: 'No attendance recorded today'
        }] : [],
        marksDeadlines: [],
        caPending: pendingCAEntries > 0 ? [{
          id: '1',
          subjectId: assignedSubjects[0]?.subject.id || '',
          subjectName: assignedSubjects[0]?.subject.name || '',
          caName: 'CA Entry',
          deadline: new Date().toISOString(),
          message: `${pendingCAEntries} CA entries pending submission`
        }] : [],
        evidencePending: []
      }
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Error fetching Class Teacher dashboard:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
