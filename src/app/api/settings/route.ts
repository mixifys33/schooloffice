/**
 * School Settings API Route
 * Requirements: 10.1, 10.2, 10.3, 10.4
 * - GET: Get school settings
 * - PUT: Update school settings (term dates, fees, SMS sender name, logo)
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export interface SchoolSettings {
  // School info
  id: string
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
  logo?: string
  smsSenderName?: string
  
  // Current term info
  currentTerm?: {
    id: string
    name: string
    startDate: string
    endDate: string
  }
  
  // Fee amounts per class
  feeStructures: {
    classId: string
    className: string
    termId: string
    totalAmount: number
  }[]
  
  // Subscription info (read-only)
  subscription: {
    licenseType: string
    isActive: boolean
    smsBudgetPerTerm: number
    renewalDate?: string
  }
}

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

    // Get school data
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    // Get current term
    const today = new Date()
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isActive: true,
        },
        startDate: { lte: today },
        endDate: { gte: today },
      },
    })

    // Get fee structures with class names
    const feeStructures = await prisma.feeStructure.findMany({
      where: { schoolId },
      include: {
        class: {
          select: { id: true, name: true },
        },
      },
      orderBy: { class: { level: 'asc' } },
    })

    const settings: SchoolSettings = {
      id: school.id,
      name: school.name,
      code: school.code,
      address: school.address ?? undefined,
      phone: school.phone ?? undefined,
      email: school.email ?? undefined,
      logo: school.logo ?? undefined,
      smsSenderName: school.name.substring(0, 11), // SMS sender name defaults to school name (max 11 chars)
      currentTerm: currentTerm ? {
        id: currentTerm.id,
        name: currentTerm.name,
        startDate: currentTerm.startDate.toISOString(),
        endDate: currentTerm.endDate.toISOString(),
      } : undefined,
      feeStructures: feeStructures.map(fs => ({
        classId: fs.classId,
        className: fs.class.name,
        termId: fs.termId,
        totalAmount: fs.totalAmount,
      })),
      subscription: {
        licenseType: school.licenseType,
        isActive: school.isActive,
        smsBudgetPerTerm: school.smsBudgetPerTerm,
        renewalDate: undefined, // Would come from subscription service
      },
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
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
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { 
      name, 
      address, 
      phone, 
      email, 
      logo, 
      smsSenderName,
      termDates,
      feeAmounts,
    } = body

    // Update school basic info
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (address !== undefined) updateData.address = address
    if (phone !== undefined) updateData.phone = phone
    if (email !== undefined) updateData.email = email
    if (logo !== undefined) updateData.logo = logo

    // Update school if there are changes
    if (Object.keys(updateData).length > 0) {
      await prisma.school.update({
        where: { id: schoolId },
        data: updateData,
      })
    }

    // Update term dates if provided
    if (termDates && termDates.termId) {
      const startDate = new Date(termDates.startDate)
      const endDate = new Date(termDates.endDate)

      // Validate: end date must be after start date (Requirement 10.2)
      if (endDate <= startDate) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        )
      }

      await prisma.term.update({
        where: { id: termDates.termId },
        data: {
          startDate,
          endDate,
        },
      })
    }

    // Update fee amounts if provided
    if (feeAmounts && Array.isArray(feeAmounts)) {
      for (const fee of feeAmounts) {
        if (fee.classId && fee.termId && fee.totalAmount !== undefined) {
          await prisma.feeStructure.upsert({
            where: {
              schoolId_classId_termId: {
                schoolId,
                classId: fee.classId,
                termId: fee.termId,
              },
            },
            update: {
              totalAmount: fee.totalAmount,
            },
            create: {
              schoolId,
              classId: fee.classId,
              termId: fee.termId,
              totalAmount: fee.totalAmount,
            },
          })
        }
      }
    }

    // Return updated settings
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Settings updated successfully',
      school,
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
