/**
 * Class Teacher Students API Route
 * Returns students data for Class Teacher operations
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

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isActive: true
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Get classes assigned to this class teacher
    const assignedClasses = await prisma.staffClass.findMany({
      where: {
        staffId: staff.id
      },
      include: {
        class: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // For now, get the first assigned class (class teachers typically have one class)
    const primaryClass = assignedClasses[0]?.class || null

    // Get students in the class
    const students = primaryClass ? await prisma.student.findMany({
      where: {
        classId: primaryClass.id,
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
        stream: {
          select: {
            id: true,
            name: true
          }
        },
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
        },
        attendance: currentTerm ? {
          where: {
            date: {
              gte: currentTerm.startDate,
              lte: currentTerm.endDate
            }
          },
          select: {
            id: true,
            date: true,
            status: true
          }
        } : true,
        caEntries: {
          where: {
            termId: currentTerm?.id,
            status: 'SUBMITTED'
          },
          select: {
            id: true,
            rawScore: true,
            maxScore: true,
            createdAt: true
          }
        },
        examEntries: {
          where: {
            termId: currentTerm?.id,
            status: 'SUBMITTED'
          },
          select: {
            id: true,
            examScore: true,
            maxScore: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    }) : []

    // Calculate attendance rate and performance for each student
    const studentsWithStats = students.map(student => {
      // Calculate age
      const age = student.dateOfBirth 
        ? Math.floor((new Date().getTime() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null

      // Calculate attendance rate
      const totalAttendance = student.attendance.length
      const presentCount = student.attendance.filter(a => a.status === 'PRESENT').length
      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0

      // Calculate performance (average of CA and Exam scores)
      const caScores = student.caEntries.map(ca => (ca.rawScore / ca.maxScore) * 100)
      const examScores = student.examEntries.map(exam => (exam.examScore / exam.maxScore) * 100)
      const allScores = [...caScores, ...examScores]
      const performance = allScores.length > 0 
        ? Math.round(allScores.reduce((sum, score) => sum + score, 0) / allScores.length)
        : 0

      // Get last attendance date
      const lastAttendanceDate = student.attendance.length > 0
        ? student.attendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
        : null

      // Get last mark entry date (most recent CA or Exam entry)
      const caEntryDates = student.caEntries.map(ca => new Date(ca.createdAt).getTime()).filter(t => !isNaN(t))
      const examEntryDates = student.examEntries.map(exam => new Date(exam.createdAt).getTime()).filter(t => !isNaN(t))
      const allEntryDates = [...caEntryDates, ...examEntryDates]
      
      const lastMarkEntryDate = allEntryDates.length > 0
        ? new Date(Math.max(...allEntryDates))
        : null

      // Get parent contact
      const parentPhone = student.studentGuardians[0]?.guardian.phone || null
      const parentEmail = student.studentGuardians[0]?.guardian.email || null

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        gender: student.gender,
        age,
        parentPhone,
        parentEmail,
        status: student.status,
        attendanceRate,
        performance,
        lastAttendanceDate: lastAttendanceDate ? new Date(lastAttendanceDate).toISOString() : null,
        lastMarkEntryDate: lastMarkEntryDate ? lastMarkEntryDate.toISOString() : null
      }
    })

    // Build context data
    const contextData = {
      teacherId: staff.id,
      teacherName: `${staff.firstName} ${staff.lastName}`,
      roleName: 'Class Teacher',
      currentTerm: currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.name,
        startDate: currentTerm.startDate.toISOString(),
        endDate: currentTerm.endDate.toISOString()
      } : null,
      academicYear: currentTerm?.academicYear ? {
        id: currentTerm.academicYear.id,
        name: currentTerm.academicYear.name
      } : null,
      contextError: !currentTerm ? 'No active term found' : null
    }

    // Build class data
    // Get stream name from students (most students should be in the same stream)
    const streamName = studentsWithStats.length > 0 && students[0]?.stream
      ? students[0].stream.name
      : null

    const classData = primaryClass ? {
      id: primaryClass.id,
      name: primaryClass.name,
      streamName,
      studentCount: studentsWithStats.length
    } : null

    return NextResponse.json({
      context: contextData,
      class: classData,
      students: studentsWithStats
    })

  } catch (error) {
    console.error('Error fetching Class Teacher students:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
