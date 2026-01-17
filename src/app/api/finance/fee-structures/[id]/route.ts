/**
 * Fee Structure Detail API Route
 * Update and delete operations for a specific fee structure
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role
    const { id } = await params

    // Property 20: Finance Access Control
    if (!hasFinanceAccess(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const feeStructure = await prisma.feeStructure.findFirst({
      where: { id, schoolId },
      include: {
        class: { select: { id: true, name: true } },
        term: { select: { id: true, name: true }, include: { academicYear: { select: { name: true } } } },
        items: { orderBy: { category: 'asc' } },
      },
    })

    if (!feeStructure) {
      return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: feeStructure.id,
      classId: feeStructure.classId,
      className: feeStructure.class.name,
      termId: feeStructure.termId,
      termName: feeStructure.term.name,
      academicYear: feeStructure.term.academicYear.name,
      studentType: feeStructure.studentType,
      totalAmount: feeStructure.totalAmount,
      dueDate: feeStructure.dueDate?.toISOString(),
      isActive: feeStructure.isActive,
      items: feeStructure.items.map(item => ({
        id: item.id, name: item.name, category: item.category, amount: item.amount,
        isOptional: item.isOptional, isOneTime: item.isOneTime, description: item.description,
      })),
    })
  } catch (error) {
    console.error('Error fetching fee structure:', error)
    return NextResponse.json({ error: 'Failed to fetch fee structure' }, { status: 500 })
  }
}


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role
    const { id } = await params

    // Property 20: Finance Access Control
    // Requirement 11.1: Only ACCOUNTANT, SCHOOL_ADMIN can modify fee structures
    if (!canWriteFinanceData(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'You do not have permission to modify fee structures',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const body = await request.json()
    const { dueDate, isActive, items } = body

    const existing = await prisma.feeStructure.findFirst({
      where: { id, schoolId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 })
    }

    // Update fee structure and items in a transaction
    const feeStructure = await prisma.$transaction(async (tx) => {
      // Delete existing items if new items provided
      if (items?.length) {
        await tx.feeItem.deleteMany({ where: { feeStructureId: id } })
      }

      const totalAmount = items?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || existing.totalAmount

      return tx.feeStructure.update({
        where: { id },
        data: {
          ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
          ...(typeof isActive === 'boolean' && { isActive }),
          ...(items?.length && { totalAmount }),
          ...(items?.length && {
            items: {
              create: items.map((item: any) => ({
                name: item.name, category: item.category || 'OTHER', amount: item.amount || 0,
                isOptional: item.isOptional || false, isOneTime: item.isOneTime || false, description: item.description,
              })),
            },
          }),
        },
        include: {
          class: { select: { id: true, name: true } },
          term: { select: { id: true, name: true }, include: { academicYear: { select: { name: true } } } },
          items: { orderBy: { category: 'asc' } },
        },
      })
    })

    return NextResponse.json({
      id: feeStructure.id, classId: feeStructure.classId, className: feeStructure.class.name,
      termId: feeStructure.termId, termName: feeStructure.term.name, academicYear: feeStructure.term.academicYear.name,
      studentType: feeStructure.studentType, totalAmount: feeStructure.totalAmount,
      dueDate: feeStructure.dueDate?.toISOString(), isActive: feeStructure.isActive,
      items: feeStructure.items.map(item => ({
        id: item.id, name: item.name, category: item.category, amount: item.amount,
        isOptional: item.isOptional, isOneTime: item.isOneTime, description: item.description,
      })),
    })
  } catch (error) {
    console.error('Error updating fee structure:', error)
    return NextResponse.json({ error: 'Failed to update fee structure' }, { status: 500 })
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role
    const { id } = await params

    // Property 20: Finance Access Control
    // Requirement 11.1: Only ACCOUNTANT, SCHOOL_ADMIN can delete fee structures
    if (!canWriteFinanceData(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'You do not have permission to delete fee structures',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const existing = await prisma.feeStructure.findFirst({
      where: { id, schoolId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Fee structure not found' }, { status: 404 })
    }

    await prisma.feeStructure.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting fee structure:', error)
    return NextResponse.json({ error: 'Failed to delete fee structure' }, { status: 500 })
  }
}
