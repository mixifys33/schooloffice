/**
 * Teacher Reports API Route
 * Requirements: 9.1, 9.3, 9.4 - Return simple class lists and basic info
 * 
 * FOCUS: Teachers want "Enter marks", "Take attendance", "See my class"
 * NOT: Performance analytics, trends, or fancy dashboards
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

/**
 * Simple class info for teacher reports
 * Requirements: 9.1 - Show basic class information only
 */
export interface SimpleClassInfo {
  classId: string
  className: string
  studentCount: number
  subjectName: string
  subjectId: string
  lastAttendanceDate: string | null
  pendingMarksCount: number
  averageCA: number | null
  averageExam: number | null
  averageFinal: number | null
  caCompletion: number
  examCompletion: number
  finalCompletion: number
}

export interface StudentPerformance {
  id: string
  name: string
  admissionNumber: string
  caScore: number | null
  caMaxScore: number | null
  examScore: number | null
  examMaxScore: number | null
  finalScore: number | null
  finalMaxScore: number | null
  grade: string | null
}

/**
 * Simple teacher reports response
 */
export interface TeacherReportsResponse {
  classes: SimpleClassInfo[]
  currentTerm: {
    id: string
    name: string
  } | null
  studentPerformance: Record<string, StudentPerformance[]>
  schoolName: string
}

/**
 * GET /api/teacher/reports
 * Returns simple class information for assigned classes
 * Requirements: 9.1, 9.3, 9.4 - Exclude all financial data
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role
    const userId = session.user.id as string

    // Only teachers can access this endpoint
    if (userRole !== Role.TEACHER) {
      return NextResponse.json({ error: 'Only teachers can access reports' }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    // Get school information
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    })

    const schoolName = school?.name || 'School'

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isActive: true
        },
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      },
      select: { id: true, name: true },
    })

    // Get teacher assignments
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId,
        schoolId,
        employmentStatus: 'ACTIVE',
      },
      select: {
        assignedClassIds: true,
        assignedSubjectIds: true,
      },
    })

    if (!teacher || !teacher.assignedClassIds || teacher.assignedClassIds.length === 0) {
      return NextResponse.json({
        classes: [],
        currentTerm: currentTerm ? { id: currentTerm.id, name: currentTerm.name } : null,
        studentPerformance: {},
        schoolName,
      })
    }

    // Get simple class information
    const classes: SimpleClassInfo[] = []
    const studentPerformance: Record<string, StudentPerformance[]> = {}
    const processedClassSubjects = new Set<string>() // Track processed class-subject pairs
    
    // Process each class with each assigned subject
    for (const classId of teacher.assignedClassIds) {
      // Get class details
      const classInfo = await prisma.class.findUnique({
        where: { id: classId },
        select: { name: true },
      })

      if (!classInfo) continue

      // Get students in class
      const students = await prisma.student.findMany({
        where: {
          classId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
        },
      })

      const studentCount = students.length

      // Process each assigned subject for this class
      if (teacher.assignedSubjectIds && teacher.assignedSubjectIds.length > 0) {
        for (const subjectId of teacher.assignedSubjectIds) {
          // Get subject info
          const subject = await prisma.subject.findUnique({
            where: { id: subjectId },
            select: { id: true, name: true },
          })

          if (!subject) continue

          const subjectName = subject.name

          // Create unique key for this class-subject combination
          const classSubjectKey = `${classId}-${subjectId}`
          
          // Skip if we've already processed this class-subject combination
          if (processedClassSubjects.has(classSubjectKey)) {
            continue
          }
          processedClassSubjects.add(classSubjectKey)

      // Get last attendance date
      const lastAttendance = await prisma.attendance.findFirst({
        where: {
          classId,
          schoolId,
        },
        orderBy: { date: 'desc' },
        select: { date: true },
      })

      // Calculate performance metrics if we have a current term and subject
      let averageCA: number | null = null
      let averageExam: number | null = null
      let averageFinal: number | null = null
      let caCompletion = 0
      let examCompletion = 0
      let finalCompletion = 0
      const classStudentPerformance: StudentPerformance[] = []

      if (currentTerm && subjectId && students.length > 0) {
        // Get grading system for this class and term
        let gradingSystem = await prisma.gradingSystem.findFirst({
          where: {
            schoolId,
            OR: [
              { classId, termId: currentTerm.id },
              { classId, termId: null },
              { classId: null, termId: currentTerm.id },
              { classId: null, termId: null },
            ],
          },
          include: {
            grades: {
              orderBy: { minScore: 'desc' },
            },
          },
        })

        // If no grading system found, try to get any default one for the school
        if (!gradingSystem) {
          gradingSystem = await prisma.gradingSystem.findFirst({
            where: {
              schoolId,
            },
            include: {
              grades: {
                orderBy: { minScore: 'desc' },
              },
            },
          })
        }

        console.log(`📊 [Reports] Grading system found: ${gradingSystem ? 'Yes' : 'No'}, Category: ${gradingSystem?.category || 'N/A'}, Grades: ${gradingSystem?.grades.length || 0}`)

        // Get CA entries for this class/subject/term
        const caEntries = await prisma.cAEntry.findMany({
          where: {
            studentId: { in: students.map(s => s.id) },
            subjectId,
            termId: currentTerm.id,
          },
          select: {
            studentId: true,
            rawScore: true,
            maxScore: true,
          },
        })

        console.log(`📊 [Reports] Class: ${classInfo.name}, Subject: ${subjectName}, CA Entries found: ${caEntries.length}`)

        // Get exam entries for this class/subject/term
        const examEntries = await prisma.examEntry.findMany({
          where: {
            studentId: { in: students.map(s => s.id) },
            subjectId,
            termId: currentTerm.id,
          },
          select: {
            studentId: true,
            examScore: true,
            maxScore: true,
          },
        })

        console.log(`📊 [Reports] Class: ${classInfo.name}, Subject: ${subjectName}, Exam Entries found: ${examEntries.length}`)

        // Calculate averages based on final scores (out of 100)
        const finalScores: number[] = []
        const caPercentages: number[] = []
        const examPercentages: number[] = []

        // Build student performance data
        for (const student of students) {
          const studentCAs = caEntries.filter(e => e.studentId === student.id)
          const studentExam = examEntries.find(e => e.studentId === student.id)
          
          // Calculate CA score - AVERAGE all CA entries, then scale to total CA weight
          let caScore: number | null = null
          let caMaxScore: number | null = null
          
          if (studentCAs.length > 0) {
            // Calculate average percentage across all CA entries
            const caPercentages = studentCAs.map(ca => {
              if (ca.maxScore && ca.maxScore > 0) {
                return (ca.rawScore || 0) / ca.maxScore * 100
              }
              return 0
            })
            
            const avgCAPercentage = caPercentages.reduce((sum, p) => sum + p, 0) / caPercentages.length
            
            // Determine total CA weight (usually 20 out of 100)
            // We'll use the first CA's maxScore as indicator, or default to 20
            const totalCAWeight = 20 // Standard CA weight out of 100
            
            // Convert average percentage to score out of CA weight
            caScore = Math.round((avgCAPercentage / 100) * totalCAWeight)
            caMaxScore = totalCAWeight
          }
          
          const examScore = studentExam?.examScore || null
          const examMaxScore = studentExam?.maxScore || null
          
          // Convert exam score to be out of 80 (since exam weight is 80 out of 100)
          let displayExamScore: number | null = null
          let displayExamMaxScore: number | null = null
          
          if (examScore !== null && examMaxScore !== null) {
            // Convert from out of 100 to out of 80
            const examPercentage = (examScore / examMaxScore) * 100
            displayExamScore = Math.round((examPercentage / 100) * 80 * 10) / 10 // Out of 80, rounded to 1 decimal
            displayExamMaxScore = 80
          }
          
          // Calculate final score out of 100
          let finalScore: number | null = null
          const finalMaxScore = 100 // Always out of 100
          
          if (caScore !== null && examScore !== null && caMaxScore !== null && examMaxScore !== null) {
            // CA is out of 20, Exam needs to be scaled to 80
            // Convert exam percentage to its contribution out of 80
            const examPercentage = (examScore / examMaxScore) * 100
            const examContribution = (examPercentage / 100) * 80 // Scale to 80 points
            
            // Final = CA (out of 20) + Exam contribution (out of 80) = out of 100
            finalScore = Math.round(caScore + examContribution)
            
            // Ensure final score doesn't exceed 100
            if (finalScore > 100) finalScore = 100
            
            // Track for averages
            finalScores.push(finalScore)
            caPercentages.push(Math.round((caScore / caMaxScore) * 100))
            examPercentages.push(Math.round(examPercentage))
          } else if (caScore !== null && caMaxScore !== null) {
            // Only CA available - scale to 100
            const caPercentage = (caScore / caMaxScore) * 100
            finalScore = Math.round(caPercentage)
            finalScores.push(finalScore)
            caPercentages.push(Math.round(caPercentage))
          } else if (examScore !== null && examMaxScore !== null) {
            // Only Exam available - scale to 100
            const examPercentage = (examScore / examMaxScore) * 100
            finalScore = Math.round(examPercentage)
            finalScores.push(finalScore)
            examPercentages.push(Math.round(examPercentage))
          }

          // Get grade from grading system based on final score
          let grade: string | null = null
          if (finalScore !== null && gradingSystem && gradingSystem.grades.length > 0) {
            const matchingGrade = gradingSystem.grades.find(
              g => finalScore >= g.minScore && finalScore <= g.maxScore
            )
            grade = matchingGrade?.grade || null
          }

          classStudentPerformance.push({
            id: student.id,
            name: `${student.firstName} ${student.lastName}`,
            admissionNumber: student.admissionNumber,
            caScore,
            caMaxScore,
            examScore: displayExamScore,
            examMaxScore: displayExamMaxScore,
            finalScore,
            finalMaxScore,
            grade,
          })
        }

        // Calculate averages from actual scores
        if (caPercentages.length > 0) {
          averageCA = Math.round(caPercentages.reduce((a, b) => a + b, 0) / caPercentages.length)
          caCompletion = Math.round((caPercentages.length / students.length) * 100)
        }
        
        if (examPercentages.length > 0) {
          averageExam = Math.round(examPercentages.reduce((a, b) => a + b, 0) / examPercentages.length)
          examCompletion = Math.round((examPercentages.length / students.length) * 100)
        }

        if (finalScores.length > 0) {
          averageFinal = Math.round(finalScores.reduce((a, b) => a + b, 0) / finalScores.length)
          finalCompletion = Math.round((finalScores.length / students.length) * 100)
        }
      }

      const classKey = `${classId}-${subjectId}`
      studentPerformance[classKey] = classStudentPerformance

      classes.push({
        classId,
        className: classInfo.name,
        studentCount,
        subjectName,
        subjectId,
        lastAttendanceDate: lastAttendance?.date.toISOString() || null,
        pendingMarksCount: 0,
        averageCA,
        averageExam,
        averageFinal,
        caCompletion,
        examCompletion,
        finalCompletion,
      })
        }
      }
    }

    const response: TeacherReportsResponse = {
      classes,
      currentTerm: currentTerm ? { id: currentTerm.id, name: currentTerm.name } : null,
      studentPerformance,
      schoolName,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching teacher reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}