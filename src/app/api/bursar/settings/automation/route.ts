import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { Role, StaffRole } from "@/types/enums"

export async function GET(req: Request) {
    const session = await auth()
    if (!session?.user?.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    // Check permission (Bursar or School Admin or Accountant)
    const isAuthorized =
        session.user.role === Role.SCHOOL_ADMIN ||
        session.user.activeRole === Role.SCHOOL_ADMIN ||
        session.user.role === Role.ACCOUNTANT ||
        session.user.activeRole === StaffRole.BURSAR;

    if (!isAuthorized) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    let settings = await prisma.financeSettings.findUnique({
        where: { schoolId: session.user.schoolId }
    })

    if (!settings) {
        // Create defaults if missing to avoid null errors in UI
        settings = await prisma.financeSettings.create({
            data: { schoolId: session.user.schoolId }
        })
    }

    return NextResponse.json(settings)
}

export async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.schoolId) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    // Check permission
    const isAuthorized =
        session.user.role === Role.SCHOOL_ADMIN ||
        session.user.activeRole === Role.SCHOOL_ADMIN ||
        session.user.role === Role.ACCOUNTANT ||
        session.user.activeRole === StaffRole.BURSAR;

    if (!isAuthorized) {
        return new NextResponse('Forbidden', { status: 403 })
    }

    try {
        const body = await req.json()
        const {
            enableAutomatedReminders,
            automationFrequency,
            automationDayOfWeek,
            gracePeriodDays,
            maxRemindersPerMilestone,
            paymentMilestones
        } = body

        // Optional: Validation check for milestones total or structure

        const updated = await prisma.financeSettings.upsert({
            where: { schoolId: session.user.schoolId },
            create: {
                schoolId: session.user.schoolId,
                enableAutomatedReminders,
                automationFrequency,
                automationDayOfWeek,
                gracePeriodDays,
                maxRemindersPerMilestone,
                paymentMilestones
            },
            update: {
                enableAutomatedReminders,
                automationFrequency,
                automationDayOfWeek,
                gracePeriodDays,
                maxRemindersPerMilestone,
                paymentMilestones
            }
        })

        return NextResponse.json(updated)
    } catch (error) {
        console.error('Settings update failed:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
