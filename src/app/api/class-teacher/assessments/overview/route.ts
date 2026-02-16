/**
 * Class Teacher Assessments Overview API
 * Returns assessment data for class teacher's assigned classes
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@prisma/client'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID not found' }, { status: 400 })
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: {
        userId: session.user.id,
        schoolId
      },
      select: { id: true }
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    }

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isCurrent: true
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      select: { id: true }
    })

    if (!currentTerm) {
      return NextResponse.json({
        classes: [],
        pendingAssessments: [],
        upcomingDeadlines: [],
        classPerformance: {
          caAverage: 0,
          examAverage: 0,
          finalAverage: 0,
          passRate: 0
        }
      })
    }

    // Get teacher's subject assignments
    const staffSubjects = await prisma.staffSubject.findMany({
      where: {
        staffId: staff.id,
        schoolId
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            _count: {
              select: { students: true }
            }
          }
        },
        subject: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Build classes array with assessment progress
    const classes = await Promise.all(
      staffSubjects.map(async (assignment) => {
        // Count CA entries for this class/subject/term
        const caEntries = await prisma.cAEntry.count({
          where: {
            subjectId: assignment.subjectId,
            termId: currentTerm.id,
            student: {
              classId: assignment.classId
            }
          }
        })

        // Count exam entries for this class/subject/term
        const examEntries = await prisma.examEntry.count({
          where: {
            subjectId: assignment.subjectId,
            termId: currentTerm.id,
            student: {
              classId: assignment.classId
            }
          }
        })

        const totalStudents = assignment.class._count.students
        const caPercentage = totalStudents > 0 ? Math.round((caEntries / totalStudents) * 100) : 0
        const examPercentage = totalStudents > 0 ? Math.round((examEntries / totalStudents) * 100) : 0

        return {
          id: `${assignment.classId}-${assignment.subjectId}`,
          classId: assignment.classId,
          className: assignment.class.name,
          subjectId: assignment.subjectId,
          subjectName: assignment.subject.name,
          caEntries,
          examEntries,
          caPercentage,
          examPercentage,
          totalStudents,
          completedStudents: Math.min(caEntries, examEntries)
        }
      })
    )

    // Get pending assessments (draft CA and exam entries)
    const pendingCA = await prisma.cAEntry.findMany({
      where: {
        teacherId: staff.id,
        termId: currentTerm.id,
        status: 'DRAFT'
      },
      include: {
        subject: { select: { name: true } },
        student: {
          select: {
            class: { select: { name: true, id: true } }
          }
        }
      },
      take: 5,
      orderBy: { updatedAt: 'desc' }
    })

    const pendingExams = await prisma.examEntry.findMany({
      where: {
        teacherId: staff.id,
        termId: currentTerm.id,
        status: 'DRAFT'
      },
      include: {
        subject: { select: { name: true } },
        student: {
          select: {
            class: { select: { name: true, id: true } }
          }
        }
      },
      take: 5,
      orderBy: { updatedAt: 'desc' }
    })

    const pendingAssessments = [
      ...pendingCA.map(ca => ({
        id: ca.id,
        name: ca.name,
        type: 'ca' as const,
        status: ca.status.toLowerCase() as 'draft' | 'submitted' | 'approved' | 'pending',
        date: ca.createdAt.toISOString(),
        subject: ca.subject.name,
        class: ca.student.class.name,
        classId: ca.student.class.id,
        subjectId: ca.subjectId,
        totalStudents: 0,
        completedStudents: 0
      })),
      ...pendingExams.map(exam => ({
        id: exam.id,
        name: 'Exam',
        type: 'exam' as const,
        status: exam.status.toLowerCase() as 'draft' | 'submitted' | 'approved' | 'pending',
        date: exam.examDate.toISOString(),
        subject: exam.subject.name,
        class: exam.student.class.name,
        classId: exam.student.class.id,
        subjectId: exam.subjectId,
        totalStudents: 0,
        completedStudents: 0
      }))
    ]

    // Calculate class performance metrics
    let totalCAScore = 0
    let totalExamScore = 0
    let caCount = 0
    let examCount = 0
    let passCount = 0
    let totalCount = 0

    for (const assignment of staffSubjects) {
      // Get CA scores (using rawScore field)
      const caScores = await prisma.cAEntry.findMany({
        where: {
          subjectId: assignment.subjectId,
          termId: currentTerm.id,
          student: { classId: assignment.classId }
        },
        select: { rawScore: true, maxScore: true }
      })

      caScores.forEach(ca => {
        if (ca.rawScore !== null && ca.rawScore > 0 && ca.maxScore > 0) {
          totalCAScore += (ca.rawScore / ca.maxScore) * 100
          caCount++
        }
      })

      // Get exam scores
      const examScores = await prisma.examEntry.findMany({
        where: {
          subjectId: assignment.subjectId,
          termId: currentTerm.id,
          student: { classId: assignment.classId }
        },
        select: { examScore: true, maxScore: true }
      })

      examScores.forEach(exam => {
        if (exam.examScore !== null && exam.examScore > 0 && exam.maxScore > 0) {
          const percentage = (exam.examScore / exam.maxScore) * 100
          totalExamScore += percentage
          examCount++
          
          // Count as pass if >= 50%
          if (percentage >= 50) {
            passCount++
          }
          totalCount++
        }
      })
    }

    const caAverage = caCount > 0 ? Math.round(totalCAScore / caCount) : 0
    const examAverage = examCount > 0 ? Math.round(totalExamScore / examCount) : 0
    const finalAverage = Math.round((caAverage * 0.2) + (examAverage * 0.8))
    const passRate = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0

    // Get upcoming deadlines (placeholder - would need a deadlines table)
    const upcomingDeadlines: Array<{
      id: string
      title: string
      subject: string
      class: string
      deadline: string
      type: 'ca' | 'exam'
    }> = []

    return NextResponse.json({
      classes,
      pendingAssessments,
      upcomingDeadlines,
      classPerformance: {
        caAverage,
        examAverage,
        finalAverage,
        passRate
      }
    })
  } catch (error) {
    console.error('Error fetching assessment overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessment data' },
      { status: 500 }
    )
  }
}
