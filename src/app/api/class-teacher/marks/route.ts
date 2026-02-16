/**
 * Class Teacher Marks - Main API Route
 * Returns marks data for a specific class, subject, and exam
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export interface StudentMark {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  score: number | null;
  maxScore: number;
  grade: string | null;
  isDraft: boolean;
}

export interface MarksEntryData {
  exam: {
    id: string;
    name: string;
    type: string;
    isOpen: boolean;
  };
  subject: {
    id: string;
    name: string;
  };
  class: {
    id: string;
    name: string;
    streamName: string | null;
  };
  students: StudentMark[];
  maxScore: number;
  isPublished: boolean;
  isTermActive: boolean;
  canEdit: boolean;
  lockMessage: string | null;
  hasUnsavedChanges: boolean;
  submittedAt: string | null;
}

/**
 * GET /api/class-teacher/marks?classId=xxx&subjectId=xxx&examId=xxx
 * Returns marks data for entry
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const subjectId = searchParams.get('subjectId')
    const examId = searchParams.get('examId')

    if (!classId || !subjectId || !examId) {
      return NextResponse.json(
        { error: 'Class ID, Subject ID, and Exam ID are required' },
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
        { error: 'Access denied. Class teacher role required.' },
        { status: 403 }
      )
    }

    // Get exam details
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        name: true,
        type: true,
        isOpen: true,
        term: {
          select: {
            id: true,
            startDate: true,
            endDate: true
          }
        }
      }
    })

    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      )
    }

    // Get subject details
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        name: true,
        code: true
      }
    })

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      )
    }

    // Get class details
    const classData = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        streams: {
          select: {
            id: true,
            name: true
          },
          take: 1
        }
      }
    })

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Check if term is active
    const today = new Date()
    const isTermActive = today >= exam.term.startDate && today <= exam.term.endDate

    // Get students in the class
    const students = await prisma.student.findMany({
      where: {
        classId,
        schoolId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        marks: {
          where: {
            examId,
            subjectId
          },
          select: {
            id: true,
            score: true,
            maxScore: true,
            grade: true
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    })

    // Build student marks data
    const studentMarks: StudentMark[] = students.map(student => {
      const mark = student.marks[0]
      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        score: mark?.score ?? null,
        maxScore: mark?.maxScore ?? 100,
        grade: mark?.grade ?? null,
        isDraft: false // Marks are saved immediately in this system
      }
    })

    // Determine if editing is allowed
    const canEdit = exam.isOpen && isTermActive
    let lockMessage: string | null = null

    if (!exam.isOpen) {
      lockMessage = 'This exam has been closed. Marks cannot be modified.'
    } else if (!isTermActive) {
      if (today < exam.term.startDate) {
        lockMessage = `The term has not started yet (starts ${exam.term.startDate.toLocaleDateString()}).`
      } else {
        lockMessage = `The term has ended (ended ${exam.term.endDate.toLocaleDateString()}).`
      }
    }

    const marksData: MarksEntryData = {
      exam: {
        id: exam.id,
        name: exam.name,
        type: exam.type,
        isOpen: exam.isOpen
      },
      subject: {
        id: subject.id,
        name: subject.name
      },
      class: {
        id: classData.id,
        name: classData.name,
        streamName: classData.streams[0]?.name ?? null
      },
      students: studentMarks,
      maxScore: 100,
      isPublished: !exam.isOpen,
      isTermActive,
      canEdit,
      lockMessage,
      hasUnsavedChanges: false,
      submittedAt: null
    }

    return NextResponse.json(marksData)

  } catch (error: any) {
    console.error('Error fetching marks data:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch marks data',
        details: 'An unexpected error occurred. Please try refreshing the page.'
      },
      { status: 500 }
    )
  }
}
