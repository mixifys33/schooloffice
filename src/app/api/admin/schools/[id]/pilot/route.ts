/**
 * Super Admin Pilot Extension API Route
 * Requirement: 13.4 - Extend pilot end date
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/admin/schools/[id]/pilot
 * Extend pilot end date
 * Requirement: 13.4
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { extensionDays, newEndDate } = body

    // Get current school
    const currentSchool = await prisma.school.findUnique({
      where: { id }
    })

    if (!currentSchool) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 })
    }

    // For pilot extension, we'll store the pilot end date in the features JSON
    // or create a separate pilot tracking mechanism
    const currentFeatures = currentSchool.features as Record<string, unknown>
    
    let pilotEndDate: Date
    if (newEndDate) {
      pilotEndDate = new Date(newEndDate)
    } else if (extensionDays) {
      const currentEndDate = currentFeatures.pilotEndDate 
        ? new Date(currentFeatures.pilotEndDate as string)
        : new Date()
      pilotEndDate = new Date(currentEndDate)
      pilotEndDate.setDate(pilotEndDate.getDate() + extensionDays)
    } else {
      return NextResponse.json({ error: 'Either extensionDays or newEndDate is required' }, { status: 400 })
    }

    // Update school with new pilot end date
    const updatedSchool = await prisma.school.update({
      where: { id },
      data: {
        features: {
          ...currentFeatures,
          pilotEndDate: pilotEndDate.toISOString()
        }
      }
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        schoolId: id,
        userId: session.user.id,
        action: 'EXTEND_PILOT',
        resource: 'School',
        resourceId: id,
        previousValue: { pilotEndDate: currentFeatures.pilotEndDate },
        newValue: { pilotEndDate: pilotEndDate.toISOString() }
      }
    })

    return NextResponse.json({ 
      school: updatedSchool, 
      pilotEndDate: pilotEndDate.toISOString(),
      success: true 
    })
  } catch (error) {
    console.error('Error extending pilot:', error)
    return NextResponse.json(
      { error: 'Failed to extend pilot period' },
      { status: 500 }
    )
  }
}
