// src/app/api/dos/results/submissions/route.ts
import { NextRequest } from 'next/server';
import { DosResultsCollectionService } from '@/services/dos-results-collection.service';
import { withAuth } from '@/lib/auth'; // Assuming you have an auth middleware

const service = new DosResultsCollectionService();

// GET: Get teacher submissions for DoS inbox
export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      if (user.role !== 'DOS' && !user.roles.includes('DOS')) {
        return new Response(JSON.stringify({ error: 'Access denied. DoS only.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const inboxItems = await service.getResultsInbox(user.id);
      
      return new Response(JSON.stringify(inboxItems), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error getting results inbox:', error);
      return new Response(JSON.stringify({ error: 'Failed to get results inbox' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }, ['DOS']);
}

// POST: Submit teacher results
export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      if (user.role !== 'TEACHER' && !user.roles.includes('TEACHER')) {
        return new Response(JSON.stringify({ error: 'Access denied. Teacher only.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const body = await req.json();
      const { classId, subjectId, assessmentType, scores } = body;

      if (!classId || !subjectId || !assessmentType || !scores) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const success = await service.submitTeacherResults(
        user.id,
        classId,
        subjectId,
        assessmentType,
        scores
      );

      return new Response(JSON.stringify({ success }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error submitting teacher results:', error);
      return new Response(JSON.stringify({ error: 'Failed to submit results' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }, ['TEACHER']);
}