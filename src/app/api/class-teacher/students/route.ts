/**
 * Class Teacher Students API Route
 * Returns students data for Class Teacher operations
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID not found' }, { status: 400 })
    }

    // Get staff record for the user - auto-create if doesn't exist
    let staff = await prisma.staff.findFirst({
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
        email: true,
        schoolId: true,
      },
    })

    // Auto-create staff profile if it doesn't exist (same as class-details)
    if (!staff) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { email: true, username: true, phone: true }
      })

      const existingTeacher = await prisma.teacher.findFirst({
        where: {
          schoolId,
          OR: [
            { email: user?.email },
            { userId: session.user.id },
          ]
        },
        select: { id: true, firstName: true, lastName: true, email: true }
      })

      let firstName: string
      let lastName: string

      if (existingTeacher) {
        firstName = existingTeacher.firstName
        lastName = existingTeacher.lastName
        await prisma.teacher.update({
          where: { id: existingTeacher.id },
          data: { userId: session.user.id }
        })
      } else {
        const emailName = user?.email?.split('@')[0] || user?.username || 'Teacher'
        const nameParts = emailName.split(/[._-]/)
        firstName = nameParts[0]?.charAt(0).toUpperCase() + nameParts[0]?.slice(1) || 'Class'
        lastName = nameParts[1]?.charAt(0).toUpperCase() + nameParts[1]?.slice(1) || 'Teacher'
      }

      const timestamp = Date.now().toString().slice(-6)
      const employeeNumber = `EMP${timestamp}`

      staff = await prisma.staff.create({
        data: {
          userId: session.user.id,
          schoolId,
          employeeNumber,
          firstName,
          lastName,
          email: user?.email || null,
          phone: user?.phone || null,
          role: Role.TEACHER,
          primaryRole: StaffRole.CLASS_TEACHER,
          secondaryRoles: [],
          status: 'ACTIVE',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          primaryRole: true,
          secondaryRoles: true,
          email: true,
          schoolId: true,
        }
      })
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

    // Get ALL classes the teacher is assigned to (same logic as class-details)
    let allClassIds: string[] = []

    // Check Teacher model
    const teacher = await prisma.teacher.findFirst({
      where: { 
        schoolId: staff.schoolId || schoolId,
        OR: [
          ...(staff.email ? [{ email: staff.email }] : []),
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
        allClassIds = teacher.classTeacherForIds
      } else if (teacher.assignedClassIds.length > 0) {
        allClassIds = teacher.assignedClassIds
      }
    }

    if (allClassIds.length === 0) {
      return NextResponse.json(
        { error: 'No class assignment found' },
        { status: 404 }
      )
    }

    // Check if a specific class is requested via query parameter
    const { searchParams } = new URL(request.url)
    const requestedClassId = searchParams.get('classId')
    const requestedStreamId = searchParams.get('streamId')
    
    let classId: string
    if (requestedClassId && allClassIds.includes(requestedClassId)) {
      classId = requestedClassId
    } else {
      classId = allClassIds[0]
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

    // Get class details
    const primaryClass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        streams: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!primaryClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Build available classes list (all class+stream combinations)
    const availableClasses = await Promise.all(allClassIds.map(async (id) => {
      const cls = await prisma.class.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          streams: {
            select: { 
              id: true,
              name: true 
            }
          }
        }
      })
      
      if (!cls) return []
      
      if (cls.streams.length > 0) {
        return cls.streams.map(stream => ({
          id: cls.id,
          streamId: stream.id,
          name: cls.name,
          streamName: stream.name,
          displayName: `${cls.name} - ${stream.name}`
        }))
      }
      
      return [{
        id: cls.id,
        streamId: null,
        name: cls.name,
        streamName: null,
        displayName: cls.name
      }]
    })).then(results => results.flat())

    // Get students in the class, optionally filtered by stream
    const studentFilter: any = {
      classId: primaryClass.id,
      schoolId,
      status: 'ACTIVE'
    }

    if (requestedStreamId) {
      studentFilter.streamId = requestedStreamId
    }

    const students = await prisma.student.findMany({
      where: studentFilter,
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
    })

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
      availableClasses,
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
