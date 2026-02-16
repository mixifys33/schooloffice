/**
 * Class Teacher Evidence API Route
 * Provides learning evidence data for class teachers
 * Requirements: 6.1, 6.2, 6.3
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/class-teacher/evidence - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      console.log('❌ [API] /api/class-teacher/evidence - No session found')
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to access evidence data'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      console.log('❌ [API] /api/class-teacher/evidence - No school context')
      return NextResponse.json(
        { 
          error: 'No school context found',
          details: 'Your account is not linked to a school. Please contact support.'
        },
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
        firstName: true,
        lastName: true,
        primaryRole: true,
        secondaryRoles: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { 
          error: 'No staff profile found',
          details: 'Your staff profile is not set up. Please contact your school administrator.'
        },
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
      console.log('❌ [API] /api/class-teacher/evidence - Invalid role:', userRole)
      return NextResponse.json(
        { 
          error: 'Access denied. Class Teacher role required.',
          details: `Current role: ${userRole}. Class Teacher access required.`
        },
        { status: 403 }
      )
    }

    // Get staff subject assignments (classes and subjects teacher can access)
    const staffSubjects = await prisma.staffSubject.findMany({
      where: { staffId: staff.id },
      include: {
        subject: { 
          select: { 
            id: true, 
            name: true,
          } 
        },
        class: { 
          select: { 
            id: true, 
            name: true,
          } 
        }
      }
    })

    // Build classes array
    const classes = staffSubjects.map(ss => ({
      id: `${ss.classId}-${ss.subjectId}`,
      classId: ss.classId,
      className: ss.class.name,
      subjectId: ss.subjectId,
      subjectName: ss.subject.name,
    }))

    // Get evidence files for teacher's classes and subjects
    const classIds = staffSubjects.map(ss => ss.classId);
    const subjectIds = staffSubjects.map(ss => ss.subjectId);

    const evidenceRecords = await prisma.learningEvidence.findMany({
      where: {
        schoolId,
        classId: { in: classIds },
        subjectId: { in: subjectIds },
      },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
        staff: { select: { firstName: true, lastName: true } },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // Format evidence files
    const evidenceFiles = evidenceRecords.map(evidence => {
      // Determine file type from MIME type
      let fileType: 'document' | 'image' | 'video' | 'other' = 'other';
      if (evidence.mimeType.startsWith('image/')) {
        fileType = 'image';
      } else if (evidence.mimeType.startsWith('video/')) {
        fileType = 'video';
      } else if (
        evidence.mimeType.includes('pdf') ||
        evidence.mimeType.includes('document') ||
        evidence.mimeType.includes('word') ||
        evidence.mimeType.includes('text')
      ) {
        fileType = 'document';
      }

      // Parse linked competencies
      const linkedCompetencies = evidence.competencyRef 
        ? evidence.competencyRef.split(',').map(c => c.trim()).filter(Boolean)
        : [];

      return {
        id: evidence.id,
        fileName: evidence.fileName,
        fileType,
        fileSize: `${(evidence.fileSize / 1024).toFixed(2)} KB`,
        fileUrl: evidence.fileUrl, // ImageKit URL
        uploadDate: evidence.uploadedAt.toISOString(),
        description: evidence.description || '',
        linkedCompetencies,
        linkedAssessments: [], // TODO: Implement when assessment linking is added
        uploadedBy: `${evidence.staff.firstName} ${evidence.staff.lastName}`,
        className: evidence.class.name,
        subjectName: evidence.subject.name,
      };
    });

    const response = {
      classes,
      evidenceFiles,
      isLoading: false,
    }

    console.log('✅ [API] /api/class-teacher/evidence - Successfully returning evidence data')
    console.log(`📊 [API] Classes: ${classes.length}, Evidence Files: ${evidenceFiles.length}`)
    
    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/evidence - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch evidence data',
        details: 'An unexpected error occurred. Please try refreshing the page.'
      },
      { status: 500 }
    )
  }
}
