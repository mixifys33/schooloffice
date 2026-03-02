/**
 * Teacher Profile Photo Upload API Route
 * POST /api/teacher/profile/photo - Upload profile photo
 * 
 * Upload Strategy:
 * 1. Primary: Upload to ImageKit cloud storage (recommended)
 * 2. Fallback: Store as base64 in database if ImageKit fails
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { uploadToImageKit, deleteFromImageKit } from '@/services/imagekit.service'
import imagekit from '@/services/imagekit.service'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const USE_IMAGEKIT_FALLBACK = true // Set to false to always use ImageKit

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has TEACHER role
    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Access denied. Teacher role required.' },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
        photo: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('photo') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Convert to base64 for more reliable upload
    const base64File = `data:${file.type};base64,${buffer.toString('base64')}`

    // Upload to ImageKit with base64 and error handling
    let uploadResult
    let photoUrl: string
    let usedFallback = false

    try {
      uploadResult = await uploadToImageKit({
        file: base64File,
        fileName: `${teacher.firstName}_${teacher.lastName}_${Date.now()}.${file.name.split('.').pop()}`,
        folder: '/teacher-profiles',
        tags: ['teacher', 'profile', schoolId, teacher.id],
        useUniqueFileName: true,
      })
      photoUrl = uploadResult.url
    } catch (uploadError) {
      console.error('ImageKit upload error:', uploadError)
      
      // Fallback: Store as base64 in database if ImageKit fails
      if (USE_IMAGEKIT_FALLBACK) {
        console.log('Using fallback: storing image as base64 in database')
        photoUrl = base64File
        usedFallback = true
      } else {
        return NextResponse.json(
          { 
            error: 'Failed to upload image to storage. Please try again or contact support if the issue persists.',
            details: uploadError instanceof Error ? uploadError.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }

    // Update teacher record with new photo URL
    const previousPhoto = teacher.photo
    
    // Try to delete old photo from ImageKit if it exists and is an ImageKit URL
    if (previousPhoto && previousPhoto.includes('ik.imagekit.io') && !usedFallback) {
      try {
        // We need to get the fileId from ImageKit by listing files with the teacher's tag
        // This is a workaround since we don't store fileId in the database
        const files = await imagekit.listFiles({
          tags: [teacher.id],
          limit: 100,
        })
        
        // Find the file that matches the old URL
        const oldFile = files.find((f: any) => f.url === previousPhoto)
        if (oldFile) {
          await deleteFromImageKit(oldFile.fileId)
          console.log(`Deleted old profile photo: ${oldFile.fileId}`)
        }
      } catch (deleteError) {
        // Log error but don't fail the upload if deletion fails
        console.error('Failed to delete old photo from ImageKit:', deleteError)
        // Continue with the upload - old photo will remain in storage
      }
    }
    
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacher.id },
      data: { photo: photoUrl },
      select: {
        id: true,
        photo: true,
      },
    })

    // Log to audit service
    await auditService.log({
      schoolId,
      userId: session.user.id,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacher.id,
      previousValue: { photo: previousPhoto },
      newValue: { photo: photoUrl },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    })

    return NextResponse.json({
      message: usedFallback 
        ? 'Profile photo uploaded successfully (stored locally due to cloud storage issue)'
        : 'Profile photo uploaded successfully',
      photo: updatedTeacher.photo,
      uploadDetails: usedFallback ? {
        method: 'base64',
        stored: 'database'
      } : {
        fileId: uploadResult!.fileId,
        url: uploadResult!.url,
        thumbnailUrl: uploadResult!.thumbnailUrl,
        method: 'imagekit',
        stored: 'cloud'
      },
    })
  } catch (error) {
    console.error('Error uploading profile photo:', error)
    return NextResponse.json(
      { error: 'Failed to upload profile photo' },
      { status: 500 }
    )
  }
}
