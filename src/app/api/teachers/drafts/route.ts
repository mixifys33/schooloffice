/**
 * Teacher Drafts API Route
 * Requirement: 9.2
 * 
 * Implements draft management for incomplete teacher records:
 * - GET: List drafts for the current user
 * - POST: Create a new draft
 * - PUT: Update an existing draft
 * - DELETE: Remove a draft
 * 
 * Core principle: Drafts allow saving incomplete teacher forms
 * for later completion.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'
import { canManageTeachers, createTeacherManagementAuditEntry } from '@/lib/rbac'

/**
 * GET: List drafts for the current user
 * Requirement 9.2: Save draft functionality
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as string
    const userId = session.user.id as string

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Check authorization using RBAC
    if (!canManageTeachers(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have access to teacher management' },
        { status: 403 }
      )
    }

    // Get drafts created by this user
    const drafts = await prisma.teacherDraft.findMany({
      where: {
        schoolId,
        createdBy: userId,
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      drafts: drafts.map(draft => ({
        id: draft.id,
        data: draft.data,
        currentStep: draft.currentStep,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      })),
      count: drafts.length,
    })
  } catch (error) {
    console.error('Error fetching teacher drafts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    )
  }
}


/**
 * POST: Create a new draft
 * Requirement 9.2: Save draft functionality
 * 
 * Request body:
 * {
 *   data: Partial<CreateTeacherInput>,
 *   currentStep: number (1-5)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as string
    const userId = session.user.id as string

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Check authorization using RBAC
    if (!canManageTeachers(userRole)) {
      const auditEntry = createTeacherManagementAuditEntry({
        schoolId,
        userId,
        role: userRole,
        attemptedAction: 'create_teacher_draft',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to create teacher drafts' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { data, currentStep } = body

    // Validate currentStep
    const step = typeof currentStep === 'number' && currentStep >= 1 && currentStep <= 5 
      ? currentStep 
      : 1

    // Create draft
    const draft = await prisma.teacherDraft.create({
      data: {
        schoolId,
        data: data || {},
        currentStep: step,
        createdBy: userId,
      },
    })

    return NextResponse.json({
      id: draft.id,
      data: draft.data,
      currentStep: draft.currentStep,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      message: 'Draft created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating teacher draft:', error)
    return NextResponse.json(
      { error: 'Failed to create draft' },
      { status: 500 }
    )
  }
}

/**
 * PUT: Update an existing draft
 * Requirement 9.2: Save draft functionality
 * 
 * Request body:
 * {
 *   id: string,
 *   data: Partial<CreateTeacherInput>,
 *   currentStep?: number (1-5)
 * }
 */
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
    const userRole = session.user.role as string
    const userId = session.user.id as string

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Check authorization using RBAC
    if (!canManageTeachers(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to update teacher drafts' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, data, currentStep } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Draft ID is required', field: 'id' },
        { status: 400 }
      )
    }

    // Verify draft exists and belongs to user
    const existingDraft = await prisma.teacherDraft.findFirst({
      where: {
        id,
        schoolId,
        createdBy: userId,
      },
    })

    if (!existingDraft) {
      return NextResponse.json(
        { error: 'Draft not found or access denied' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: { data?: object; currentStep?: number } = {}
    
    if (data !== undefined) {
      updateData.data = data
    }
    
    if (typeof currentStep === 'number' && currentStep >= 1 && currentStep <= 5) {
      updateData.currentStep = currentStep
    }

    // Update draft
    const draft = await prisma.teacherDraft.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      id: draft.id,
      data: draft.data,
      currentStep: draft.currentStep,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      message: 'Draft updated successfully',
    })
  } catch (error) {
    console.error('Error updating teacher draft:', error)
    return NextResponse.json(
      { error: 'Failed to update draft' },
      { status: 500 }
    )
  }
}

/**
 * DELETE: Remove a draft
 * Requirement 9.2: Draft management
 * 
 * Query params:
 * - id: The ID of the draft to delete
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as string
    const userId = session.user.id as string

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Check authorization using RBAC
    if (!canManageTeachers(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to delete teacher drafts' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Draft ID is required', field: 'id' },
        { status: 400 }
      )
    }

    // Verify draft exists and belongs to user
    const existingDraft = await prisma.teacherDraft.findFirst({
      where: {
        id,
        schoolId,
        createdBy: userId,
      },
    })

    if (!existingDraft) {
      return NextResponse.json(
        { error: 'Draft not found or access denied' },
        { status: 404 }
      )
    }

    // Delete draft
    await prisma.teacherDraft.delete({
      where: { id },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Draft deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting teacher draft:', error)
    return NextResponse.json(
      { error: 'Failed to delete draft' },
      { status: 500 }
    )
  }
}
