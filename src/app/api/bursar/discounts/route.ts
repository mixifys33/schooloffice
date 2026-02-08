import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { DiscountService } from '@/services/discount.service'
import { z } from 'zod'

const createDiscountRuleSchema = z.object({
  name: z.string().min(1, 'Discount name is required'),
  description: z.string().optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  value: z.number().positive('Discount value must be positive'),
  maxAmount: z.number().positive().optional(),
  eligibilityCriteria: z.string().min(1, 'Eligibility criteria is required'),
  maxStudents: z.number().positive().optional(),
  validFrom: z.string(),
  validTo: z.string(),
  isActive: z.boolean().default(true),
})

const applyDiscountSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  discountRuleId: z.string().min(1, 'Discount rule ID is required'),
  termId: z.string().min(1, 'Term ID is required'),
  reason: z.string().optional(),
  customAmount: z.number().positive().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'rules' or 'applied'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const studentId = searchParams.get('studentId')
    const termId = searchParams.get('termId')
    const status = searchParams.get('status')

    if (type === 'applied') {
      // Get applied discounts
      const filters: any = { schoolId: session.user.schoolId }
      if (studentId) filters.studentId = studentId
      if (termId) filters.termId = termId
      if (status) filters.status = status

      const result = await DiscountService.listAppliedDiscounts(filters, page, limit)
      return NextResponse.json(result)
    }

    // Get discount rules (default)
    const result = await DiscountService.listDiscountRules(session.user.schoolId, page, limit)
    return NextResponse.json(result)
  } catch (error) {
    console.error('List discounts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch discounts' },
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
    const { action } = body

    if (action === 'create-rule') {
      // Create discount rule
      const validatedData = createDiscountRuleSchema.parse(body)
      
      const result = await DiscountService.createDiscountRule({
        ...validatedData,
        schoolId: session.user.schoolId,
        validFrom: new Date(validatedData.validFrom),
        validTo: new Date(validatedData.validTo),
        createdBy: session.user.id,
      })

      return NextResponse.json(result, { status: 201 })
    }

    if (action === 'apply') {
      // Apply discount to student
      const validatedData = applyDiscountSchema.parse(body)
      
      const result = await DiscountService.applyDiscount({
        ...validatedData,
        appliedBy: session.user.id,
      })

      return NextResponse.json(result, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Discount action error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process discount action' },
      { status: 500 }
    )
  }
}