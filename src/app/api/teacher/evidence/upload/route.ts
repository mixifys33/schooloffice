import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * POST /api/teacher/evidence/upload
 * Upload evidence files for learning activities
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/evidence/upload - POST - Starting request')
    
    const session = await auth()

    if (!session?.user?.id) {
      console.log('❌ [API] /api/teacher/evidence/upload - No session found')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      console.log('❌ [API] /api/teacher/evidence/upload - No school context')
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Get teacher information
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId: session.user.id,
        schoolId: schoolId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!teacher) {
      console.log('❌ [API] /api/teacher/evidence/upload - Teacher profile not found')
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const classId = formData.get('classId') as string
    const subjectId = formData.get('subjectId') as string
    const description = formData.get('description') as string
    const linkedCompetencies = formData.get('linkedCompetencies') as string

    console.log('📝 [API] Form data received:', {
      filesCount: files.length,
      classId,
      subjectId,
      description,
      linkedCompetencies,
    })

    if (!files || files.length === 0) {
      console.log('❌ [API] No files provided')
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    if (!classId || !subjectId) {
      console.log('❌ [API] Missing required fields:', { classId, subjectId })
      return NextResponse.json(
        { error: 'Missing required fields: classId, subjectId' },
        { status: 400 }
      )
    }

    const uploadedFiles = []

    // Process each file
    for (const file of files) {
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        console.log(`⚠️ [API] File ${file.name} exceeds size limit`)
        continue // Skip this file
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'video/mp4',
        'video/quicktime',
      ]

      if (!allowedTypes.includes(file.type)) {
        console.log(`⚠️ [API] File ${file.name} has invalid type: ${file.type}`)
        continue // Skip this file
      }

      // Create upload directory if it doesn't exist
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'evidence', schoolId)
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true })
      }

      // Generate unique filename
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = `${teacher.id}_${timestamp}_${Math.random().toString(36).substring(7)}.${fileExtension}`
      const filePath = join(uploadDir, fileName)
      const publicPath = `/uploads/evidence/${schoolId}/${fileName}`

      // Write file to disk
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      console.log(`✅ [API] File saved: ${fileName}`)

      // Add to uploaded files list
      uploadedFiles.push({
        id: `temp_${timestamp}`,
        teacherId: teacher.id,
        classId,
        subjectId,
        title: file.name,
        description: description || '',
        linkedCompetencies: linkedCompetencies ? JSON.parse(linkedCompetencies) : [],
        fileName: file.name,
        filePath: publicPath,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        uploadedBy: `${teacher.firstName} ${teacher.lastName}`,
      })
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: 'No valid files were uploaded. Check file size and type restrictions.' },
        { status: 400 }
      )
    }

    console.log(`✅ [API] /api/teacher/evidence/upload - Successfully uploaded ${uploadedFiles.length} file(s)`)
    
    return NextResponse.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/evidence/upload - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    )
  }
}
