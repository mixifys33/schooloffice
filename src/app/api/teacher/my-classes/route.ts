/**
 * My Classes API Route for Teacher Section
 * Requirements: Teaching context per class, curriculum topics, progress tracking
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StudentStatus } from '@/types/enums'

/**
 * Teacher class data structure
 */
export interface TeacherClassData {
  id: string
  classId: string
  className: string
  streamName: string | null
  subjects: {
    id: string
    name: string
    curriculumTopics: string[]
    teachingProgress: {
      status: 'not_started' | 'in_progress' | 'completed'
      completedTopics: number
      totalTopics: number
      percentage: number
    }
  }[]
  studentCount: number
  activeAssessments: number
  pendingSubmissions: number
  upcomingDeadlines: {
    id: string
    title: string
    type: string
    dueDate: string
    completed: boolean
  }[]
}

/**
 * GET /api/teacher/my-classes
 * Returns teacher's assigned classes with curriculum and progress information
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has TEACHER role
    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Access denied. Teacher role required.' },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Get teacher record with staff subjects
    const teacher = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      include: {
        staffSubjects: {
          include: {
            subject: true,
            class: true,
          }
        },
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Group staff subjects by class
    const classSubjectsMap = new Map<string, typeof teacher.staffSubjects>()
    teacher.staffSubjects.forEach(ss => {
      if (!classSubjectsMap.has(ss.classId)) {
        classSubjectsMap.set(ss.classId, [])
      }
      classSubjectsMap.get(ss.classId)?.push(ss)
    })

    // Build class data
    const classData: TeacherClassData[] = []

    for (const [classId, subjects] of classSubjectsMap.entries()) {
      const classInfo = subjects[0].class // All subjects in the same class have the same class info
      
      // Get student count for this class
      const studentCount = await prisma.student.count({
        where: {
          classId,
          status: StudentStatus.ACTIVE,
        },
      })

      // Get assessments for this class and teacher's subjects
      const classAssessments = await prisma.teacherAssessment.findMany({
        where: {
          classId,
          staffId: teacher.id,
          subjectId: { in: subjects.map(s => s.subjectId) },
        },
      })

      // Get upcoming deadlines (due in next 7 days)
      const now = new Date()
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      
      const upcomingDeadlines = await prisma.teacherAssessment.findMany({
        where: {
          classId,
          staffId: teacher.id,
          subjectId: { in: subjects.map(s => s.subjectId) },
          dueDate: {
            gte: now,
            lte: weekFromNow,
          },
        },
        select: {
          id: true,
          name: true,
          assessmentType: true,
          dueDate: true,
        },
      })

      // Get real curriculum topics for each subject in this class
      // Since CurriculumTopic doesn't exist, we'll use the subjects themselves as topics
      const subjectsWithCurriculum = await Promise.all(subjects.map(async (ss) => {
        // Get class subjects to see what topics/subjects are assigned to this class
        const classSubjects = await prisma.classSubject.findMany({
          where: {
            classId,
            subjectId: ss.subjectId,
            isActive: true,
          },
          select: {
            id: true,
            subject: {
              select: {
                name: true,
              },
            },
          },
        })

        // For now, we'll use a simple progress calculation based on marks entered
        const studentMarks = await prisma.mark.findMany({
          where: {
            subjectId: ss.subjectId,
            student: {
              classId,
              status: StudentStatus.ACTIVE,
            },
          },
          select: {
            id: true,
          },
        })

        const studentsInClass = await prisma.student.count({
          where: {
            classId,
            status: StudentStatus.ACTIVE,
          },
        })

        // Calculate progress based on marks entered vs total students
        const marksEntered = studentMarks.length
        const totalExpected = studentsInClass
        const percentage = totalExpected > 0 ? Math.round((marksEntered / totalExpected) * 100) : 0

        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started'
        if (percentage === 100) {
          status = 'completed'
        } else if (percentage > 0) {
          status = 'in_progress'
        }

        return {
          id: ss.subjectId,
          name: ss.subject.name,
          curriculumTopics: classSubjects.map(cs => cs.subject.name),
          teachingProgress: {
            status,
            completedTopics: status === 'completed' ? 1 : (status === 'in_progress' ? 0 : 0),
            totalTopics: 1, // Simplified - each subject is one "topic"
            percentage,
          }
        }
      }))

      // Format class data
      const formattedClass: TeacherClassData = {
        id: `${classId}-${teacher.id}`, // Unique identifier for this class-teacher combo
        classId,
        className: classInfo.name,
        streamName: null, // Would come from stream info if needed
        subjects: subjectsWithCurriculum,
        studentCount,
        activeAssessments: classAssessments.length,
        pendingSubmissions: classAssessments.filter(a => !a.submittedAt).length,
        upcomingDeadlines: upcomingDeadlines.map(d => ({
          id: d.id,
          title: d.name,
          type: d.assessmentType,
          dueDate: d.dueDate?.toISOString() || '',
          completed: !!d.submittedAt,
        })),
      }

      classData.push(formattedClass)
    }

    return NextResponse.json({ classes: classData })
  } catch (error) {
    console.error('Error fetching teacher classes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher classes' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/teacher/my-classes/[classId]
 * Returns detailed information for a specific class
 */
export async function GET_CLASS_DETAIL(request: NextRequest, { params }: { params: { classId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has TEACHER role
    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Access denied. Teacher role required.' },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    const { classId } = params

    // Get teacher record
    const teacher = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Verify teacher is assigned to this class
    const staffSubject = await prisma.staffSubject.findFirst({
      where: {
        staffId: teacher.id,
        classId,
      },
    })

    if (!staffSubject) {
      return NextResponse.json(
        { error: 'You are not assigned to this class' },
        { status: 403 }
      )
    }

    // Get class details
    const classDetails = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          where: { status: StudentStatus.ACTIVE },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
          orderBy: [
            { lastName: 'asc' },
            { firstName: 'asc' },
          ],
        },
      },
    })

    if (!classDetails) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Get teacher's subjects for this class
    const teacherSubjects = await prisma.staffSubject.findMany({
      where: {
        staffId: teacher.id,
        classId,
      },
      include: {
        subject: true,
      },
    })

    // Get assessments for this class and teacher's subjects
    const assessments = await prisma.teacherAssessment.findMany({
      where: {
        classId,
        staffId: teacher.id,
        subjectId: { in: teacherSubjects.map(ts => ts.subjectId) },
      },
      include: {
        subject: true,
      },
    })

    // Get learning evidence for this class
    const learningEvidence = await prisma.learningEvidence.findMany({
      where: {
        classId,
        staffId: teacher.id,
      },
      include: {
        subject: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      },
    })

    const classDetail = {
      id: classDetails.id,
      name: classDetails.name,
      studentCount: classDetails.students.length,
      students: classDetails.students,
      subjects: teacherSubjects.map(ts => ({
        id: ts.subjectId,
        name: ts.subject.name,
      })),
      assessments: assessments.map(a => ({
        id: a.id,
        name: a.name,
        type: a.assessmentType,
        subject: a.subject.name,
        maxScore: a.maxScore,
        dateAssigned: a.dateAssigned,
        dueDate: a.dueDate,
        isLocked: a.isLocked,
      })),
      learningEvidence: learningEvidence.map(le => ({
        id: le.id,
        title: le.title,
        type: le.evidenceType,
        subject: le.subject.name,
        student: le.student ? `${le.student.firstName} ${le.student.lastName}` : 'General',
        uploadedAt: le.uploadedAt,
      })),
    }

    return NextResponse.json(classDetail)
  } catch (error) {
    console.error('Error fetching class detail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class detail' },
      { status: 500 }
    )
  }
}