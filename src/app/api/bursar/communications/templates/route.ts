import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, return mock templates until MessageTemplate model is added
    const templates = [
      {
        id: '1',
        name: 'Standard Payment Reminder',
        category: 'reminder',
        type: 'PAYMENT_REMINDER',
        channel: 'BOTH',
        subject: 'Payment Reminder',
        message: 'Dear {parentName}, this is a reminder that {studentName} has an outstanding fee balance of {balance}. Please settle this amount at your earliest convenience.',
        variables: ['parentName', 'studentName', 'balance'],
        isActive: true
      },
      {
        id: '2',
        name: 'Urgent Payment Reminder',
        category: 'reminder',
        type: 'PAYMENT_REMINDER',
        channel: 'BOTH',
        subject: 'Urgent: Payment Overdue',
        message: 'URGENT: Dear {parentName}, {studentName} has an overdue balance of {balance}. Immediate payment is required.',
        variables: ['parentName', 'studentName', 'balance'],
        isActive: true
      }
    ]

    return NextResponse.json({
      success: true,
      templates
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Will create template once MessageTemplate model is added
    // const template = await prisma.messageTemplate.create({ ... })

    return NextResponse.json({
      success: true,
      message: 'Template created successfully'
    })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
