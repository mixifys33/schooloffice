/**
 * Class Teacher Evidence Upload API Route
 * Handles file uploads for learning evidence
 * Requirements: 6.1, 6.2, 6.3
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'
import { uploadToImageKit } from '@/services/imagekit.service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/class-teacher/evidence/upload - Starting upload')
    
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

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const classId = formData.get('classId') as string
    const subjectId = formData.get('subjectId') as string
    const description = formData.get('description') as string || ''
    const linkedCompetenciesStr = formData.get('linkedCompetencies') as string
    
    // Validate required fields
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    if (!classId || !subjectId) {
      return NextResponse.json(
        { error: 'Class and subject are required' },
        { status: 400 }
      )
    }

    // Verify teacher has access to this class and subject
    const staffSubject = await prisma.staffSubject.findFirst({
      where: {
        staffId: staff.id,
        classId,
        subjectId,
      },
    })

    if (!staffSubject && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have access to this class and subject' },
        { status: 403 }
      )
    }

    // Parse linked competencies
    let linkedCompetencies: string[] = []
    try {
      if (linkedCompetenciesStr) {
        linkedCompetencies = JSON.parse(linkedCompetenciesStr)
      }
    } catch (e) {
      console.warn('Failed to parse linkedCompetencies:', e)
    }

    const competencyRef = linkedCompetencies.length > 0 
      ? linkedCompetencies.join(', ') 
      : null

    // Upload files and create evidence records
    const uploadedFiles = []
    
    for (const file of files) {
      try {
        // Convert file to buffer
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Upload to ImageKit
        const uploadResult = await uploadToImageKit({
          file: buffer,
          fileName: file.name,
          folder: `/evidence/${schoolId}/${classId}`,
          tags: ['evidence', classId, subjectId],
          useUniqueFileName: true,
        })

        // Create evidence record in database
        const evidence = await prisma.learningEvidence.create({
          data: {
            schoolId,
            staffId: staff.id,
            classId,
            subjectId,
            evidenceType: 'OTHER', // Default type, can be enhanced later
            title: file.name,
            description: description || null,
            fileUrl: uploadResult.url,
            fileName: uploadResult.name,
            fileSize: uploadResult.size,
            mimeType: file.type || 'application/octet-stream',
            imagekitFileId: uploadResult.fileId,
            competencyRef,
            uploadedBy: session.user.id,
          },
        })

        uploadedFiles.push({
          id: evidence.id,
          fileName: evidence.fileName,
          fileUrl: evidence.fileUrl,
        })

        console.log(`✅ [API] Uploaded file: ${file.name} (${evidence.id})`)
      } catch (fileError) {
        console.error(`❌ [API] Failed to upload file ${file.name}:`, fileError)
        // Continue with other files
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: 'Failed to upload any files' },
        { status: 500 }
      )
    }

    console.log(`✅ [API] Successfully uploaded ${uploadedFiles.length} file(s)`)
    
    return NextResponse.json({
      success: true,
      uploadedFiles,
      count: uploadedFiles.length,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/evidence/upload - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    )
  }
}
