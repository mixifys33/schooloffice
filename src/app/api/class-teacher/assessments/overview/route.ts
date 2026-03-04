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
      select: { 
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    }

    // Get all classes the teacher is assigned to (using same logic as dashboard)
    let allClassIds: string[] = []

    // Check StaffResponsibility for CLASS_TEACHER_DUTY
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
      for (const responsibility of staffResponsibilities) {
        if (responsibility.details && typeof responsibility.details === 'object') {
          const details = responsibility.details as any
          if (details.classId) {
            allClassIds.push(details.classId)
          }
        }
      }
    }

    // Fallback to StaffClass assignments
    if (allClassIds.length === 0) {
      const staffClasses = await prisma.staffClass.findMany({
        where: {
          staffId: staff.id,
        },
        select: {
          classId: true,
        },
      })
      if (staffClasses.length > 0) {
        allClassIds = staffClasses.map(sc => sc.classId)
      }
    }

    // Fallback to Teacher model
    if (allClassIds.length === 0) {
      const teacher = await prisma.teacher.findFirst({
        where: { 
          schoolId,
          OR: [
            ...(staff.email ? [{ email: staff.email }] : []),
            { firstName: staff.firstName, lastName: staff.lastName }
          ]
        },
        select: { 
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
    }

    // If no classes found, return empty data
    if (allClassIds.length === 0) {
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

    // Get teacher's subject assignments for their classes
    const staffSubjects = await prisma.staffSubject.findMany({
      where: {
        staffId: staff.id,
        classId: { in: allClassIds },
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

    // If no subject assignments, create placeholder entries for each class
    let classSubjectPairs: Array<{
      classId: string
      className: string
      subjectId: string
      subjectName: string
      totalStudents: number
    }> = []

    if (staffSubjects.length > 0) {
      classSubjectPairs = staffSubjects.map(assignment => ({
        classId: assignment.classId,
        className: assignment.class.name,
        subjectId: assignment.subjectId,
        subjectName: assignment.subject.name,
        totalStudents: assignment.class._count.students
      }))
    } else {
      // No subject assignments, just show classes
      const classes = await prisma.class.findMany({
        where: {
          id: { in: allClassIds }
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: { students: true }
          }
        }
      })

      classSubjectPairs = classes.map(cls => ({
        classId: cls.id,
        className: cls.name,
        subjectId: '', // No subject assigned
        subjectName: 'All Subjects',
        totalStudents: cls._count.students
      }))
    }

    // Build classes array with assessment progress
    const classes = await Promise.all(
      classSubjectPairs.map(async (assignment) => {
        // Count CA entries for this class/subject/term
        const caEntries = assignment.subjectId ? await prisma.cAEntry.count({
          where: {
            subjectId: assignment.subjectId,
            termId: currentTerm.id,
            student: {
              classId: assignment.classId
            }
          }
        }) : 0

        // Count exam entries for this class/subject/term
        const examEntries = assignment.subjectId ? await prisma.examEntry.count({
          where: {
            subjectId: assignment.subjectId,
            termId: currentTerm.id,
            student: {
              classId: assignment.classId
            }
          }
        }) : 0

        const totalStudents = assignment.totalStudents
        const caPercentage = totalStudents > 0 ? Math.round((caEntries / totalStudents) * 100) : 0
        const examPercentage = totalStudents > 0 ? Math.round((examEntries / totalStudents) * 100) : 0

        return {
          id: `${assignment.classId}-${assignment.subjectId || 'all'}`,
          classId: assignment.classId,
          className: assignment.className,
          subjectId: assignment.subjectId || '',
          subjectName: assignment.subjectName,
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

    for (const assignment of classSubjectPairs) {
      if (!assignment.subjectId) continue // Skip if no subject assigned

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
