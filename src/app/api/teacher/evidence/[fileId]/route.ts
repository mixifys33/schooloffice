import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * DELETE /api/teacher/evidence/[fileId]
 * Delete an evidence file
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    console.log('🔍 [API] /api/teacher/evidence/[fileId] - DELETE - Starting request')
    
    const session = await auth()

    if (!session?.user?.id) {
      console.log('❌ [API] /api/teacher/evidence/[fileId] - No session found')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      console.log('❌ [API] /api/teacher/evidence/[fileId] - No school context')
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
      },
    })

    if (!teacher) {
      console.log('❌ [API] /api/teacher/evidence/[fileId] - Teacher profile not found')
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      )
    }

    // Get fileId from params
    const { fileId } = await params

    // Verify the file belongs to this teacher (filename starts with teacher ID)
    if (!fileId.startsWith(teacher.id)) {
      console.log('❌ [API] /api/teacher/evidence/[fileId] - Unauthorized: File does not belong to teacher')
      return NextResponse.json(
        { error: 'Unauthorized: You can only delete your own files' },
        { status: 403 }
      )
    }

    // Construct file path
    const filePath = join(process.cwd(), 'public', 'uploads', 'evidence', schoolId, fileId)

    // Check if file exists
    if (!existsSync(filePath)) {
      console.log('❌ [API] /api/teacher/evidence/[fileId] - File not found')
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Delete the file
    await unlink(filePath)

    console.log(`✅ [API] /api/teacher/evidence/[fileId] - Successfully deleted file: ${fileId}`)
    
    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/evidence/[fileId] - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to delete file',
        details: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    )
  }
}
