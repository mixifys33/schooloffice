/**
 * DoS Score Control API Route
 * Returns score control data for Director of Studies operations
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

    // Verify user has DOS role
    const hasDOSRole =
      staff.primaryRole === StaffRole.DOS ||
      (staff.secondaryRoles as string[] || []).includes(StaffRole.DOS)

    // Allow SCHOOL_ADMIN and DEPUTY to access as well
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY

    if (!hasDOSRole && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. DOS role required.' },
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

    if (!currentTerm) {
      return NextResponse.json({
        success: true,
        data: {
          overview: {
            totalStudents: 0,
            calculatedScores: 0,
            approvedScores: 0,
            lockedScores: 0,
            anomaliesDetected: 0,
            averageFinalScore: 0,
            passRate: 0,
            gradeDistribution: { A: 0, B: 0, C: 0, D: 0, E: 0 }
          },
          classScores: [],
          subjectScores: [],
          anomalies: [],
          criticalIssues: [],
          systemStatus: {
            calculationEngine: 'ACTIVE' as const,
            anomalyDetection: true,
            scoreLocking: true,
            lastCalculation: new Date().toISOString()
          }
        }
      })
    }

    // Get all students in the school
    const totalStudents = await prisma.student.count({
      where: { schoolId, status: 'ACTIVE' }
    })

    // Get all classes
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: {
        students: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        },
        classSubjects: {
          include: {
            subject: true
          }
        }
      }
    })

    const classScores = []
    const subjectScores = []

    for (const cls of classes) {
      const studentCount = cls.students.length
      const subjectsCount = cls.classSubjects.length

      classScores.push({
        classId: cls.id,
        className: cls.name,
        studentCount,
        subjectsCount,
        calculatedSubjects: 0,
        approvedSubjects: 0,
        lockedSubjects: 0,
        averageScore: 0,
        passRate: 0,
        anomaliesCount: 0,
        readyForReports: false,
        blockers: []
      })

      // Add subject scores for this class
      for (const classSubject of cls.classSubjects) {
        subjectScores.push({
          id: `${cls.id}-${classSubject.subjectId}`,
          subjectName: classSubject.subject.name,
          className: cls.name,
          teacherName: 'Not Assigned',
          studentCount,
          caAverage: 0,
          examAverage: 0,
          finalAverage: 0,
          passRate: 0,
          gradeDistribution: { A: 0, B: 0, C: 0, D: 0, E: 0 },
          hasAnomalies: false,
          anomalySeverity: 'LOW' as const,
          anomalyTypes: [],
          dosApproved: false,
          isLocked: false,
          canApprove: true,
          canBlock: true,
          canLock: false
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          calculatedScores: 0,
          approvedScores: 0,
          lockedScores: 0,
          anomaliesDetected: 0,
          averageFinalScore: 0,
          passRate: 0,
          gradeDistribution: { A: 0, B: 0, C: 0, D: 0, E: 0 }
        },
        classScores,
        subjectScores,
        anomalies: [],
        criticalIssues: [],
        systemStatus: {
          calculationEngine: 'ACTIVE' as const,
          anomalyDetection: true,
          scoreLocking: true,
          lastCalculation: new Date().toISOString()
        }
      }
    })

  } catch (error) {
    console.error('Error fetching DoS scores:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
