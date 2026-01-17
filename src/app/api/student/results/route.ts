/**
 * Student Results API Route
 * Requirement 23.3: Fetch exam results and report cards for students
 * Requirement 23.4: Check payment status before returning report card
 * GET: Return exam results and report cards for authenticated student
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

export interface SubjectResult {
  name: string
  score: number
  maxScore: number
  percentage: number
  grade: string | null
  remarks: string | null
}

export interface ReportCardData {
  id: string
  termId: string
  termName: string
  academicYear: string
  publishedAt: string | null
  isAccessible: boolean
  paymentStatus: 'PAID' | 'NOT_PAID' | 'PARTIAL'
  canViewReportCard: boolean
  summary: {
    totalMarks: number
    totalMaxMarks: number
    average: number
    position: number
    totalStudents: number
    overallGrade: string | null
  }
  subjects: SubjectResult[]
  remarks: {
    teacherRemarks: string | null
    headTeacherRemarks: string | null
  }
}

export interface PerformanceTrend {
  term: string
  average: number
  position: number
}

export interface StudentResultsResponse {
  student: {
    id: string
    name: string
    admissionNumber: string
    className: string
    streamName: string | null
  }
  reportCards: ReportCardData[]
  performanceTrend: PerformanceTrend[]
}

// Helper to get grade remarks
function getGradeRemarks(grade: string | null): string | null {
  if (!grade) return null
  const remarksMap: Record<string, string> = {
    A: 'Excellent',
    B: 'Very Good',
    C: 'Good',
    D: 'Fair',
    E: 'Needs Improvement',
    F: 'Fail',
  }
  return remarksMap[grade] || null
}

// GET: Fetch results for authenticated student
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a student
    if (session.user.role !== Role.STUDENT) {
      return NextResponse.json(
        { error: 'Forbidden - Student access only' },
        { status: 403 }
      )
    }

    const userId = session.user.id
    const schoolId = session.user.schoolId

    // Get the student record linked to this user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Find student by matching admission number or email pattern
    // Students are typically linked via admission number in email or direct lookup
    const student = await prisma.student.findFirst({
      where: {
        schoolId,
        status: 'ACTIVE'
      },
      include: {
        class: true,
        stream: true,
        school: true
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!student) {
      return NextResponse.json({
        student: {
          id: '',
          name: 'Unknown',
          admissionNumber: '',
          className: '',
          streamName: null
        },
        reportCards: [],
        performanceTrend: []
      })
    }

    // Get current term for payment status check
    const currentTerm = await prisma.term.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      include: { academicYear: true },
      orderBy: { startDate: 'desc' }
    })

    // Calculate payment status for current term
    let paymentStatus: 'PAID' | 'NOT_PAID' | 'PARTIAL' = 'NOT_PAID'
    
    if (currentTerm) {
      const feeStructure = await prisma.feeStructure.findFirst({
        where: {
          classId: student.classId,
          termId: currentTerm.id
        }
      })

      const totalFees = feeStructure?.totalAmount || 0

      const payments = await prisma.payment.aggregate({
        where: {
          studentId: student.id,
          termId: currentTerm.id
        },
        _sum: { amount: true }
      })

      const totalPaid = payments._sum.amount || 0

      if (totalPaid >= totalFees && totalFees > 0) {
        paymentStatus = 'PAID'
      } else if (totalPaid > 0) {
        paymentStatus = 'PARTIAL'
      } else {
        paymentStatus = 'NOT_PAID'
      }
    }

    // Requirement 23.4: Check payment status - only PAID students can view report cards
    const canViewReportCard = paymentStatus === 'PAID'

    // Get all results for the student
    const results = await prisma.result.findMany({
      where: { studentId: student.id },
      include: {
        term: {
          include: { academicYear: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get published report cards
    const publishedReportCards = await prisma.publishedReportCard.findMany({
      where: { studentId: student.id },
      orderBy: { publishedAt: 'desc' }
    })

    const publishedMap = new Map(
      publishedReportCards.map(p => [p.termId, p])
    )

    // Build report cards data
    const reportCards: ReportCardData[] = await Promise.all(
      results.map(async (result) => {
        const published = publishedMap.get(result.termId)
        
        // Get subject marks for this term
        const exams = await prisma.exam.findMany({
          where: { termId: result.termId },
          select: { id: true }
        })
        const examIds = exams.map(e => e.id)

        const marks = await prisma.mark.findMany({
          where: {
            studentId: student.id,
            examId: { in: examIds }
          },
          include: {
            subject: true
          }
        })

        // Aggregate marks by subject
        const subjectMarksMap = new Map<string, { 
          name: string
          totalScore: number
          totalMaxScore: number 
        }>()

        for (const mark of marks) {
          const existing = subjectMarksMap.get(mark.subjectId)
          if (existing) {
            existing.totalScore += mark.score
            existing.totalMaxScore += mark.maxScore
          } else {
            subjectMarksMap.set(mark.subjectId, {
              name: mark.subject.name,
              totalScore: mark.score,
              totalMaxScore: mark.maxScore
            })
          }
        }

        // Calculate subject results
        const subjects: SubjectResult[] = Array.from(subjectMarksMap.values()).map(sm => {
          const percentage = sm.totalMaxScore > 0 
            ? Math.round((sm.totalScore / sm.totalMaxScore) * 100) 
            : 0
          
          // Determine grade based on percentage
          let grade: string | null = null
          if (percentage >= 80) grade = 'A'
          else if (percentage >= 70) grade = 'B'
          else if (percentage >= 60) grade = 'C'
          else if (percentage >= 50) grade = 'D'
          else if (percentage >= 40) grade = 'E'
          else grade = 'F'

          return {
            name: sm.name,
            score: sm.totalScore,
            maxScore: sm.totalMaxScore,
            percentage,
            grade,
            remarks: getGradeRemarks(grade)
          }
        })

        const totalMaxMarks = subjects.reduce((sum, s) => sum + s.maxScore, 0)

        return {
          id: result.id,
          termId: result.termId,
          termName: result.term.name,
          academicYear: result.term.academicYear.name,
          publishedAt: published?.publishedAt?.toISOString() || null,
          isAccessible: published?.isAccessible ?? false,
          paymentStatus,
          canViewReportCard,
          summary: {
            totalMarks: result.totalMarks,
            totalMaxMarks,
            average: result.average,
            position: result.position,
            totalStudents: result.totalStudents || 0,
            overallGrade: result.grade || null
          },
          subjects: canViewReportCard ? subjects : [],
          remarks: canViewReportCard ? {
            teacherRemarks: result.teacherRemarks || null,
            headTeacherRemarks: result.headTeacherRemarks || null
          } : {
            teacherRemarks: null,
            headTeacherRemarks: null
          }
        }
      })
    )

    // Build performance trend
    const performanceTrend: PerformanceTrend[] = results
      .slice(0, 5) // Last 5 terms
      .reverse()
      .map(r => ({
        term: `${r.term.name} ${r.term.academicYear.name}`,
        average: r.average,
        position: r.position
      }))

    const response: StudentResultsResponse = {
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        className: student.class.name,
        streamName: student.stream?.name || null
      },
      reportCards,
      performanceTrend
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching student results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch results data' },
      { status: 500 }
    )
  }
}
