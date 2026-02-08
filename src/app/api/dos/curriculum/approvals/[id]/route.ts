import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * DoS Curriculum Approval Actions API
 * 
 * Handle individual approval actions (approve, reject, request revision).
 */

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Verify DoS role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        staff: true
      }
    })

    // Check if user has DoS role
    const isDos = user?.roles?.includes('DOS') || user?.role === 'DOS'

    if (!isDos) {
      return NextResponse.json({ message: 'Access denied. DoS role required.' }, { status: 403 })
    }

    const { action, notes } = await request.json()
    const approvalId = params.id

    if (!action || !['approve', 'reject', 'request_revision'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
    }

    // In a real implementation, you would update the approval record in the database
    // For now, we'll just return a success response
    
    const statusMap = {
      approve: 'approved',
      reject: 'rejected',
      request_revision: 'needs_revision'
    }

    // Mock update - in real implementation, update the database
    console.log(`Approval ${approvalId} ${action}ed by DoS ${user.name}`)
    if (notes) {
      console.log(`Review notes: ${notes}`)
    }

    return NextResponse.json({
      message: `Approval ${action}ed successfully`,
      approvalId,
      newStatus: statusMap[action as keyof typeof statusMap],
      reviewedBy: user.name,
      reviewedAt: new Date().toISOString(),
      notes
    })

  } catch (error) {
    console.error('Error updating approval:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}