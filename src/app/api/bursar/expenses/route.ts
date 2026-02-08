import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { BursarService } from '@/services/bursar.service'
import { z } from 'zod'

const createExpenseSchema = z.object({
  budgetCategoryId: z.string().min(1, 'Budget category is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().positive('Amount must be positive'),
  expenseDate: z.string(),
  vendor: z.string().optional(),
  receiptNumber: z.string().optional(),
  receiptUrl: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CHEQUE', 'CARD']),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const budgetCategoryId = searchParams.get('budgetCategoryId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const paymentMethod = searchParams.get('paymentMethod')

    const filters: any = {
      schoolId: session.user.schoolId,
    }

    if (budgetCategoryId) filters.budgetCategoryId = budgetCategoryId
    if (startDate) filters.startDate = new Date(startDate)
    if (endDate) filters.endDate = new Date(endDate)
    if (paymentMethod) filters.paymentMethod = paymentMethod

    const result = await BursarService.listExpenses(filters, page, limit)

    return NextResponse.json(result)
  } catch (error) {
    console.error('List expenses error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.schoolId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate input
    const validatedData = createExpenseSchema.parse(body)

    // Record expense
    const result = await BursarService.recordExpense({
      ...validatedData,
      expenseDate: new Date(validatedData.expenseDate),
      schoolId: session.user.schoolId,
      recordedBy: session.user.id,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Record expense error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to record expense' },
      { status: 500 }
    )
  }
}