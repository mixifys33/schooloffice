import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { financeNotificationService } from "@/services/finance-notification.service"
import { Role, StaffRole } from "@/types/enums"

export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    // Strict permission check - Admin or Bursar only
    const isAuthorized =
        session.user.role === Role.SCHOOL_ADMIN ||
        session.user.activeRole === Role.SCHOOL_ADMIN ||
        session.user.activeRole === StaffRole.BURSAR;

    if (!isAuthorized) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    try {
        const result = await financeNotificationService.runAutomatedFeeReminders(session.user.schoolId)
        return NextResponse.json(result)
    } catch (error) {
        console.error('Manual automation run failed:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
