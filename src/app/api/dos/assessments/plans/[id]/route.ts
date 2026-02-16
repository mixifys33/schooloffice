/**
 * DoS Assessment Plan Detail API
 * Fetches detailed information about a specific assessment plan (CA entry group)
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
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No school context found'
        },
        { status: 400 }
      )
    }

    // Verify DoS role
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    
    // Check if user has DoS role
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        primaryRole: true,
        secondaryRoles: true,
      },
    })

    const isDoS = staff && (
      staff.primaryRole === StaffRole.DOS ||
      ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS)
    )

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Director of Studies access required'
        },
        { status: 403 }
      )
    }

    // Get the sample CA entry to identify the assessment group
    const sampleEntry = await prisma.cAEntry.findUnique({
      where: { id },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        student: {
          select: {
            id: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        term: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!sampleEntry) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Assessment not found'
        },
        { status: 404 }
      )
    }

    // Get all CA entries in this assessment group
    const allEntries = await prisma.cAEntry.findMany({
      where: {
        schoolId,
        name: sampleEntry.name,
        type: sampleEntry.type,
        subjectId: sampleEntry.subjectId,
        termId: sampleEntry.termId,
      },
      include: {
        student: {
          select: {
            id: true,
            admissionNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        student: {
          admissionNumber: 'asc',
        },
      },
    })

    // Calculate statistics
    const totalStudents = allEntries.length
    const entriesWithScores = allEntries.filter(e => e.rawScore !== null && e.rawScore > 0).length
    const completionRate = totalStudents > 0 ? (entriesWithScores / totalStudents) * 100 : 0
    
    // Calculate average score (using rawScore field)
    const scoresArray = allEntries
      .filter(e => e.rawScore !== null && e.rawScore > 0)
      .map(e => e.rawScore as number)
    
    const averageScore = scoresArray.length > 0
      ? scoresArray.reduce((sum, score) => sum + score, 0) / scoresArray.length
      : 0
    
    const highestScore = scoresArray.length > 0 ? Math.max(...scoresArray) : 0
    const lowestScore = scoresArray.length > 0 ? Math.min(...scoresArray) : 0

    // Check for anomalies (simplified)
    const hasAnomalies = false // Could add logic to detect suspicious patterns

    // Check if all entries are submitted
    const allSubmitted = allEntries.every(e => e.status === 'SUBMITTED')
    const canApprove = completionRate === 100 && !allSubmitted

    // Format student scores
    const studentScores = allEntries.map(entry => ({
      studentId: entry.student.id,
      admissionNumber: entry.student.admissionNumber,
      studentName: `${entry.student.firstName} ${entry.student.lastName}`,
      score: entry.rawScore,
      maxScore: entry.maxScore,
      percentage: entry.rawScore !== null ? (entry.rawScore / entry.maxScore) * 100 : null,
      status: entry.status,
    }))

    const assessmentDetail = {
      id: sampleEntry.id,
      name: sampleEntry.name,
      type: sampleEntry.type,
      subjectId: sampleEntry.subject.id,
      subjectName: sampleEntry.subject.name,
      subjectCode: sampleEntry.subject.code,
      classId: sampleEntry.student.class.id,
      className: sampleEntry.student.class.name,
      teacherId: sampleEntry.teacher.id,
      teacherName: `${sampleEntry.teacher.firstName} ${sampleEntry.teacher.lastName}`,
      termId: sampleEntry.term.id,
      termName: sampleEntry.term.name,
      maxScore: sampleEntry.maxScore,
      weightPercentage: 20, // CA is 20% of final grade
      createdAt: sampleEntry.createdAt.toISOString(),
      status: allSubmitted ? 'SUBMITTED' : 'DRAFT',
      
      // Statistics
      totalStudents,
      entriesWithScores,
      completionRate,
      averageScore,
      highestScore,
      lowestScore,
      
      // Student scores
      studentScores,
      
      // Flags
      isOverdue: false, // CA entries don't have dueDate in current schema
      hasAnomalies,
      dosApproved: allSubmitted,
      canApprove,
    }

    return NextResponse.json({
      success: true,
      data: assessmentDetail,
    })

  } catch (error) {
    console.error('Error fetching assessment detail:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to fetch assessment detail'
    }, { status: 500 })
  }
}
