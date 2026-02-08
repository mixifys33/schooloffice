/**
 * My Classes Detail API Route for Teacher Section
 * Requirements: Detailed class information for selected class
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StudentStatus } from '@/types/enums'

/**
 * GET /api/teacher/my-classes/[classId]
 * Returns detailed information for a specific class
 */
export async function GET(request: NextRequest, { params }: { params: { classId: string } }) {
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

    const { classId } = params

    // Get teacher record
    const teacher = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Verify teacher is assigned to this class
    const staffSubject = await prisma.staffSubject.findFirst({
      where: {
        staffId: teacher.id,
        classId,
      },
    })

    if (!staffSubject) {
      return NextResponse.json(
        { error: 'You are not assigned to this class' },
        { status: 403 }
      )
    }

    // Get class details
    const classDetails = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          where: { status: StudentStatus.ACTIVE },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
          orderBy: [
            { lastName: 'asc' },
            { firstName: 'asc' },
          ],
        },
      },
    })

    if (!classDetails) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    // Get teacher's subjects for this class
    const teacherSubjects = await prisma.staffSubject.findMany({
      where: {
        staffId: teacher.id,
        classId,
      },
      include: {
        subject: true,
      },
    })

    // Get assessments for this class and teacher's subjects
    const assessments = await prisma.teacherAssessment.findMany({
      where: {
        classId,
        staffId: teacher.id,
        subjectId: { in: teacherSubjects.map(ts => ts.subjectId) },
      },
      include: {
        subject: true,
      },
    })

    // Get learning evidence for this class
    const learningEvidence = await prisma.learningEvidence.findMany({
      where: {
        classId,
        staffId: teacher.id,
      },
      include: {
        subject: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      },
    })

    const classDetail = {
      id: classDetails.id,
      name: classDetails.name,
      studentCount: classDetails.students.length,
      students: classDetails.students,
      subjects: teacherSubjects.map(ts => ({
        id: ts.subjectId,
        name: ts.subject.name,
      })),
      assessments: assessments.map(a => ({
        id: a.id,
        name: a.name,
        type: a.assessmentType,
        subject: a.subject.name,
        maxScore: a.maxScore,
        dateAssigned: a.dateAssigned,
        dueDate: a.dueDate,
        isLocked: a.isLocked,
      })),
      learningEvidence: learningEvidence.map(le => ({
        id: le.id,
        title: le.title,
        type: le.evidenceType,
        subject: le.subject.name,
        student: le.student ? `${le.student.firstName} ${le.student.lastName}` : 'General',
        uploadedAt: le.uploadedAt,
      })),
    }

    return NextResponse.json(classDetail)
  } catch (error) {
    console.error('Error fetching class detail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class detail' },
      { status: 500 }
    )
  }
}