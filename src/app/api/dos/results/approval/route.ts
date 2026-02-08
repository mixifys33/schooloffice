// src/app/api/dos/results/approval/route.ts
import { NextRequest } from 'next/server';
import { DosResultsCollectionService } from '@/services/dos-results-collection.service';
import { withAuth } from '@/lib/auth'; // Assuming you have an auth middleware

const service = new DosResultsCollectionService();

// POST: Approve subject results
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
      const { classId, subjectId, caApproved, examApproved, lockSubject } = body;

      if (!classId || !subjectId || caApproved === undefined || examApproved === undefined || lockSubject === undefined) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const approval = await service.approveSubjectResults(
        user.id,
        classId,
        subjectId,
        caApproved,
        examApproved,
        lockSubject
      );

      return new Response(JSON.stringify(approval), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error approving subject results:', error);
      return new Response(JSON.stringify({ error: 'Failed to approve subject results' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }, ['DOS']);
}