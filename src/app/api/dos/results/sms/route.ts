// src/app/api/dos/results/sms/route.ts
import { NextRequest } from 'next/server';
import { DosResultsCollectionService } from '@/services/dos-results-collection.service';
import { withAuth } from '@/lib/auth'; // Assuming you have an auth middleware

const service = new DosResultsCollectionService();

// POST: Send SMS with report card links
export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      if (user.role !== 'DOS' && !user.roles.includes('DOS')) {
        return new Response(JSON.stringify({ error: 'Access denied. DoS only.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const body = await req.json();
      const { classId, studentIds, smsMode, customComment, previewOnly } = body;

      if (!smsMode) {
        return new Response(JSON.stringify({ error: 'Missing smsMode parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const request = {
        classId,
        studentIds: studentIds || [],
        smsMode,
        customComment,
        previewOnly: !!previewOnly
      };

      const result = await service.sendSms(request, user.id);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error sending SMS:', error);
      return new Response(JSON.stringify({ error: 'Failed to send SMS' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }, ['DOS']);
}