/**
 * ImageKit Server-Side Upload API
 * 
 * Handles file uploads through the server for cases where
 * client-side upload is not suitable (e.g., bulk uploads, server processing).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { imagekitService } from '@/lib/imagekit'

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
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
        { status: 403 }
      )
    }

    // Check if ImageKit is configured
    if (!imagekitService.isConfigured()) {
      console.error('ImageKit configuration check failed. Environment variables:', {
        hasPublicKey: !!process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
        hasPrivateKey: !!process.env.IMAGEKIT_PRIVATE_KEY,
        hasUrlEndpoint: !!process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
      })
      return NextResponse.json(
        { error: 'ImageKit is not configured. Please check server environment variables.' },
        { status: 503 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const uploadType = formData.get('type') as string | null
    const entityId = formData.get('entityId') as string | null
    const documentType = formData.get('documentType') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!uploadType) {
      return NextResponse.json(
        { error: 'Upload type is required' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Validate file type based on upload type
    const isImage = uploadType === 'teacher_photo' || uploadType === 'student_photo' || uploadType === 'school_logo'
    const allowedTypes = isImage ? ALLOWED_IMAGE_TYPES : ALLOWED_DOCUMENT_TYPES

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let result

    switch (uploadType) {
      case 'teacher_photo':
        if (!entityId) {
          return NextResponse.json(
            { error: 'Teacher ID is required for photo upload' },
            { status: 400 }
          )
        }
        result = await imagekitService.uploadTeacherPhoto(
          schoolId,
          entityId,
          buffer,
          file.name
        )
        break

      case 'student_photo':
        if (!entityId) {
          return NextResponse.json(
            { error: 'Student ID is required for photo upload' },
            { status: 400 }
          )
        }
        result = await imagekitService.uploadStudentPhoto(
          schoolId,
          entityId,
          buffer,
          file.name
        )
        break

      case 'teacher_document':
        if (!entityId) {
          return NextResponse.json(
            { error: 'Teacher ID is required for document upload' },
            { status: 400 }
          )
        }
        if (!documentType) {
          return NextResponse.json(
            { error: 'Document type is required' },
            { status: 400 }
          )
        }
        result = await imagekitService.uploadTeacherDocument(
          schoolId,
          entityId,
          buffer,
          file.name,
          documentType
        )
        break

      case 'school_logo':
        result = await imagekitService.uploadSchoolLogo(
          schoolId,
          buffer,
          file.name
        )
        break

      case 'school_asset':
        result = await imagekitService.uploadSchoolAsset(
          schoolId,
          buffer,
          file.name,
          documentType || undefined
        )
        break

      default:
        return NextResponse.json(
          { error: 'Invalid upload type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      file: {
        fileId: result.fileId,
        name: result.name,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        size: result.size,
        filePath: result.filePath,
      },
    })
  } catch (error) {
    console.error('ImageKit upload error:', error)
    
    // Extract detailed error message
    let errorMessage = 'Failed to upload file'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'object' && error !== null) {
      const errorObj = error as { message?: string; error?: string }
      errorMessage = errorObj.message || errorObj.error || JSON.stringify(error)
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
