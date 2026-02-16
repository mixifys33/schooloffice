/**
 * DoS Assessments Monitoring API
 * Returns CA progress across all classes and subjects
 * 
 * Requirements: DoS needs to monitor academic progress
 * - Track CA completion rates by class and subject
 * - Identify classes/subjects falling behind
 * - Show teacher assignments
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/dos/assessments/monitoring - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      console.log('❌ [API] /api/dos/assessments/monitoring - No session found')
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in to access assessment monitoring'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      console.log('❌ [API] /api/dos/assessments/monitoring - No school context')
      return NextResponse.json(
        { 
          error: 'No school context found',
          message: 'Your account is not linked to a school. Please contact support.'
        },
        { status: 400 }
      )
    }

    // Verify user has DoS role
    const userRole = session.user.activeRole || session.user.role
    
    // Get staff record to check staff roles
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

    // Check if user has DoS access
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    const isDoS = staff && (
      staff.primaryRole === StaffRole.DOS ||
      (staff.secondaryRoles as string[] || []).includes(StaffRole.DOS)
    )

    if (!isAdmin && !isDoS) {
      console.log('❌ [API] /api/dos/assessments/monitoring - Invalid role:', userRole, 'Staff role:', staff?.primaryRole)
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'Director of Studies access required.'
        },
        { status: 403 }
      )
    }

    // Get current term
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isCurrent: true,
        },
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: {
        id: true,
        name: true,
      },
    })

    if (!currentTerm) {
      return NextResponse.json(
        { 
          error: 'No active term found',
          message: 'No current academic term is active. Please contact your school administrator.'
        },
        { status: 400 }
      )
    }

    // Get all classes with their subjects
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: {
        classSubjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        students: {
          where: { status: 'ACTIVE' },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Get all CA entries for current term
    const caEntries = await prisma.cAEntry.findMany({
      where: {
        termId: currentTerm.id,
        student: { schoolId },
      },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        status: true,
        updatedAt: true,
      },
    })

    // Get teacher assignments
    const staffSubjects = await prisma.staffSubject.findMany({
      where: {
        staff: { schoolId },
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
      },
    })

    // Build teacher map: classId-subjectId -> teacher
    const teacherMap = new Map<string, any>()
    staffSubjects.forEach(ss => {
      const key = `${ss.classId}-${ss.subjectId}`
      teacherMap.set(key, {
        id: ss.staff.id,
        name: `${ss.staff.firstName} ${ss.staff.lastName}`,
        employeeNumber: ss.staff.employeeNumber,
      })
    })

    // Build CA progress data
    const caProgress = classes.map(classData => {
      const totalStudents = classData.students.length

      const subjects = classData.classSubjects.map(cs => {
        const subjectId = cs.subjectId
        const teacherKey = `${classData.id}-${subjectId}`
        const teacher = teacherMap.get(teacherKey) || null

        // Get CA entries for this class and subject
        const subjectCAEntries = caEntries.filter(
          ca => ca.subjectId === subjectId && 
               classData.students.some(s => s.id === ca.studentId)
        )

        // Calculate progress
        // Assuming 3 CA assessments required per term (configurable)
        const assessmentsRequired = 3
        const uniqueStudentsWithCA = new Set(subjectCAEntries.map(ca => ca.studentId)).size
        const assessmentsCompleted = Math.floor(uniqueStudentsWithCA / totalStudents * assessmentsRequired)
        const completionRate = totalStudents > 0 
          ? Math.round((uniqueStudentsWithCA / totalStudents) * 100)
          : 0

        // Determine status
        let status: 'on_track' | 'behind' | 'critical' | 'no_teacher'
        if (!teacher) {
          status = 'no_teacher'
        } else if (completionRate >= 80) {
          status = 'on_track'
        } else if (completionRate >= 50) {
          status = 'behind'
        } else {
          status = 'critical'
        }

        // Get last updated date
        const lastUpdated = subjectCAEntries.length > 0
          ? subjectCAEntries.reduce((latest, ca) => 
              ca.updatedAt > latest ? ca.updatedAt : latest, 
              subjectCAEntries[0].updatedAt
            )
          : new Date()

        return {
          subjectId: cs.subject.id,
          subjectName: cs.subject.name,
          subjectCode: cs.subject.code,
          teacher,
          caProgress: {
            totalStudents,
            assessmentsCompleted,
            assessmentsRequired,
            completionRate,
            lastUpdated: lastUpdated.toISOString(),
          },
          status,
        }
      })

      return {
        classId: classData.id,
        className: classData.name,
        subjects,
      }
    })

    // Calculate overall stats
    const allSubjects = caProgress.flatMap(c => c.subjects)
    const stats = {
      totalClasses: classes.length,
      totalSubjects: allSubjects.length,
      onTrackSubjects: allSubjects.filter(s => s.status === 'on_track').length,
      behindSubjects: allSubjects.filter(s => s.status === 'behind').length,
      criticalSubjects: allSubjects.filter(s => s.status === 'critical').length,
      noTeacherSubjects: allSubjects.filter(s => s.status === 'no_teacher').length,
      overallCompletionRate: allSubjects.length > 0
        ? Math.round(
            allSubjects.reduce((sum, s) => sum + s.caProgress.completionRate, 0) / allSubjects.length
          )
        : 0,
    }

    const response = {
      caProgress,
      stats,
    }

    console.log('✅ [API] /api/dos/assessments/monitoring - Successfully returning data')
    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ [API] /api/dos/assessments/monitoring - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch assessment monitoring data',
        message: error.message || 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}
