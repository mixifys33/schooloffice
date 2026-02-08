import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.schoolId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phoneNumber, message, templateKey, isTest } = await request.json();

    // Validate inputs
    if (!phoneNumber || !message) {
      return NextResponse.json({ 
        error: 'Phone number and message are required' 
      }, { status: 400 });
    }

    // Validate Uganda phone number format
    const ugandaPattern = /^(\+256|0)(7[0-9]{8}|3[0-9]{8})$/;
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    
    if (!ugandaPattern.test(cleanPhone)) {
      return NextResponse.json({ 
        error: 'Invalid Uganda phone number format' 
      }, { status: 400 });
    }

    // Normalize phone number to international format
    let normalizedPhone = cleanPhone;
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+256' + normalizedPhone.substring(1);
    }

    // Check SMS balance (for demo purposes, we'll allow if balance > 0)
    const school = await prisma.school.findUnique({
      where: { id: session.user.schoolId },
      select: { smsBalance: true, pilotType: true }
    });

    if (!school || school.smsBalance <= 0) {
      return NextResponse.json({ 
        error: 'Insufficient SMS balance. Please top up to send test messages.' 
      }, { status: 400 });
    }

    // Calculate SMS cost
    const smsUnits = Math.ceil(message.length / 160);
    const cost = smsUnits * 45; // UGX 45 per SMS unit

    // For demo purposes, we'll simulate SMS sending
    // In production, you would integrate with actual SMS gateway
    const messageId = `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Simulate SMS gateway call
      const smsResult = await simulateSMSGateway(normalizedPhone, message, messageId);
      
      if (smsResult.success) {
        // Log the SMS in audit trail
        await prisma.sMSAuditLog.create({
          data: {
            schoolId: session.user.schoolId,
            userId: session.user.id,
            templateKey: templateKey || 'TEST',
            recipient: normalizedPhone,
            content: message,
            cost: cost,
            status: 'SENT',
            messageId: messageId,
            isTest: true,
            metadata: {
              userAgent: request.headers.get('user-agent') || '',
              ipAddress: request.headers.get('x-forwarded-for') || 
                         request.headers.get('x-real-ip') || 
                         'unknown'
            }
          }
        });

        // Deduct from SMS balance (for real testing)
        await prisma.school.update({
          where: { id: session.user.schoolId },
          data: {
            smsBalance: {
              decrement: smsUnits
            }
          }
        });

        return NextResponse.json({
          success: true,
          messageId: messageId,
          cost: cost,
          smsUnits: smsUnits,
          deliveryStatus: 'sent'
        });
      } else {
        throw new Error(smsResult.error || 'SMS gateway error');
      }
    } catch (smsError) {
      console.error('SMS sending error:', smsError);
      
      // Log failed attempt
      await prisma.sMSAuditLog.create({
        data: {
          schoolId: session.user.schoolId,
          userId: session.user.id,
          templateKey: templateKey || 'TEST',
          recipient: normalizedPhone,
          content: message,
          cost: 0,
          status: 'FAILED',
          messageId: messageId,
          isTest: true,
          errorMessage: smsError instanceof Error ? smsError.message : 'Unknown error',
          metadata: {
            userAgent: request.headers.get('user-agent') || '',
            ipAddress: request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown'
          }
        }
      });

      return NextResponse.json({ 
        error: 'Failed to send SMS. Please try again or contact support.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in SMS test send:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Simulate SMS gateway for demo purposes
// In production, replace this with actual SMS gateway integration
async function simulateSMSGateway(phoneNumber: string, message: string, messageId: string) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Simulate 95% success rate
  const success = Math.random() > 0.05;
  
  if (success) {
    // In production, you would make actual API call to SMS gateway here
    // For demo, we'll just log and return success
    console.log(`[SMS DEMO] Sending to ${phoneNumber}: ${message}`);
    console.log(`[SMS DEMO] Message ID: ${messageId}`);
    
    return {
      success: true,
      messageId: messageId,
      gatewayResponse: 'Message queued for delivery'
    };
  } else {
    return {
      success: false,
      error: 'Gateway temporarily unavailable'
    };
  }
}

// Delivery status check endpoint
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

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
      cost: smsLog.cost
    });

  } catch (error) {
    console.error('Error checking delivery status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}