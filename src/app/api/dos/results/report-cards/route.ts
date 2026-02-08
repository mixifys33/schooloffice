// src/app/api/dos/results/report-cards/route.ts
import { NextRequest } from 'next/server';
import { DosResultsCollectionService } from '@/services/dos-results-collection.service';
import { withAuth } from '@/lib/auth'; // Assuming you have an auth middleware

const service = new DosResultsCollectionService();

// GET: Compile report cards for a term
export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      if (user.role !== 'DOS' && !user.roles.includes('DOS')) {
        return new Response(JSON.stringify({ error: 'Access denied. DoS only.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const url = new URL(req.url);
      const termId = url.searchParams.get('termId');

      if (!termId) {
        return new Response(JSON.stringify({ error: 'Missing termId parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const reportCards = await service.compileReportCards(termId);
      
      return new Response(JSON.stringify(reportCards), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error compiling report cards:', error);
      return new Response(JSON.stringify({ error: 'Failed to compile report cards' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }, ['DOS']);
}

// PUT: Approve report cards
export async function PUT(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      if (user.role !== 'DOS' && !user.roles.includes('DOS')) {
        return new Response(JSON.stringify({ error: 'Access denied. DoS only.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const body = await req.json();
      const { reportCardIds } = body;

      if (!reportCardIds || !Array.isArray(reportCardIds)) {
        return new Response(JSON.stringify({ error: 'Missing or invalid reportCardIds' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const success = await service.approveReportCards(user.id, reportCardIds);

      return new Response(JSON.stringify({ success }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error approving report cards:', error);
      return new Response(JSON.stringify({ error: 'Failed to approve report cards' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }, ['DOS']);
}

// POST: Publish report cards
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
      const { reportCardIds } = body;

      if (!reportCardIds || !Array.isArray(reportCardIds)) {
        return new Response(JSON.stringify({ error: 'Missing or invalid reportCardIds' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const success = await service.publishReportCards(user.id, reportCardIds);

      return new Response(JSON.stringify({ success }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error publishing report cards:', error);
      return new Response(JSON.stringify({ error: 'Failed to publish report cards' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }, ['DOS']);
}