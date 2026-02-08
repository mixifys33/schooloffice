import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * DoS CA Monitoring API
 * 
 * Provides continuous assessment progress data for DoS monitoring.
 */

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Verify DoS role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        staff: true
      }
    })

    // Check if user has DoS role
    const isDos = user?.roles?.includes('DOS') || user?.role === 'DOS'

    if (!isDos) {
      return NextResponse.json({ message: 'Access denied. DoS role required.' }, { status: 403 })
    }

    const schoolId = user.schoolId
    if (!schoolId) {
      return NextResponse.json({ message: 'School context required' }, { status: 400 })
    }

    // Get all classes with their subjects and CA progress
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: {
        subjects: {
          include: {
            subject: true,
            primaryTeacher: {
              include: {
                user: true
              }
            },
            marks: {
              where: {
                assessmentType: {
                  in: ['CA1', 'CA2', 'CA3']
                }
              },
              include: {
                student: true
              }
            }
          }
        },
        students: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Process CA progress data
    const caProgress = classes.map(classData => {
      const subjects = classData.subjects.map(classSubject => {
        const totalStudents = classData.students.length
        const marks = classSubject.marks
        
        // Calculate CA progress
        const assessmentTypes = ['CA1', 'CA2', 'CA3']
        let assessmentsCompleted = 0
        let assessmentsRequired = assessmentTypes.length * totalStudents
        
        // Count completed assessments per type
        assessmentTypes.forEach(type => {
          const typeMarks = marks.filter(mark => mark.assessmentType === type)
          if (typeMarks.length > 0) {
            assessmentsCompleted += typeMarks.length
          }
        })

        const completionRate = assessmentsRequired > 0 ? (assessmentsCompleted / assessmentsRequired) * 100 : 0
        
        // Determine status
        let status: 'on_track' | 'behind' | 'critical' | 'no_teacher'
        if (!classSubject.primaryTeacher) {
          status = 'no_teacher'
        } else if (completionRate >= 80) {
          status = 'on_track'
        } else if (completionRate >= 50) {
          status = 'behind'
        } else {
          status = 'critical'
        }

        // Get last updated date
        const lastUpdated = marks.length > 0 
          ? Math.max(...marks.map(mark => new Date(mark.updatedAt).getTime()))
          : new Date().getTime()

        return {
          subjectId: classSubject.subject.id,
          subjectName: classSubject.subject.name,
          subjectCode: classSubject.subject.code,
          teacher: classSubject.primaryTeacher ? {
            id: classSubject.primaryTeacher.user.id,
            name: classSubject.primaryTeacher.user.name || 'Unknown',
            employeeNumber: classSubject.primaryTeacher.employeeNumber || 'N/A'
          } : null,
          caProgress: {
            totalStudents,
            assessmentsCompleted,
            assessmentsRequired,
            completionRate: Math.round(completionRate),
            lastUpdated: new Date(lastUpdated).toISOString()
          },
          status
        }
      })

      return {
        classId: classData.id,
        className: classData.name,
        subjects
      }
    })

    // Calculate stats
    const allSubjects = caProgress.flatMap(c => c.subjects)
    const stats = {
      totalClasses: classes.length,
      totalSubjects: allSubjects.length,
      onTrackSubjects: allSubjects.filter(s => s.status === 'on_track').length,
      behindSubjects: allSubjects.filter(s => s.status === 'behind').length,
      criticalSubjects: allSubjects.filter(s => s.status === 'critical').length,
      noTeacherSubjects: allSubjects.filter(s => s.status === 'no_teacher').length,
      overallCompletionRate: allSubjects.length > 0 
        ? Math.round(allSubjects.reduce((sum, s) => sum + s.caProgress.completionRate, 0) / allSubjects.length)
        : 0
    }

    return NextResponse.json({
      caProgress,
      stats
    })

  } catch (error) {
    console.error('Error fetching CA monitoring data:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}