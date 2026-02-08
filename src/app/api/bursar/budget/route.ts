import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { BursarService } from '@/services/bursar.service'
import { z } from 'zod'

const createBudgetCategorySchema = z.object({
  name: z.string().min(1, 'Budget category name is required'),
  description: z.string().optional(),
  budgetedAmount: z.number().positive('Budgeted amount must be positive'),
  department: z.string().min(1, 'Department is required'),
  period: z.enum(['MONTHLY', 'TERMLY', 'ANNUALLY']),
  startDate: z.string(),
  endDate: z.string(),
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
    const department = searchParams.get('department')
    const period = searchParams.get('period')

    const filters: any = {
      schoolId: session.user.schoolId,
    }

    if (department) filters.department = department
    if (period) filters.period = period

    const result = await BursarService.listBudgetCategories(filters, page, limit)

    return NextResponse.json(result)
  } catch (error) {
    console.error('List budget categories error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget categories' },
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
    const validatedData = createBudgetCategorySchema.parse(body)

    // Create budget category
    const result = await BursarService.createBudgetCategory({
      ...validatedData,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
      schoolId: session.user.schoolId,
      createdBy: session.user.id,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Create budget category error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create budget category' },
      { status: 500 }
    )
  }
}