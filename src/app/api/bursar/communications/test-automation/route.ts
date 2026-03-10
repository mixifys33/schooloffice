import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendSMS, formatPhoneNumber } from '@/services/sms.service';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    // Get automation settings
    const settings = await prisma.feeReminderAutomation.findUnique({
      where: { schoolId: session.user.schoolId }
    });

    if (!settings) {
      return NextResponse.json(
        { error: 'Automation settings not configured', success: false },
        { status: 400 }
      );
    }

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId: session.user.schoolId,
          isActive: true
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    if (!currentTerm) {
      return NextResponse.json(
        { error: 'No active term found', success: false },
        { status: 400 }
      );
    }

    // Get all student accounts with outstanding balances above the minimum
    const studentAccounts = await prisma.studentAccount.findMany({
      where: {
        schoolId: session.user.schoolId,
        termId: currentTerm.id,
        balance: {
          gte: settings.minBalance
        }
      },
      include: {
        student: {
          include: {
            class: true,
            studentGuardians: {
              where: { isPrimary: true },
              include: { guardian: true }
            }
          }
        }
      }
    });

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process each student account
    for (const account of studentAccounts) {
      try {
        const student = account.student;
        
        if (student.studentGuardians.length === 0) {
          failed++;
          errors.push(`No guardian found for ${student.firstName} ${student.lastName}`);
          continue;
        }

        const guardian = student.studentGuardians[0].guardian;

        // Build reminder message - Short and cost-effective
        const message = `${student.firstName} ${student.lastName} (${student.class.name}) has outstanding fees of UGX ${account.balance.toLocaleString('en-US')}. Please pay now. Thank you.`;

        // Send SMS
        const phoneNumber = formatPhoneNumber(guardian.phone);
        const smsResult = await sendSMS(phoneNumber, message);

        // Log the notification
        await prisma.financeNotificationLog.create({
          data: {
            schoolId: session.user.schoolId,
            guardianId: guardian.id,
            studentId: student.id,
            type: 'FEE_REMINDER',
            channel: 'SMS',
            content: message,
            status: smsResult.success ? 'SENT' : 'FAILED',
            sentAt: smsResult.success ? new Date() : null,
            error: smsResult.error,
            metadata: JSON.stringify({
              balance: account.balance,
              totalFees: account.totalFees,
              totalPaid: account.totalPaid,
              sentBy: 'AUTOMATION_TEST',
              automationId: settings.id,
              messageId: smsResult.messageId,
              cost: smsResult.cost
            })
          }
        });

        if (smsResult.success) {
          sent++;
        } else {
          failed++;
          errors.push(`Failed for ${student.firstName} ${student.lastName}: ${smsResult.error}`);
        }
      } catch (error) {
        failed++;
        errors.push(`Failed for student ${account.studentId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Error processing student ${account.studentId}:`, error);
      }
    }

    // Update last run time
    await prisma.feeReminderAutomation.update({
      where: { id: settings.id },
      data: { lastRun: new Date() }
    });

    return NextResponse.json({
      success: true,
      sent,
      failed,
      totalRecipients: studentAccounts.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error running automation test:', error);
    return NextResponse.json(
      { error: 'Failed to run automation test', success: false },
      { status: 500 }
    );
  }
}
