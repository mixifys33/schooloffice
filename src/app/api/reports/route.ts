/**
 * Reports API Route
 * GET: Fetch exam results by class and term
 * Requirements: 7.1
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const classId = searchParams.get('classId') || ''
    const termId = searchParams.get('termId') || ''

    // If no termId provided, get the most recent term
    let currentTermId = termId
    if (!currentTermId) {
      const recentTerm = await prisma.term.findFirst({
        where: { 
          academicYear: {
            schoolId: schoolId
          }
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true }
      })
      currentTermId = recentTerm?.id || ''
    }

    if (!currentTermId) {
      return NextResponse.json({
        results: [],
        pagination: { page: 1, pageSize, total: 0, totalPages: 0 },
        summary: {
          totalStudents: 0,
          publishedReports: 0,
          unpublishedReports: 0,
          paidStudents: 0,
          unpaidStudents: 0,
        },
      })
    }

    // Build where clause for students
    const studentWhere: Record<string, unknown> = {
      schoolId,
      status: 'ACTIVE',
    }

    if (classId) {
      studentWhere.classId = classId
    }

    if (search) {
      studentWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { admissionNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get ALL students matching the filter (for accurate counts)
    const allStudents = await prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        classId: true,
        results: {
          where: { termId: currentTermId },
          select: { 
            id: true,
            publishedReportCard: { select: { isAccessible: true } }
          }
        }
      }
    })

    // Get students for current page with full details
    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        class: { select: { id: true, name: true } },
        stream: { select: { id: true, name: true } },
        results: {
          where: { termId: currentTermId },
          include: {
            term: { select: { id: true, name: true } },
            publishedReportCard: { select: { isAccessible: true } }
          }
        }
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [
        { class: { name: 'asc' } },
        { firstName: 'asc' }
      ]
    })

    // Get total count of students (not results)
    const total = allStudents.length

    // Get payment information for ALL students (for accurate summary)
    const allStudentIds = allStudents.map(s => s.id)
    const [payments, feeStructures] = await Promise.all([
      prisma.payment.groupBy({
        by: ['studentId'],
        where: {
          studentId: { in: allStudentIds },
          termId: currentTermId,
        },
        _sum: { amount: true },
      }),
      prisma.feeStructure.findMany({
        where: {
          classId: { in: [...new Set(allStudents.map(s => s.classId))] },
          termId: currentTermId,
        },
        select: { classId: true, totalAmount: true }
      })
    ])

    const paymentMap = new Map(payments.map(p => [p.studentId, p._sum.amount || 0]))
    const feeMap = new Map(feeStructures.map(f => [f.classId, f.totalAmount]))

    // Calculate summary from ALL students
    let totalPaidStudents = 0
    let totalUnpaidStudents = 0
    let totalPublishedReports = 0
    let totalStudentsWithResults = 0

    allStudents.forEach(student => {
      const totalFees = feeMap.get(student.classId) || 0
      const totalPaid = paymentMap.get(student.id) || 0
      const isPaid = totalPaid >= totalFees
      
      if (student.results.length > 0) {
        totalStudentsWithResults++
        if (student.results[0].publishedReportCard) {
          totalPublishedReports++
        }
      }
      
      if (isPaid) {
        totalPaidStudents++
      } else {
        totalUnpaidStudents++
      }
    })

    // Map students to results format (only for current page)
    const mappedResults = students
      .filter(student => student.results.length > 0)
      .map(student => {
        const result = student.results[0] // Should only be one result per term
        const totalFees = feeMap.get(student.classId) || 0
        const totalPaid = paymentMap.get(student.id) || 0
        const paymentStatus = totalPaid >= totalFees ? 'PAID' : 'NOT_PAID'

        return {
          id: result.id,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          classId: student.classId,
          className: student.class.name,
          streamName: student.stream?.name || null,
          termId: result.termId,
          termName: result.term.name,
          totalMarks: result.totalMarks,
          average: result.average,
          position: result.position,
          totalStudents: result.totalStudents || 0,
          grade: result.grade,
          paymentStatus,
          isPublished: !!result.publishedReportCard,
          canSendReport: paymentStatus === 'PAID',
        }
      })

    return NextResponse.json({
      results: mappedResults,
      pagination: {
        page,
        pageSize,
        total: totalStudentsWithResults,
        totalPages: Math.ceil(totalStudentsWithResults / pageSize),
      },
      summary: {
        totalStudents: allStudents.length,
        publishedReports: totalPublishedReports,
        unpublishedReports: totalStudentsWithResults - totalPublishedReports,
        paidStudents: totalPaidStudents,
        unpaidStudents: totalUnpaidStudents,
      },
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
