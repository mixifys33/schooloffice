import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const messageId = params.messageId;

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Find the SMS log entry
    const smsLog = await prisma.sMSAuditLog.findFirst({
      where: {
        messageId: messageId,
        schoolId: session.user.schoolId
      }
    });

    if (!smsLog) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // For demo purposes, simulate delivery status progression
    const now = new Date();
    const sentTime = smsLog.createdAt;
    const timeDiff = now.getTime() - sentTime.getTime();
    
    let status = smsLog.status.toLowerCase();
    
    // Simulate status progression: sent -> delivered (after 5 seconds)
    if (status === 'sent' && timeDiff > 5000) {
      // 90% delivery success rate for demo
      status = Math.random() > 0.1 ? 'delivered' : 'failed';
      
      // Update the log entry
      await prisma.sMSAuditLog.update({
        where: { id: smsLog.id },
        data: { 
          status: status.toUpperCase() as any,
          deliveredAt: status === 'delivered' ? now : null
        }
      });
    }

    return NextResponse.json({
      messageId: messageId,
      status: status,
      sentAt: smsLog.createdAt.toISOString(),
      deliveredAt: smsLog.deliveredAt?.toISOString() || null,
      cost: smsLog.cost,
      recipient: smsLog.recipient
    });

  } catch (error) {
    console.error('Error checking delivery status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}