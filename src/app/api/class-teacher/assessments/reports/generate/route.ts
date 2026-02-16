import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * POST /api/class-teacher/assessments/reports/generate
 * Generate report data for a specific class and subject
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    const body = await request.json()
    const { classId, subjectId, reportType } = body

    if (!classId || !subjectId || !reportType) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
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
      include: {
        academicYear: true,
      },
    })

    if (!currentTerm) {
      return NextResponse.json(
        { error: 'No active term found' },
        { status: 404 }
      )
    }

    // Get class and subject details
    const [classData, subjectData] = await Promise.all([
      prisma.class.findUnique({
        where: { id: classId },
        select: { name: true, level: true },
      }),
      prisma.subject.findUnique({
        where: { id: subjectId },
        select: { name: true, code: true },
      }),
    ])

    if (!classData || !subjectData) {
      return NextResponse.json(
        { error: 'Class or subject not found' },
        { status: 404 }
      )
    }

    // Get all students in the class
    const students = await prisma.student.findMany({
      where: {
        classId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    })

    // Get CA entries for all students
    const caEntries = await prisma.cAEntry.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        subjectId,
        termId: currentTerm.id,
      },
      select: {
        studentId: true,
        name: true,
        type: true,
        rawScore: true,
        maxScore: true,
        status: true,
      },
    })

    // Get exam entries for all students
    const examEntries = await prisma.examEntry.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        subjectId,
        termId: currentTerm.id,
      },
      select: {
        studentId: true,
        examScore: true,
        maxScore: true,
        status: true,
      },
    })

    // Calculate scores for each student
    const reportData = students.map((student) => {
      const studentCAs = caEntries.filter((ca) => ca.studentId === student.id)
      const studentExam = examEntries.find((exam) => exam.studentId === student.id)

      // Calculate CA score (out of 20)
      let caScore = 0
      let caActivities: Array<{ name: string; type: string; score: number; maxScore: number }> = []
      
      if (studentCAs.length > 0) {
        const caPercentages = studentCAs.map((ca) => {
          const percentage = ca.maxScore > 0 ? (ca.rawScore / ca.maxScore) * 100 : 0
          caActivities.push({
            name: ca.name,
            type: ca.type,
            score: ca.rawScore,
            maxScore: ca.maxScore,
          })
          return percentage
        })
        const caAverage = caPercentages.reduce((sum, p) => sum + p, 0) / caPercentages.length
        caScore = Math.round((caAverage / 100) * 20 * 100) / 100 // Out of 20, rounded to 2 decimals
      }

      // Calculate Exam score (out of 80)
      let examScore = 0
      if (studentExam && studentExam.maxScore > 0) {
        const examPercentage = (studentExam.examScore / studentExam.maxScore) * 100
        examScore = Math.round((examPercentage / 100) * 80 * 100) / 100 // Out of 80, rounded to 2 decimals
      }

      // Calculate final score
      const finalScore = Math.round((caScore + examScore) * 100) / 100

      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        caScore,
        caActivities,
        examScore,
        finalScore,
        hasCAs: studentCAs.length > 0,
        hasExam: !!studentExam,
      }
    })

    // Calculate class statistics
    const classStats = {
      totalStudents: students.length,
      averageCA: reportData.reduce((sum, s) => sum + s.caScore, 0) / students.length,
      averageExam: reportData.reduce((sum, s) => sum + s.examScore, 0) / students.length,
      averageFinal: reportData.reduce((sum, s) => sum + s.finalScore, 0) / students.length,
      highestScore: Math.max(...reportData.map((s) => s.finalScore)),
      lowestScore: Math.min(...reportData.map((s) => s.finalScore)),
    }

    return NextResponse.json({
      reportType,
      class: classData,
      subject: subjectData,
      term: {
        name: currentTerm.name,
        academicYear: currentTerm.academicYear.name,
      },
      students: reportData,
      classStats,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API] Error generating report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}
