/**
 * Grading Settings API Route
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 * - GET: Get grading settings (grading scale, pass marks, exam weights, ranking rules)
 * - PUT: Update grading settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { schoolSettingsService, GradingSettings } from '@/services/school-settings.service'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    const settings = await schoolSettingsService.getSettings<GradingSettings>(
      schoolId,
      'grading'
    )

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching grading settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch grading settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userId = session.user.id
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    
    // Validate grading scale type - Requirement 15.1
    if (body.gradingScaleType && !['LETTER', 'PERCENTAGE', 'POINTS'].includes(body.gradingScaleType)) {
      return NextResponse.json(
        { error: 'Invalid grading scale type. Must be LETTER, PERCENTAGE, or POINTS' },
        { status: 400 }
      )
    }

    // Validate pass mark percentage - Requirement 15.2
    if (body.passMarkPercentage !== undefined) {
      if (body.passMarkPercentage < 0 || body.passMarkPercentage > 100) {
        return NextResponse.json(
          { error: 'Pass mark percentage must be between 0 and 100' },
          { status: 400 }
        )
      }
    }

    // Validate exam weights - Requirement 15.3
    if (body.examWeights !== undefined) {
      if (!Array.isArray(body.examWeights)) {
        return NextResponse.json(
          { error: 'Exam weights must be an array' },
          { status: 400 }
        )
      }
      
      // Validate each weight entry
      for (const weight of body.examWeights) {
        if (!weight.type || typeof weight.weight !== 'number') {
          return NextResponse.json(
            { error: 'Each exam weight must have a type and numeric weight' },
            { status: 400 }
          )
        }
        if (weight.weight < 0 || weight.weight > 100) {
          return NextResponse.json(
            { error: 'Exam weight must be between 0 and 100' },
            { status: 400 }
          )
        }
      }

      // Validate total weights sum to 100
      const totalWeight = body.examWeights.reduce((sum: number, w: { weight: number }) => sum + w.weight, 0)
      if (totalWeight !== 100) {
        return NextResponse.json(
          { error: `Exam weights must sum to 100 (currently ${totalWeight})` },
          { status: 400 }
        )
      }
    }

    // Validate term contribution rules - Requirement 15.4
    if (body.termContributionRules !== undefined) {
      if (!Array.isArray(body.termContributionRules)) {
        return NextResponse.json(
          { error: 'Term contribution rules must be an array' },
          { status: 400 }
        )
      }
      
      for (const rule of body.termContributionRules) {
        if (typeof rule.term !== 'number' || typeof rule.weight !== 'number') {
          return NextResponse.json(
            { error: 'Each term contribution rule must have a term number and numeric weight' },
            { status: 400 }
          )
        }
        if (rule.weight < 0 || rule.weight > 100) {
          return NextResponse.json(
            { error: 'Term contribution weight must be between 0 and 100' },
            { status: 400 }
          )
        }
      }
    }

    const settings = await schoolSettingsService.updateSettings<GradingSettings>(
      schoolId,
      'grading',
      body,
      userId
    )

    return NextResponse.json({
      success: true,
      message: 'Grading settings updated successfully',
      settings,
    })
  } catch (error) {
    console.error('Error updating grading settings:', error)
    return NextResponse.json(
      { error: 'Failed to update grading settings' },
      { status: 500 }
    )
  }
}
