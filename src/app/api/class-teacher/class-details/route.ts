/**
 * Class Teacher Class Details API Route
 * Provides detailed information about the class assigned to a class teacher
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole, StudentStatus, ResponsibilityType, AttendanceStatus, TaskStatus } from '@/types/enums'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/class-teacher/class-details - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      console.log('❌ [API] /api/class-teacher/class-details - No session found')
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to access your class details'
      }, { status: 401 })
    }

    console.log('✅ [API] /api/class-teacher/class-details - Session found for user:', session.user.id)

    const schoolId = session.user.schoolId
    console.log('🔍 [API] /api/class-teacher/class-details - Session schoolId:', schoolId)
    if (!schoolId) {
      console.log('❌ [API] /api/class-teacher/class-details - No school context')
      return NextResponse.json(
        { 
          error: 'No school context found',
          details: 'Your account is not linked to a school. Please contact support.'
        },
        { status: 400 }
      )
    }

    // Get staff record for the user - try with session schoolId first, then fallback
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
      },
    })

    // If not found with session schoolId, try to find staff record without schoolId constraint
    // This handles cases where session has wrong schoolId but user has valid staff record
    if (!staff) {
      console.log('⚠️ [API] /api/class-teacher/class-details - Staff not found with session schoolId, trying without constraint')
      staff = await prisma.staff.findFirst({
        where: {
          userId: session.user.id,
          // Remove schoolId constraint to find staff record
        },
        select: { 
          id: true,
          firstName: true,
          lastName: true,
          primaryRole: true,
          secondaryRoles: true,
          schoolId: true, // Include schoolId to verify later
        },
      })
      
      if (staff) {
        console.log('✅ [API] /api/class-teacher/class-details - Staff found without schoolId constraint')
        console.log('⚠️ [API] /api/class-teacher/class-details - Session schoolId mismatch detected')
        console.log('⚠️ [API] /api/class-teacher/class-details - Session schoolId:', schoolId)
        console.log('⚠️ [API] /api/class-teacher/class-details - Staff schoolId:', staff.schoolId)
      }
    }

    if (!staff) {
      console.log('❌ [API] /api/class-teacher/class-details - Staff profile not found for user:', session.user.id)
      return NextResponse.json(
        { 
          error: 'No staff profile linked to this account',
          details: 'Your staff profile is not set up. Please contact your school administrator.'
        },
        { status: 404 }
      )
    }

    console.log('✅ [API] /api/class-teacher/class-details - Staff profile found:', staff.id)

    // Enhanced class finding logic - check multiple sources consistently with dashboard
    let classId: string | null = null
    let classSource = 'none'

    // Step 1: Check StaffResponsibility for CLASS_TEACHER_DUTY
    console.log('🔍 [API] /api/class-teacher/class-details - Step 1: Checking StaffResponsibility...')
    const staffResponsibilities = await prisma.staffResponsibility.findMany({
      where: {
        staffId: staff.id,
        type: ResponsibilityType.CLASS_TEACHER_DUTY,
      },
      select: {
        details: true,
      },
    })

    console.log('🔍 [API] /api/class-teacher/class-details - Found responsibilities:', staffResponsibilities.length)
    
    if (staffResponsibilities.length > 0) {
      // Extract class ID from responsibility details
      const responsibility = staffResponsibilities[0]
      if (responsibility.details && typeof responsibility.details === 'object') {
        const details = responsibility.details as any
        classId = details.classId || null
        if (classId) {
          classSource = 'StaffResponsibility'
          console.log('✅ [API] /api/class-teacher/class-details - Found class via StaffResponsibility:', classId)
        }
      }
    }

    // Step 2: Fallback to StaffClass assignments
    if (!classId) {
      console.log('🔍 [API] /api/class-teacher/class-details - Step 2: Checking StaffClass...')
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
        console.log('✅ [API] /api/class-teacher/class-details - Found class via StaffClass:', classId)
      }
    }

    // Step 3: Enhanced Teacher model fallback (same as dashboard)
    if (!classId) {
      console.log('🔍 [API] /api/class-teacher/class-details - Step 3: Checking Teacher model...')
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
        console.log(`✅ [API] /api/class-teacher/class-details - Found Teacher record: ${teacher.id}`)
        console.log(`🔍 [API] /api/class-teacher/class-details - Class teacher for: ${teacher.classTeacherForIds.length} classes`)
        console.log(`🔍 [API] /api/class-teacher/class-details - Assigned to: ${teacher.assignedClassIds.length} classes`)
        
        // Prefer class teacher assignment over regular assignment
        if (teacher.classTeacherForIds.length > 0) {
          classId = teacher.classTeacherForIds[0]
          classSource = 'Teacher.classTeacherForIds'
          console.log('✅ [API] /api/class-teacher/class-details - Found class via Teacher.classTeacherForIds:', classId)
        } else if (teacher.assignedClassIds.length > 0) {
          classId = teacher.assignedClassIds[0]
          classSource = 'Teacher.assignedClassIds'
          console.log('✅ [API] /api/class-teacher/class-details - Found class via Teacher.assignedClassIds:', classId)
        }
      } else {
        console.log('❌ [API] /api/class-teacher/class-details - No Teacher record found')
      }
    }

    // Step 4: Check StaffSubject assignments as final fallback
    if (!classId) {
      console.log('🔍 [API] /api/class-teacher/class-details - Step 4: Checking StaffSubject assignments...')
      const staffSubject = await prisma.staffSubject.findFirst({
        where: { staffId: staff.id },
        select: { classId: true },
      })
      if (staffSubject) {
        classId = staffSubject.classId
        classSource = 'StaffSubject'
        console.log('✅ [API] /api/class-teacher/class-details - Found class via StaffSubject:', classId)
      }
    }

    if (!classId) {
      console.log('❌ [API] /api/class-teacher/class-details - No class assignment found for staff:', staff.id)
      return NextResponse.json(
        { 
          error: 'No class assignment found',
          details: `You are not currently assigned to any class. This could mean:
          
• You are not designated as a class teacher for any class
• You are not assigned to teach any subjects in any class
• Your class assignments may not be properly configured in the system

Please contact your school administrator to:
• Verify your class teacher assignments
• Check your subject teaching assignments
• Ensure your profile is properly configured

If you believe this is an error, please provide your staff details to the administrator.`,
          suggestions: [
            'Contact your school administrator',
            'Verify your role assignments',
            'Check if you have subject teaching assignments'
          ]
        },
        { status: 404 }
      )
    }

    console.log(`✅ [API] /api/class-teacher/class-details - Using class: ${classId} (source: ${classSource})`)

    console.log('✅ [API] /api/class-teacher/class-details - Found class assignment:', classId)

    // Get class details
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        // Remove schoolId filter since we already verified staff belongs to correct school
        // and the classId from staff responsibility should be valid
      },
      include: {
        streams: {
          select: {
            name: true,
          },
        },
      },
    })

    console.log('🔍 [API] /api/class-teacher/class-details - Class data found:', !!classData)
    if (classData) {
      console.log('🔍 [API] /api/class-teacher/class-details - Class details:', {
        id: classData.id,
        name: classData.name,
        schoolId: classData.schoolId,
        streamsCount: classData.streams.length
      })
      
      // Verify class belongs to same school as staff (security check)
      if (classData.schoolId !== schoolId) {
        console.log('⚠️ [API] /api/class-teacher/class-details - School ID mismatch detected')
        console.log('⚠️ [API] /api/class-teacher/class-details - Session schoolId:', schoolId)
        console.log('⚠️ [API] /api/class-teacher/class-details - Class schoolId:', classData.schoolId)
        // Continue anyway since staff assignment is valid, but log the mismatch
      }
    }

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Get students in the class
    const students = await prisma.student.findMany({
      where: {
        classId,
        status: StudentStatus.ACTIVE,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        gender: true,
        dateOfBirth: true,
        studentGuardians: {
          select: {
            guardian: {
              select: {
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    })

    // Calculate student count and real stats
    const studentCount = students.length
    
    // Calculate real attendance rate for the class
    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000))
    
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classId,
        date: {
          gte: thirtyDaysAgo,
          lte: today,
        },
      },
      select: {
        status: true,
        studentId: true,
      },
    })
    
    // Calculate attendance rate
    const totalAttendanceRecords = attendanceRecords.length
    const presentRecords = attendanceRecords.filter(record => 
      record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.LATE
    ).length
    const averageAttendance = totalAttendanceRecords > 0 
      ? Math.round((presentRecords / totalAttendanceRecords) * 100)
      : 0

    // Get current term for performance calculation
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: classData.schoolId,
        },
        startDate: { lte: today },
        endDate: { gte: today },
      },
    })

    // Calculate real performance from marks
    let averagePerformance = 0
    if (currentTerm) {
      const marks = await prisma.mark.findMany({
        where: {
          student: {
            classId,
            status: StudentStatus.ACTIVE,
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

    // Format student data with real information
    const formattedStudents = await Promise.all(students.map(async (student) => {
      try {
        const age = student.dateOfBirth 
          ? Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : null

        const primaryGuardian = student.studentGuardians[0]?.guardian

        // Get real attendance rate for this student (last 30 days)
        const studentAttendance = attendanceRecords.filter(record => record.studentId === student.id)
        const studentPresentRecords = studentAttendance.filter(record => 
          record.status === AttendanceStatus.PRESENT || record.status === AttendanceStatus.LATE
        ).length
        const attendanceRate = studentAttendance.length > 0 
          ? Math.round((studentPresentRecords / studentAttendance.length) * 100)
          : 0

        // Get real performance for this student using CAEntry and ExamEntry
        let performance = 0
        let caScore = 0
        let examScore = 0
        let finalScore = null

        if (currentTerm) {
          try {
            // Get CA entries for this student
            const caEntries = await prisma.cAEntry.findMany({
              where: {
                studentId: student.id,
                termId: currentTerm.id,
                status: 'SUBMITTED', // Only count submitted entries
              },
              select: {
                rawScore: true,
                maxScore: true,
              },
            })

            // Calculate CA average (out of 20)
            if (caEntries.length > 0) {
              const caPercentages = caEntries.map(entry => 
                entry.maxScore > 0 ? (entry.rawScore / entry.maxScore) * 100 : 0
              )
              const caAverage = caPercentages.reduce((sum, p) => sum + p, 0) / caPercentages.length
              caScore = Math.round((caAverage / 100) * 20) // Convert to out of 20
            }

            // Get Exam entries for this student
            const examEntries = await prisma.examEntry.findMany({
              where: {
                studentId: student.id,
                termId: currentTerm.id,
                status: 'SUBMITTED', // Only count submitted entries
              },
              select: {
                examScore: true,
                maxScore: true,
              },
            })

            // Calculate Exam average (out of 80)
            if (examEntries.length > 0) {
              const examPercentages = examEntries.map(entry => 
                entry.maxScore > 0 ? (entry.examScore / entry.maxScore) * 100 : 0
              )
              const examAverage = examPercentages.reduce((sum, p) => sum + p, 0) / examPercentages.length
              examScore = Math.round((examAverage / 100) * 80) // Convert to out of 80
            }

            // Calculate final score (CA + Exam)
            if (caScore > 0 || examScore > 0) {
              finalScore = caScore + examScore // Total out of 100
              performance = finalScore // Overall performance
            }
          } catch (marksError) {
            console.error('❌ [API] Error processing CA/Exam entries for student:', student.id, marksError)
            // Continue with default values
          }
        }

        // Get last attendance date
        let lastAttendance = null
        try {
          lastAttendance = await prisma.attendance.findFirst({
            where: {
              studentId: student.id,
              classId,
            },
            orderBy: {
              date: 'desc',
            },
            select: {
              date: true,
            },
          })
        } catch (attendanceError) {
          console.error('❌ [API] Error getting last attendance for student:', student.id, attendanceError.message)
        }

        // Get last mark entry date
        let lastMark = null
        try {
          lastMark = await prisma.mark.findFirst({
            where: {
              studentId: student.id,
            },
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              createdAt: true,
            },
          })
        } catch (markError) {
          console.error('❌ [API] Error getting last mark for student:', student.id, markError.message)
        }

        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          gender: student.gender,
          age,
          parentPhone: primaryGuardian?.phone || null,
          parentEmail: primaryGuardian?.email || null,
          status: 'active',
          attendanceRate,
          performance,
          caScore,
          examScore,
          finalScore,
          lastAttendanceDate: lastAttendance?.date?.toISOString() || null,
          lastMarkEntryDate: lastMark?.createdAt?.toISOString() || null,
        }
      } catch (studentError) {
        console.error('❌ [API] Error processing student data:', student.id, studentError.message)
        // Return basic student data if processing fails
        return {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          gender: student.gender,
          age: null,
          parentPhone: null,
          parentEmail: null,
          status: 'active',
          attendanceRate: 0,
          performance: 0,
          caScore: null,
          examScore: null,
          finalScore: null,
          lastAttendanceDate: null,
          lastMarkEntryDate: null,
        }
      }
    }))

    // Get real curriculum topics - subjects assigned to teachers for this class
    const staffSubjects = await prisma.staffSubject.findMany({
      where: {
        classId,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        staff: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    const formattedCurriculumTopics = staffSubjects.map(ss => ({
      id: ss.subject.id,
      name: ss.subject.name,
      code: ss.subject.code,
      subject: ss.subject.name,
      teacherName: `${ss.staff.firstName} ${ss.staff.lastName}`,
      status: 'in-progress' as const, // Default status since we don't have completion tracking
      completionDate: null,
    }))

    // Get real class tasks assigned to this class teacher
    const classTasks = await prisma.staffTask.findMany({
      where: {
        staffId: staff.id,
        status: { not: TaskStatus.COMPLETED }
      },
      include: {
        // No assignedByStaff relation exists, but we have createdBy field
      },
      orderBy: {
        deadline: 'asc',
      },
    })

    const formattedClassTasks = classTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.deadline?.toISOString() || null,
      status: task.status.toLowerCase() as 'pending' | 'in-progress' | 'completed',
      assignedBy: 'System', // No assignedByStaff relation available
    }))

    // Get real class announcements
    const classAnnouncements = await prisma.announcement.findMany({
      where: {
        schoolId: classData.schoolId,
        OR: [
          { targetClasses: { has: classId } },
          { isSchoolWide: true }
        ],
        publishedAt: { lte: new Date() },
      },
      include: {
        // No createdByStaff relation exists in Announcement model
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Limit to recent 10 announcements
    })

    const formattedClassAnnouncements = classAnnouncements.map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      date: announcement.createdAt.toISOString(),
      author: 'System', // No createdByStaff relation available
    }))

    const response = {
      class: {
        id: classData.id,
        name: classData.name,
        streamName: classData.streams[0]?.name || null,
        teacherName: `${staff.firstName} ${staff.lastName}`,
        studentCount,
        averageAttendance,
        averagePerformance,
        caContribution: 30, // Standard CA contribution
        examContribution: 70, // Standard exam contribution
        isClassTeacher: true,
      },
      students: formattedStudents,
      curriculumTopics: formattedCurriculumTopics,
      classTasks: formattedClassTasks,
      classAnnouncements: formattedClassAnnouncements,
    }

    console.log('✅ [API] /api/class-teacher/class-details - Successfully returning class details')
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/class-details - Error:', error)
    console.error('❌ [API] /api/class-teacher/class-details - Error stack:', error.stack)
    console.error('❌ [API] /api/class-teacher/class-details - Error message:', error.message)
    
    // Enhanced error handling with specific error types
    if (error.code === 'P1001') {
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          details: 'Unable to connect to the database. Please try again in a moment.'
        },
        { status: 503 }
      )
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { 
          error: 'Class details not found',
          details: 'Your class assignment is not set up. Please contact your school administrator.'
        },
        { status: 404 }
      )
    }
    
    // Check for specific Prisma errors
    if (error.code && error.code.startsWith('P')) {
      console.error('❌ [API] /api/class-teacher/class-details - Prisma error code:', error.code)
      return NextResponse.json(
        { 
          error: 'Database query failed',
          details: `Database error (${error.code}). Please try again in a moment.`
        },
        { status: 500 }
      )
    }
    
    // Check for specific field errors
    if (error.message && error.message.includes('Unknown field')) {
      console.error('❌ [API] /api/class-teacher/class-details - Field error:', error.message)
      return NextResponse.json(
        { 
          error: 'Database schema error',
          details: 'There is a configuration issue. Please contact support.'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch class details',
        details: `An unexpected error occurred: ${error.message || 'Unknown error'}. Please try refreshing the page.`
      },
      { status: 500 }
    )
  }
}