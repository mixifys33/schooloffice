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

    // Build where clause
    const whereClause: Record<string, unknown> = {
      student: {
        schoolId,
        status: 'ACTIVE',
      },
    }

    if (termId) {
      whereClause.termId = termId
    }

    if (classId) {
      whereClause.student = {
        ...(whereClause.student as object),
        classId,
      }
    }

    if (search) {
      whereClause.student = {
        ...(whereClause.student as object),
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { admissionNumber: { contains: search, mode: 'insensitive' } },
        ],
      }
    }

    // Get total count
    const total = await prisma.result.count({ where: whereClause })

    // Get results with student info
    const results = await prisma.result.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            class: true,
            stream: true,
          },
        },
        term: {
          include: {
            academicYear: true,
          },
        },
      },
      orderBy: [
        { student: { class: { name: 'asc' } } },
        { position: 'asc' },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Get published report cards for these results
    const resultIds = results.map(r => r.id)
    const publishedReports = await prisma.publishedReportCard.findMany({
      where: {
        resultId: { in: resultIds },
      },
      select: {
        resultId: true,
        isAccessible: true,
      },
    })

    const publishedMap = new Map(publishedReports.map(p => [p.resultId, p]))

    // Get payment status for students
    const studentIds = results.map(r => r.studentId)
    const currentTermId = termId || results[0]?.termId

    // Get fee structures and payments to determine payment status
    const payments = currentTermId ? await prisma.payment.groupBy({
      by: ['studentId'],
      where: {
        studentId: { in: studentIds },
        termId: currentTermId,
      },
      _sum: {
        amount: true,
      },
    }) : []

    const paymentMap = new Map(payments.map(p => [p.studentId, p._sum.amount || 0]))

    // Get fee structures for students' classes
    const classIds = [...new Set(results.map(r => r.student.classId))]
    const feeStructures = currentTermId ? await prisma.feeStructure.findMany({
      where: {
        classId: { in: classIds },
        termId: currentTermId,
      },
    }) : []

    const feeMap = new Map(feeStructures.map(f => [f.classId, f.totalAmount]))

    // Map results to response format
    const mappedResults = results.map(result => {
      const published = publishedMap.get(result.id)
      const totalFees = feeMap.get(result.student.classId) || 0
      const totalPaid = paymentMap.get(result.studentId) || 0
      const paymentStatus = totalPaid >= totalFees ? 'PAID' : 'NOT_PAID'

      return {
        id: result.id,
        studentId: result.studentId,
        studentName: `${result.student.firstName} ${result.student.lastName}`,
        admissionNumber: result.student.admissionNumber,
        classId: result.student.classId,
        className: result.student.class.name,
        streamName: result.student.stream?.name || null,
        termId: result.termId,
        termName: result.term.name,
        totalMarks: result.totalMarks,
        average: result.average,
        position: result.position,
        totalStudents: result.totalStudents || 0,
        grade: result.grade,
        paymentStatus,
        isPublished: !!published,
        canSendReport: paymentStatus === 'PAID',
      }
    })

    // Calculate summary
    const paidCount = mappedResults.filter(r => r.paymentStatus === 'PAID').length
    const unpaidCount = mappedResults.filter(r => r.paymentStatus === 'NOT_PAID').length
    const publishedCount = mappedResults.filter(r => r.isPublished).length

    return NextResponse.json({
      results: mappedResults,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      summary: {
        totalStudents: total,
        publishedReports: publishedCount,
        unpublishedReports: total - publishedCount,
        paidStudents: paidCount,
        unpaidStudents: unpaidCount,
      },
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}
