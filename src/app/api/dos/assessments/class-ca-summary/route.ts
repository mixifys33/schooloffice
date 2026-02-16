/**
 * DoS Class CA Summary API
 * Shows CA averages for all students in a class, grouped by subject
 * Converts all CA scores to a standard format (100% or 20) for comparison
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function GET(request: NextRequest) {
  try {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const conversionMode = searchParams.get('conversionMode') || '100' // '100' or '20'

    if (!classId) {
      // Return list of available classes
      const classes = await prisma.class.findMany({
        where: { schoolId },
        select: {
          id: true,
          name: true,
          level: true,
        },
        orderBy: {
          name: 'asc',
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          classes,
        },
      })
    }

    // Get current term
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    console.log('🔍 [DoS CA Summary] Looking for current term. Today:', today.toISOString())
    
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isCurrent: true,
        },
        startDate: { lte: today },
        endDate: { gte: today },
      },
    })

    console.log('🔍 [DoS CA Summary] Current term found:', currentTerm ? `${currentTerm.name} (${currentTerm.id})` : 'NONE')

    if (!currentTerm) {
      return NextResponse.json({
        success: false,
        error: 'No active term found',
      }, { status: 404 })
    }

    // Get class details
    console.log('🔍 [DoS CA Summary] Fetching class details for classId:', classId)
    
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        level: true,
      },
    })

    console.log('🔍 [DoS CA Summary] Class found:', classData ? classData.name : 'NONE')

    if (!classData) {
      return NextResponse.json({
        success: false,
        error: 'Class not found',
      }, { status: 404 })
    }

    // Get all students in the class (including streams)
    console.log('🔍 [DoS CA Summary] Fetching students for class:', classData.name)
    
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        classId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        admissionNumber: true,
        firstName: true,
        lastName: true,
        stream: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { stream: { name: 'asc' } },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    console.log('🔍 [DoS CA Summary] Students found:', students.length)

    // Get all subjects for this class
    console.log('🔍 [DoS CA Summary] Fetching class subjects')
    
    const classSubjects = await prisma.classSubject.findMany({
      where: {
        classId,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        subject: {
          name: 'asc',
        },
      },
    })

    console.log('🔍 [DoS CA Summary] Class subjects found:', classSubjects.length)

    // Get all CA entries for this class and term
    console.log('🔍 [DoS CA Summary] Fetching CA entries for term:', currentTerm.name)
    
    const caEntries = await prisma.cAEntry.findMany({
      where: {
        schoolId,
        termId: currentTerm.id,
        student: {
          classId,
        },
      },
      select: {
        id: true,
        studentId: true,
        subjectId: true,
        rawScore: true,
        maxScore: true,
      },
    })

    console.log('🔍 [DoS CA Summary] CA entries found:', caEntries.length)

    // Calculate CA averages for each student-subject combination
    console.log('🔍 [DoS CA Summary] Starting calculations. Conversion mode:', conversionMode)
    
    const conversionTarget = conversionMode === '20' ? 20 : 100
    
    // Group CA entries by student and subject
    const studentSubjectScores = new Map<string, number[]>()
    
    for (const entry of caEntries) {
      if (entry.rawScore === null || entry.rawScore === 0) continue
      
      const key = `${entry.studentId}-${entry.subjectId}`
      
      // Convert score to percentage first
      const percentage = (entry.rawScore / entry.maxScore) * 100
      
      // Then convert to target format
      const convertedScore = (percentage / 100) * conversionTarget
      
      if (!studentSubjectScores.has(key)) {
        studentSubjectScores.set(key, [])
      }
      studentSubjectScores.get(key)!.push(convertedScore)
    }

    // Calculate averages
    const studentSubjectAverages = new Map<string, number>()
    
    for (const [key, scores] of studentSubjectScores.entries()) {
      if (scores.length > 0) {
        const average = scores.reduce((sum, score) => sum + score, 0) / scores.length
        studentSubjectAverages.set(key, average)
      }
    }

    // Build student rows with subject averages
    const studentRows = students.map(student => {
      const subjectScores: Record<string, number | null> = {}
      
      for (const classSubject of classSubjects) {
        const key = `${student.id}-${classSubject.subjectId}`
        const average = studentSubjectAverages.get(key)
        subjectScores[classSubject.subject.code] = average !== undefined ? average : null
      }

      // Calculate overall average (across all subjects)
      // IMPORTANT: Include ALL subjects in the class, treating null/missing scores as 0
      // Formula: (sum of all subject scores) / (total number of subjects)
      const allSubjectScores = Object.values(subjectScores).map(s => s ?? 0)
      const overallAverage = classSubjects.length > 0
        ? allSubjectScores.reduce((sum, score) => sum + score, 0) / classSubjects.length
        : null

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`,
        stream: student.stream?.name || null,
        subjectScores,
        overallAverage,
      }
    })

    // Build subject columns info
    const subjectColumns = classSubjects.map(cs => ({
      subjectId: cs.subjectId,
      subjectCode: cs.subject.code,
      subjectName: cs.subject.name,
    }))

    console.log('✅ [DoS CA Summary] Successfully prepared response')
    console.log('📊 [DoS CA Summary] Summary:', {
      students: students.length,
      subjects: classSubjects.length,
      caEntries: caEntries.length,
      studentsWithScores: studentRows.filter(s => s.overallAverage !== null).length
    })

    return NextResponse.json({
      success: true,
      data: {
        class: classData,
        term: {
          id: currentTerm.id,
          name: currentTerm.name,
        },
        conversionMode,
        conversionTarget,
        subjectColumns,
        studentRows,
        summary: {
          totalStudents: students.length,
          totalSubjects: classSubjects.length,
          studentsWithScores: studentRows.filter(s => s.overallAverage !== null).length,
        },
      },
    })

  } catch (error) {
    console.error('❌ [DoS CA Summary API] Error:', error)
    console.error('❌ [DoS CA Summary API] Stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to fetch CA summary',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
    }, { status: 500 })
  }
}
