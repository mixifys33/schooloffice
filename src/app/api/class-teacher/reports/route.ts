import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@prisma/client'

/**
 * GET /api/class-teacher/reports
 * Fetch report data for class teacher
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    // Get staff record
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

    if (!staff) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    }

    // Authorization - Check if user is a class teacher
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    const isClassTeacher =
      staff.primaryRole === StaffRole.CLASS_TEACHER ||
      ((staff.secondaryRoles as string[]) || []).includes(StaffRole.CLASS_TEACHER)

    if (!isAdmin && !isClassTeacher) {
      return NextResponse.json(
        { error: 'Class Teacher access required' },
        { status: 403 }
      )
    }

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isCurrent: true,
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      select: { id: true },
    })

    if (!currentTerm) {
      return NextResponse.json({
        classes: [],
        studentPerformance: [],
        reportTypes: [],
        classPerformance: {
          caAverage: 0,
          examAverage: 0,
          finalAverage: 0,
          passRate: 0,
        },
      })
    }

    // Get staff subject assignments
    const staffSubjects = await prisma.staffSubject.findMany({
      where: {
        staffId: staff.id,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Build class reports
    const classReports = await Promise.all(
      staffSubjects.map(async (assignment) => {
        // Get students in class
        const students = await prisma.student.findMany({
          where: {
            classId: assignment.classId,
            schoolId,
          },
          select: { id: true },
        })

        const studentIds = students.map((s) => s.id)

        // Get CA entries
        const caEntries = await prisma.cAEntry.findMany({
          where: {
            studentId: { in: studentIds },
            subjectId: assignment.subjectId,
            termId: currentTerm.id,
          },
          select: {
            studentId: true,
            rawScore: true,
            maxScore: true,
          },
        })

        // Get exam entries
        const examEntries = await prisma.examEntry.findMany({
          where: {
            studentId: { in: studentIds },
            subjectId: assignment.subjectId,
            termId: currentTerm.id,
          },
          select: {
            studentId: true,
            examScore: true,
            maxScore: true,
          },
        })

        // Calculate averages
        const caScores = caEntries
          .filter((e) => e.rawScore !== null)
          .map((e) => (e.rawScore! / e.maxScore) * 100)
        const examScores = examEntries
          .filter((e) => e.examScore !== null)
          .map((e) => (e.examScore! / e.maxScore) * 100)

        const averageCA =
          caScores.length > 0
            ? Math.round(caScores.reduce((a, b) => a + b, 0) / caScores.length)
            : null

        const averageExam =
          examScores.length > 0
            ? Math.round(examScores.reduce((a, b) => a + b, 0) / examScores.length)
            : null

        const averageFinal =
          averageCA !== null && averageExam !== null
            ? Math.round((averageCA + averageExam) / 2)
            : null

        // Calculate completion rates
        const caCompletion = students.length > 0
          ? Math.round((caEntries.length / students.length) * 100)
          : 0

        const examCompletion = students.length > 0
          ? Math.round((examEntries.length / students.length) * 100)
          : 0

        const finalCompletion = Math.min(caCompletion, examCompletion)

        return {
          id: `${assignment.classId}-${assignment.subjectId}`,
          className: assignment.class.name,
          subjectName: assignment.subject.name,
          studentCount: students.length,
          averageCA,
          averageExam,
          averageFinal,
          caCompletion,
          examCompletion,
          finalCompletion,
        }
      })
    )

    // Calculate overall class performance
    const allCAScores = classReports
      .filter((r) => r.averageCA !== null)
      .map((r) => r.averageCA!)
    const allExamScores = classReports
      .filter((r) => r.averageExam !== null)
      .map((r) => r.averageExam!)
    const allFinalScores = classReports
      .filter((r) => r.averageFinal !== null)
      .map((r) => r.averageFinal!)

    const caAverage =
      allCAScores.length > 0
        ? Math.round(allCAScores.reduce((a, b) => a + b, 0) / allCAScores.length)
        : 0

    const examAverage =
      allExamScores.length > 0
        ? Math.round(allExamScores.reduce((a, b) => a + b, 0) / allExamScores.length)
        : 0

    const finalAverage =
      allFinalScores.length > 0
        ? Math.round(allFinalScores.reduce((a, b) => a + b, 0) / allFinalScores.length)
        : 0

    const passRate =
      allFinalScores.length > 0
        ? Math.round((allFinalScores.filter((s) => s >= 50).length / allFinalScores.length) * 100)
        : 0

    return NextResponse.json({
      classes: classReports,
      studentPerformance: [], // Will be populated when a specific class is selected
      reportTypes: [
        {
          id: 'ca-only',
          name: 'CA-Only Report',
          description: 'Show CA activities and contributions only',
          type: 'ca-only',
        },
        {
          id: 'exam-only',
          name: 'Exam-Only Report',
          description: 'Show exam scores and contributions only',
          type: 'exam-only',
        },
        {
          id: 'final',
          name: 'Final Term Report',
          description: 'Complete report with CA and Exam combined',
          type: 'final',
        },
      ],
      classPerformance: {
        caAverage,
        examAverage,
        finalAverage,
        passRate,
      },
    })
  } catch (error) {
    console.error('Error fetching class teacher reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report data' },
      { status: 500 }
    )
  }
}
