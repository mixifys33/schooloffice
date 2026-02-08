/**
 * Unread Notifications Count API Route
 * Returns the count of unread notifications and support requests for the current user
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(_request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, return a simple count of 0 to avoid database issues
    // This can be enhanced later when the database is properly set up
    const totalCount = 0

    // TODO: Implement notification counting when database is ready
    // Count unread system notifications (if notification system exists)
    // This would be implemented when the full notification system is in place
    
    // TODO: For admins, count pending support requests
    // const userRole = session.user.role as Role
    // if ([Role.SCHOOL_ADMIN, Role.SUPER_ADMIN].includes(userRole)) {
    //   try {
    //     const where: any = { status: 'PENDING' }
    //     
    //     // For school admins, only count requests for their school
    //     if (userRole === Role.SCHOOL_ADMIN && session.user.schoolId) {
    //       where.schoolId = session.user.schoolId
    //     }
    //
    //     const pendingSupportRequests = await prisma.supportRequest.count({ where })
    //     totalCount += pendingSupportRequests
    //   } catch (dbError: any) {
    //     console.warn('Could not fetch support request count:', dbError?.message || dbError)
    //   }
    // }

    return NextResponse.json({ count: totalCount })
  } catch (error: unknown) {
    console.error('Error in notifications API:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'Failed to fetch unread count' },
      { status: 500 }
    )
  }
}