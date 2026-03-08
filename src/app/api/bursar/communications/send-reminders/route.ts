import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendSMS, formatPhoneNumber } from '@/services/sms.service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const body = await request.json();
    const { defaulters, message } = body;

    if (!defaulters || defaulters.length === 0) {
      return NextResponse.json(
        { error: 'No defaulters selected', success: false },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required', success: false },
        { status: 400 }
      );
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process each defaulter
    for (const defaulter of defaulters) {
      try {
        // Get student and guardian information
        const student = await prisma.student.findUnique({
          where: { id: defaulter.id },
          include: {
            studentGuardians: {
              where: { isPrimary: true },
              include: { guardian: true }
            }
          }
        });

        if (!student || student.studentGuardians.length === 0) {
          failed++;
          errors.push(`No guardian found for ${defaulter.studentName}`);
          continue;
        }

        const guardian = student.studentGuardians[0].guardian;

        // Replace message variables
        let personalizedMessage = message
          .replace(/{guardianName}/g, `${guardian.firstName} ${guardian.lastName}`)
          .replace(/{studentName}/g, defaulter.studentName)
          .replace(/{className}/g, defaulter.className)
          .replace(/{balance}/g, defaulter.outstandingAmount.toLocaleString())
          .replace(/{daysPastDue}/g, defaulter.daysPastDue.toString());

        // Send SMS
        const phoneNumber = formatPhoneNumber(guardian.phone);
        const smsResult = await sendSMS(phoneNumber, personalizedMessage);

        // Create notification log
        await prisma.financeNotificationLog.create({
          data: {
            schoolId: session.user.schoolId,
            guardianId: guardian.id,
            studentId: student.id,
            type: 'FEE_REMINDER',
            channel: 'SMS',
            content: personalizedMessage,
            status: smsResult.success ? 'SENT' : 'FAILED',
            sentAt: smsResult.success ? new Date() : null,
            error: smsResult.error,
            metadata: JSON.stringify({
              balance: defaulter.outstandingAmount,
              daysPastDue: defaulter.daysPastDue,
              sentBy: session.user.id,
              sentManually: true,
              messageId: smsResult.messageId,
              cost: smsResult.cost
            })
          }
        });

        if (smsResult.success) {
          sent++;
        } else {
          failed++;
          errors.push(`Failed to send to ${defaulter.studentName}: ${smsResult.error}`);
        }
      } catch (error) {
        failed++;
        errors.push(`Failed to send to ${defaulter.studentName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Error sending reminder to ${defaulter.studentName}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: defaulters.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error sending reminders:', error);
    return NextResponse.json(
      { error: 'Failed to send reminders', success: false },
      { status: 500 }
    );
  }
}
