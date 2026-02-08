/**
 * Teacher Marks Management - Students Marks Data API Route
 * Progressive filtering: Step 4 - Student List with Marks
 * 
 * Requirements: 4.1, 4.2, 9.1, 9.2
 * - Display comprehensive list of students with current marks
 * - Load all CA entries and exam entries for students
 * - Generate grade calculations using GradingEngine
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StudentStatus } from '@/types/enums'
import { gradingEngine, type CAEntry, type ExamEntry, type GradeCalculation } from '@/lib/grading-engine'

export interface StudentsMarksResponse {
  students: {
    id: string;
    name: string;
    admissionNumber: string;
    caEntries: CAEntry[];
    examEntry?: ExamEntry;
    gradeCalculation: GradeCalculation;
  }[];
  subject: {
    id: string;
    name: string;
    code: string;
  };
  term: {
    id: string;
    name: string;
    isActive: boolean;
  };
}

/**
 * GET /api/teacher/marks/[classId]/[subjectId]/students
 * Returns students with their marks data for the selected class and subject
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { classId: string; subjectId: string } }
) {
  try {
    console.log('🔍 [API] /api/teacher/marks/[classId]/[subjectId]/students - Starting request')
    console.log('📋 Parameters:', { classId: params.classId, subjectId: params.subjectId })
    
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to access marks management'
      }, { status: 401 })
    }

    // Verify user has appropriate role
    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { 
          error: 'Access denied. Teacher role required.',
          details: `Current role: ${userRole}. Teacher access required.`
        },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
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
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
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

    // Verify teacher has access to this class and subject
    const hasAccess = await prisma.staffSubject.findFirst({
      where: {
        staffId: staff.id,
        classId: params.classId,
        subjectId: params.subjectId,
      },
    }) || await prisma.staffClass.findFirst({
      where: {
        staffId: staff.id,
        classId: params.classId,
      },
    })

    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          details: 'You do not have permission to access marks for this class and subject.'
        },
        { status: 403 }
      )
    }

    // Get current active term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isCurrent: true,
        },
      },
      include: {
        academicYear: {
          select: {
            isActive: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    })

    if (!currentTerm) {
      return NextResponse.json(
        { 
          error: 'No active term found',
          details: 'No current academic term is active. Please contact your school administrator.'
        },
        { status: 400 }
      )
    }

    // Get subject details
    const subject = await prisma.subject.findUnique({
      where: {
        id: params.subjectId,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    })

    if (!subject) {
      return NextResponse.json(
        { 
          error: 'Subject not found',
          details: 'The requested subject could not be found.'
        },
        { status: 404 }
      )
    }

    // Get students in the class
    const students = await prisma.student.findMany({
      where: {
        classId: params.classId,
        status: StudentStatus.ACTIVE,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' },
      ],
    })

    // Get CA entries for all students in this subject and term
    const caEntries = await prisma.cAEntry.findMany({
      where: {
        subjectId: params.subjectId,
        termId: currentTerm.id,
        studentId: {
          in: students.map(s => s.id),
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    // Get exam entries for all students in this subject and term
    const examEntries = await prisma.examEntry.findMany({
      where: {
        subjectId: params.subjectId,
        termId: currentTerm.id,
        studentId: {
          in: students.map(s => s.id),
        },
      },
    })

    // Build response with grade calculations
    const studentsWithMarks = students.map(student => {
      const studentName = `${student.firstName} ${student.lastName}`
      
      // Get CA entries for this student
      const studentCAEntries = caEntries
        .filter(ca => ca.studentId === student.id)
        .map(ca => ({
          id: ca.id,
          subjectId: ca.subjectId,
          studentId: ca.studentId,
          teacherId: ca.teacherId,
          termId: ca.termId,
          name: ca.name,
          type: ca.type as CAEntry['type'],
          maxScore: ca.maxScore,
          rawScore: ca.rawScore,
          date: ca.date,
          competencyId: ca.competencyId || undefined,
          competencyComment: ca.competencyComment || undefined,
          status: ca.status as CAEntry['status'],
          submittedAt: ca.submittedAt || undefined,
          approvedAt: ca.approvedAt || undefined,
          approvedBy: ca.approvedBy || undefined,
          createdAt: ca.createdAt,
          updatedAt: ca.updatedAt,
        }))

      // Get exam entry for this student
      const studentExamEntry = examEntries.find(exam => exam.studentId === student.id)
      const examEntry: ExamEntry | undefined = studentExamEntry ? {
        id: studentExamEntry.id,
        subjectId: studentExamEntry.subjectId,
        studentId: studentExamEntry.studentId,
        teacherId: studentExamEntry.teacherId,
        termId: studentExamEntry.termId,
        examScore: studentExamEntry.examScore,
        maxScore: studentExamEntry.maxScore,
        examDate: studentExamEntry.examDate,
        status: studentExamEntry.status as ExamEntry['status'],
        submittedAt: studentExamEntry.submittedAt || undefined,
        approvedAt: studentExamEntry.approvedAt || undefined,
        approvedBy: studentExamEntry.approvedBy || undefined,
        createdAt: studentExamEntry.createdAt,
        updatedAt: studentExamEntry.updatedAt,
      } : undefined

      // Generate grade calculation
      const gradeCalculation = gradingEngine.generateGradeCalculation(
        student.id,
        params.subjectId,
        currentTerm.id,
        studentCAEntries,
        examEntry
      )

      return {
        id: student.id,
        name: studentName,
        admissionNumber: student.admissionNumber,
        caEntries: studentCAEntries,
        examEntry,
        gradeCalculation,
      }
    })

    const response: StudentsMarksResponse = {
      students: studentsWithMarks,
      subject: {
        id: subject.id,
        name: subject.name,
        code: subject.code,
      },
      term: {
        id: currentTerm.id,
        name: currentTerm.name,
        isActive: currentTerm.academicYear.isActive,
      },
    }

    console.log('✅ [API] /api/teacher/marks/[classId]/[subjectId]/students - Successfully returning', studentsWithMarks.length, 'students')
    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/[classId]/[subjectId]/students - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch student marks data',
        details: 'An unexpected error occurred. Please try refreshing the page.'
      },
      { status: 500 }
    )
  }
}