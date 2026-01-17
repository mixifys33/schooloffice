/**
 * ImageKit Authentication API
 * 
 * Provides authentication parameters for secure client-side uploads.
 * This endpoint should be called before each upload to get fresh tokens.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { imagekitService } from '@/lib/imagekit'

export async function GET() {
  try {
    // Verify user is authenticated
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if ImageKit is configured
    if (!imagekitService.isConfigured()) {
      return NextResponse.json(
        { error: 'ImageKit is not configured' },
        { status: 503 }
      )
    }

    // Get authentication parameters
    const authParams = imagekitService.getAuthenticationParameters()

    return NextResponse.json(authParams)
  } catch (error) {
    console.error('ImageKit auth error:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication parameters' },
      { status: 500 }
    )
  }
}
