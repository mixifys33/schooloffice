// src/app/api/dos/results/dashboard/route.ts
import { NextRequest } from 'next/server';
import { DosResultsCollectionService } from '@/services/dos-results-collection.service';
import { withAuth } from '@/lib/auth'; // Assuming you have an auth middleware

const service = new DosResultsCollectionService();

// GET: Get DoS dashboard stats
export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      if (user.role !== 'DOS' && !user.roles.includes('DOS')) {
        return new Response(JSON.stringify({ error: 'Access denied. DoS only.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const stats = await service.getDashboardStats(user.id);
      
      return new Response(JSON.stringify(stats), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return new Response(JSON.stringify({ error: 'Failed to get dashboard stats' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }, ['DOS']);
}