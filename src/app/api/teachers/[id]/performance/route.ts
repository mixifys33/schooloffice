/**
 * Teacher Performance API
 * GET - Fetch teacher performance metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teacherId } = await params
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'No school context found' }, { status: 400 })
    }

    // Verify user has appropriate role (admin or the teacher themselves)
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    
    // Get requesting user's staff record
    const requestingStaff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: { id: true },
    })

    const isSelf = requestingStaff?.id === teacherId

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: 'Access denied. You can only view your own performance or must be an admin.' },
        { status: 403 }
      )
    }

    // Get teacher record
    const teacher = await prisma.staff.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            lastLogin: true,
          },
        },
        staffSubjects: {
          include: {
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true, code: true } },
          },
        },
        staffClasses: {
          include: {
            class: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
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
        startDate: true,
        endDate: true,
      },
    })

    if (!currentTerm) {
      return NextResponse.json({
        teacher: {
          id: teacher.id,
          name: `${teacher.firstName} ${teacher.lastName}`,
          employeeNumber: teacher.employeeNumber,
        },
        performance: null,
        message: 'No active term found',
      })
    }

    // Get all students in teacher's classes
    const classIds = [...new Set([
      ...teacher.staffSubjects.map(s => s.classId),
      ...teacher.staffClasses.map(c => c.classId),
    ])]

    const totalStudents = await prisma.student.count({
      where: {
        classId: { in: classIds },
        status: 'ACTIVE',
      },
    })

    // Get CA entries statistics
    const [caEntries, submittedCAEntries] = await Promise.all([
      prisma.cAEntry.count({
        where: {
          teacherId: teacher.id,
          termId: currentTerm.id,
        },
      }),
      prisma.cAEntry.count({
        where: {
          teacherId: teacher.id,
          termId: currentTerm.id,
          status: { in: ['SUBMITTED', 'APPROVED'] },
        },
      }),
    ])

    // Get exam entries statistics
    const [examEntries, submittedExamEntries] = await Promise.all([
      prisma.examEntry.count({
        where: {
          teacherId: teacher.id,
          termId: currentTerm.id,
        },
      }),
      prisma.examEntry.count({
        where: {
          teacherId: teacher.id,
          termId: currentTerm.id,
          status: { in: ['SUBMITTED', 'APPROVED'] },
        },
      }),
    ])

    // Get evidence files count
    const evidenceCount = await prisma.learningEvidence.count({
      where: {
        teacherId: teacher.id,
      },
    })

    // Calculate submission rates
    const caSubmissionRate = caEntries > 0 ? (submittedCAEntries / caEntries) * 100 : 0
    const examSubmissionRate = examEntries > 0 ? (submittedExamEntries / examEntries) * 100 : 0

    // Get average scores for teacher's subjects
    const caScores = await prisma.cAEntry.findMany({
      where: {
        teacherId: teacher.id,
        termId: currentTerm.id,
        status: { in: ['SUBMITTED', 'APPROVED'] },
      },
      select: {
        rawScore: true,
        maxScore: true,
      },
    })

    const examScores = await prisma.examEntry.findMany({
      where: {
        teacherId: teacher.id,
        termId: currentTerm.id,
        status: { in: ['SUBMITTED', 'APPROVED'] },
      },
      select: {
        examScore: true,
        maxScore: true,
      },
    })

    // Calculate average CA score
    const caPercentages = caScores.map(ca => (ca.rawScore / ca.maxScore) * 100)
    const avgCAScore = caPercentages.length > 0
      ? caPercentages.reduce((sum, score) => sum + score, 0) / caPercentages.length
      : 0

    // Calculate average exam score
    const examPercentages = examScores.map(exam => (exam.examScore / exam.maxScore) * 100)
    const avgExamScore = examPercentages.length > 0
      ? examPercentages.reduce((sum, score) => sum + score, 0) / examPercentages.length
      : 0

    // Calculate pass rates
    const caPassRate = caPercentages.length > 0
      ? (caPercentages.filter(score => score >= 50).length / caPercentages.length) * 100
      : 0

    const examPassRate = examPercentages.length > 0
      ? (examPercentages.filter(score => score >= 50).length / examPercentages.length) * 100
      : 0

    // Get subject-wise performance
    const subjectPerformance = await Promise.all(
      teacher.staffSubjects.map(async (assignment) => {
        const subjectCAEntries = await prisma.cAEntry.count({
          where: {
            teacherId: teacher.id,
            termId: currentTerm.id,
            subjectId: assignment.subjectId,
          },
        })

        const subjectSubmittedCA = await prisma.cAEntry.count({
          where: {
            teacherId: teacher.id,
            termId: currentTerm.id,
            subjectId: assignment.subjectId,
            status: { in: ['SUBMITTED', 'APPROVED'] },
          },
        })

        const subjectExamEntries = await prisma.examEntry.count({
          where: {
            teacherId: teacher.id,
            termId: currentTerm.id,
            subjectId: assignment.subjectId,
          },
        })

        const subjectSubmittedExam = await prisma.examEntry.count({
          where: {
            teacherId: teacher.id,
            termId: currentTerm.id,
            subjectId: assignment.subjectId,
            status: { in: ['SUBMITTED', 'APPROVED'] },
          },
        })

        return {
          classId: assignment.class.id,
          className: assignment.class.name,
          subjectId: assignment.subject.id,
          subjectName: assignment.subject.name,
          subjectCode: assignment.subject.code,
          caEntries: subjectCAEntries,
          submittedCA: subjectSubmittedCA,
          caSubmissionRate: subjectCAEntries > 0 ? (subjectSubmittedCA / subjectCAEntries) * 100 : 0,
          examEntries: subjectExamEntries,
          submittedExam: subjectSubmittedExam,
          examSubmissionRate: subjectExamEntries > 0 ? (subjectSubmittedExam / subjectExamEntries) * 100 : 0,
        }
      })
    )

    const performance = {
      teacher: {
        id: teacher.id,
        employeeNumber: teacher.employeeNumber,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email || teacher.user.email,
        phone: teacher.phone || teacher.user.phone,
        department: teacher.department,
        hireDate: teacher.hireDate,
        lastLogin: teacher.user.lastLogin,
      },
      
      term: {
        id: currentTerm.id,
        name: currentTerm.name,
        startDate: currentTerm.startDate,
        endDate: currentTerm.endDate,
      },
      
      assignments: {
        totalClasses: teacher.staffClasses.length,
        totalSubjects: teacher.staffSubjects.length,
        totalStudents,
      },
      
      submissions: {
        ca: {
          total: caEntries,
          submitted: submittedCAEntries,
          pending: caEntries - submittedCAEntries,
          submissionRate: Math.round(caSubmissionRate * 10) / 10,
        },
        exam: {
          total: examEntries,
          submitted: submittedExamEntries,
          pending: examEntries - submittedExamEntries,
          submissionRate: Math.round(examSubmissionRate * 10) / 10,
        },
        evidence: {
          total: evidenceCount,
        },
      },
      
      scores: {
        ca: {
          average: Math.round(avgCAScore * 10) / 10,
          passRate: Math.round(caPassRate * 10) / 10,
          totalScored: caScores.length,
        },
        exam: {
          average: Math.round(avgExamScore * 10) / 10,
          passRate: Math.round(examPassRate * 10) / 10,
          totalScored: examScores.length,
        },
      },
      
      subjectPerformance,
    }

    return NextResponse.json({ performance })

  } catch (error: any) {
    console.error('❌ [API] /api/teachers/[id]/performance - GET - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch teacher performance', details: error.message },
      { status: 500 }
    )
  }
}
