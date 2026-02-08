/**
 * DOS Test API Route
 * Simple test endpoint to verify DOS API is working
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(_request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ 
      message: 'DOS API is working',
      user: session.user.email,
      timestamp: new Date().toISOString()
    })
  } catch (error: unknown) {
    console.error('Error in DOS test API:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}