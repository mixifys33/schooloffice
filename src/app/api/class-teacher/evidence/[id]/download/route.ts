/**
 * Class Teacher Evidence Download API Route
 * Handles file downloads with proper headers
 * Requirements: 6.1, 6.2, 6.3
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('🔍 [API] /api/class-teacher/evidence/[id]/download - Downloading evidence:', id)
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: {
        userId: session.user.id,
        schoolId,
      },
      select: {
        id: true,
        primaryRole: true,
        secondaryRoles: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { error: 'No staff profile found' },
        { status: 404 }
      )
    }

    // Verify user has appropriate role
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    const isClassTeacher = userRole === Role.TEACHER || 
                          staff.primaryRole === StaffRole.CLASS_TEACHER ||
                          (staff.secondaryRoles as string[] || []).includes(StaffRole.CLASS_TEACHER)
    
    if (!isClassTeacher && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied. Class Teacher role required.' },
        { status: 403 }
      )
    }

    // Find the evidence record
    const evidence = await prisma.learningEvidence.findUnique({
      where: { id },
      select: {
        id: true,
        schoolId: true,
        fileUrl: true,
        fileName: true,
        mimeType: true,
      },
    })

    if (!evidence) {
      return NextResponse.json(
        { error: 'Evidence file not found' },
        { status: 404 }
      )
    }

    // Verify evidence belongs to the same school
    if (evidence.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Redirect to the file URL (ImageKit handles the actual file serving)
    return NextResponse.redirect(evidence.fileUrl)

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/evidence/[id]/download - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}
