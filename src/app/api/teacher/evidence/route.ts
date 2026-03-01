import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

/**
 * GET /api/teacher/evidence
 * Get teacher's evidence files and class assignments
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get teacher information
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId: session.user.id,
        schoolId: session.user.schoolId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        assignedClassIds: true,
        assignedSubjectIds: true,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      )
    }

    // Get assigned classes with subjects
    const classes = teacher.assignedClassIds.length > 0 ? await prisma.class.findMany({
      where: {
        id: { in: teacher.assignedClassIds },
        schoolId: session.user.schoolId,
      },
      select: {
        id: true,
        name: true,
        level: true,
      },
    }) : []

    // Get assigned subjects
    const subjects = teacher.assignedSubjectIds.length > 0 ? await prisma.subject.findMany({
      where: {
        id: { in: teacher.assignedSubjectIds },
        schoolId: session.user.schoolId,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    }) : []

    // Create class-subject combinations for the evidence data structure
    const classSubjectCombinations = []
    for (const cls of classes) {
      for (const subject of subjects) {
        classSubjectCombinations.push({
          classId: cls.id,
          className: cls.name,
          subjectId: subject.id,
          subjectName: subject.name,
        })
      }
    }

    // Read uploaded files from filesystem
    const evidenceFiles = []
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'evidence', session.user.schoolId!)
    
    if (existsSync(uploadDir)) {
      try {
        const files = await readdir(uploadDir)
        
        for (const fileName of files) {
          // Only show files uploaded by this teacher
          if (fileName.startsWith(teacher.id)) {
            const filePath = join(uploadDir, fileName)
            const fileStats = await stat(filePath)
            const publicPath = `/uploads/evidence/${session.user.schoolId}/${fileName}`
            
            // Determine file type
            let fileType: 'document' | 'image' | 'video' | 'other' = 'other'
            const ext = fileName.split('.').pop()?.toLowerCase()
            
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
              fileType = 'image'
            } else if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) {
              fileType = 'video'
            } else if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
              fileType = 'document'
            }
            
            // Format file size
            const formatFileSize = (bytes: number) => {
              if (bytes < 1024) return bytes + ' B'
              if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
              return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
            }
            
            evidenceFiles.push({
              id: fileName,
              fileName: fileName.split('_').slice(2).join('_'), // Remove teacher ID and timestamp
              fileType,
              fileSize: formatFileSize(fileStats.size),
              filePath: publicPath,
              uploadDate: fileStats.mtime.toISOString(),
              description: '',
              linkedCompetencies: [],
              linkedAssessments: [],
              uploadedBy: `${teacher.firstName} ${teacher.lastName}`,
            })
          }
        }
        
        // Sort by upload date (newest first)
        evidenceFiles.sort((a, b) => 
          new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        )
      } catch (err) {
        console.error('Error reading evidence files:', err)
      }
    }

    const evidenceData = {
      evidenceFiles,
      classes: classSubjectCombinations,
      totalFiles: evidenceFiles.length,
      totalClasses: classes.length,
      totalSubjects: subjects.length,
    }

    return NextResponse.json(evidenceData)
  } catch (error) {
    console.error('Error fetching teacher evidence:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teacher/evidence
 * Upload evidence files (placeholder implementation)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get teacher information
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId: session.user.id,
        schoolId: session.user.schoolId,
      },
      select: {
        id: true,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      )
    }

    // TODO: Implement file upload logic
    // For now, return success message
    return NextResponse.json({ 
      message: 'File upload functionality will be implemented soon',
      success: true 
    })
  } catch (error) {
    console.error('Error uploading evidence:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/teacher/evidence
 * Delete evidence file (placeholder implementation)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get teacher information
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId: session.user.id,
        schoolId: session.user.schoolId,
      },
      select: {
        id: true,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher profile not found' },
        { status: 404 }
      )
    }

    // TODO: Implement file deletion logic
    // For now, return success message
    return NextResponse.json({ 
      message: 'File deletion functionality will be implemented soon',
      success: true 
    })
  } catch (error) {
    console.error('Error deleting evidence:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}