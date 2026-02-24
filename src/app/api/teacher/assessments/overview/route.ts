import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

/**
 * GET /api/teacher/assessments/overview
 * Get assessment overview data for the authenticated teacher
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const schoolId = session.user.schoolId

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId,
        schoolId,
      },
      select: {
        id: true,
        teacherAssignments: {
          include: {
            subject: true,
            class: true,
          },
        },
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Build class-subject combinations
    const classSubjects = teacher.teacherAssignments.map(ta => ({
      id: `${ta.classId}-${ta.subjectId}`,
      classId: ta.classId,
      className: ta.class.name,
      subjectId: ta.subjectId,
      subjectName: ta.subject.name,
      caEntries: 0,
      examEntries: 0,
      caPercentage: 20,
      examPercentage: 80,
      totalStudents: 0,
      completedStudents: 0,
    }))

    // Get student counts for each class
    for (const cs of classSubjects) {
      const studentCount = await prisma.student.count({
        where: {
          classId: cs.classId,
          status: 'ACTIVE',
        },
      })
      cs.totalStudents = studentCount
    }

    // Get pending assessments (teacher assessments)
    const pendingAssessments = await prisma.teacherAssessment.findMany({
      where: {
        staffId: teacher.id,
        isLocked: false,
      },
      include: {
        subject: true,
        class: true,
      },
      orderBy: {
        dateAssigned: 'desc',
      },
      take: 10,
    })

    const formattedPendingAssessments = pendingAssessments.map(assessment => ({
      id: assessment.id,
      name: assessment.name,
      type: 'ca' as const,
      status: assessment.submittedAt ? 'submitted' as const : 'draft' as const,
      date: assessment.dateAssigned.toISOString(),
      subject: assessment.subject.name,
      class: assessment.class.name,
      caCount: 1,
      examCount: 0,
      caPercentage: 20,
      examPercentage: 80,
      totalStudents: 0,
      completedStudents: 0,
    }))

    // Get upcoming deadlines
    const now = new Date()
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    
    const upcomingDeadlines = await prisma.teacherAssessment.findMany({
      where: {
        staffId: teacher.id,
        dueDate: {
          gte: now,
          lte: weekFromNow,
        },
      },
      include: {
        subject: true,
        class: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
      take: 5,
    })

    const formattedDeadlines = upcomingDeadlines.map(assessment => ({
      id: assessment.id,
      title: assessment.name,
      subject: assessment.subject.name,
      class: assessment.class.name,
      deadline: assessment.dueDate?.toISOString() || '',
      type: 'ca' as const,
    }))

    return NextResponse.json({
      classes: classSubjects,
      pendingAssessments: formattedPendingAssessments,
      upcomingDeadlines: formattedDeadlines,
    })
  } catch (error) {
    console.error('Error fetching teacher assessments overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessment data' },
      { status: 500 }
    )
  }
}
