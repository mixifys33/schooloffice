import { NextRequest, NextResponse } from 'next/server'
import { staffOnboardingService } from '@/services/staff-onboarding.service'

/**
 * Test endpoint for staff onboarding functionality
 * This is a temporary endpoint for testing purposes
 */
export async function GET(request: NextRequest) {
  try {
    // Test the required staff roles
    const requiredRoles = staffOnboardingService.getRequiredStaffRoles()
    
    return NextResponse.json({
      success: true,
      requiredRoles,
      message: 'Staff onboarding service is working correctly',
    })
  } catch (error) {
    console.error('Error testing onboarding service:', error)
    return NextResponse.json(
      { error: 'Failed to test onboarding service' },
      { status: 500 }
    )
  }
}