/**
 * Enhanced Bursar Automation Preview API
 * Provides a preview of what automation would send without actually sending messages
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const termId = searchParams.get('termId')

    if (!termId) {
      return NextResponse.json({ error: 'Term ID is required' }, { status: 400 })
    }

    // Import the service function
    const { enhancedBursarService } = await import('@/services/enhanced-bursar.service')
    
    // Call the preview function
    const result = await enhancedBursarService.previewAutomatedFeeReminders(
      session.user.schoolId,
      termId
    )

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Error in automation preview:', error)
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    )
  }
}