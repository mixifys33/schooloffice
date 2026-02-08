/**
 * DoS Report Card Publication API Route
 * 
 * Handles DoS publication of report cards (removes watermark, makes accessible).
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { DoSReportCardService } from '@/services/dos/dos-report-card.service';

const reportCardService = new DoSReportCardService();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and validate authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate DoS role
    if (session.user.role !== 'DOS' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { removeWatermark = true } = body;

    // Publish report card
    const reportCardId = params.id;
    const published = await reportCardService.publishReportCard({
      reportCardId,
      publishedBy: session.user.id,
      removeWatermark
    });

    return NextResponse.json({
      success: true,
      reportCard: published,
      message: 'Report card published successfully'
    });

  } catch (error) {
    console.error('Report Card Publication API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to publish report card',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}