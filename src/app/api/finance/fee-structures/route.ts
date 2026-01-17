/**
 * Fee Structures API Route
 * CRUD operations for fee structures
 * 
 * Requirements: 11.1, 11.2
 * Property 20: Finance Access Control
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { 
  hasFinanceAccess,
  canWriteFinanceData,
  FINANCE_ACCESS_ERRORS
} from '@/lib/finance-access'
import { createFeeStructure, FeeStructureError } from '@/services/fee-structure.service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role

    // Property 20: Finance Access Control
    // Requirement 11.1, 11.2: Verify role has finance access
    if (!hasFinanceAccess(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'You do not have access to fee structures',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const termId = searchParams.get('termId')
    const classId = searchParams.get('classId')
    const studentType = searchParams.get('studentType')

    const where: any = { schoolId }
    if (termId) where.termId = termId
    if (classId) where.classId = classId
    if (studentType) where.studentType = studentType

    const feeStructures = await prisma.feeStructure.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
        term: {
          select: { id: true, name: true },
          include: { academicYear: { select: { name: true } } },
        },
        items: { orderBy: { category: 'asc' } },
      },
      orderBy: [
        { term: { startDate: 'desc' } },
        { class: { level: 'asc' } },
      ],
    })

    return NextResponse.json({
      feeStructures: feeStructures.map(fs => ({
        id: fs.id,
        classId: fs.classId,
        className: fs.class.name,
        termId: fs.termId,
        termName: fs.term.name,
        academicYear: fs.term.academicYear.name,
        studentType: fs.studentType,
        totalAmount: fs.totalAmount,
        dueDate: fs.dueDate?.toISOString(),
        isActive: fs.isActive,
        items: fs.items.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          amount: item.amount,
          isOptional: item.isOptional,
          isOneTime: item.isOneTime,
          description: item.description,
        })),
        createdAt: fs.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error fetching fee structures:', error)
    return NextResponse.json({ error: 'Failed to fetch fee structures' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userId = (session.user as { id?: string }).id
    const userRole = session.user.role as Role

    // Property 20: Finance Access Control
    // Requirement 11.1: Only ACCOUNTANT, SCHOOL_ADMIN can create fee structures
    if (!canWriteFinanceData(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'You do not have permission to create fee structures',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const body = await request.json()
    const { classId, termId, studentType, dueDate, items } = body

    if (!classId || !termId || !studentType || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const feeStructure = await createFeeStructure({
      schoolId,
      classId,
      termId,
      studentType,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      items,
      createdBy: userId,
    })

    return NextResponse.json(feeStructure)
  } catch (error) {
    console.error('Error creating fee structure:', error)
    if (error instanceof FeeStructureError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create fee structure' }, { status: 500 })
  }
}
