import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

/**
 * TEACHER ASSIGNMENTS API
 * 
 * Returns only the assignments for the authenticated teacher.
 * Teachers cannot see other teachers' assignments.
 * This is a filtered view of the truth table for the specific teacher.
 */

interface TeacherAssignment {
  classId: string
  className: string
  level: number
  subjects: {
    subjectId: string
    subjectName: string
    subjectCode: string
    isPrimary: boolean
    isActive: boolean
    studentCount: number
  }[]
}

interface AssignmentStats {
  totalClasses: number
  totalSubjects: number
  primarySubjects: number
  coTeachingSubjects: number
  totalStudents: number
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only teachers can access this endpoint
    if (session.user.role !== Role.TEACHER) {
      return NextResponse.json({ error: 'Access denied - teachers only' }, { status: 403 })
    }

    const teacherId = session.user.id
    const schoolId = session.user.schoolId
    
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    // Get current academic year and term
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isCurrent: true
      }
    })

    if (!currentAcademicYear) {
      return NextResponse.json({ error: 'No current academic year found' }, { status: 400 })
    }

    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYearId: currentAcademicYear.id,
        isCurrent: true
      }
    })

    if (!currentTerm) {
      return NextResponse.json({ error: 'No current term found' }, { status: 400 })
    }

    // Fetch assignments for this teacher only
    const staffAssignments = await prisma.staffSubject.findMany({
      where: {
        termId: currentTerm.id,
        staffId: teacherId,
        staff: {
          schoolId,
          isActive: true
        }
      },
      include: {
        curriculumSubject: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
                isActive: true
              }
            },
            class: {
              select: {
                id: true,
                name: true,
                level: true,
                isActive: true,
                _count: {
                  select: {
                    students: {
                      where: {
                        isActive: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    // Group assignments by class
    const classMap = new Map<string, TeacherAssignment>()
    
    staffAssignments.forEach(assignment => {
      const classId = assignment.curriculumSubject.classId
      const className = assignment.curriculumSubject.class.name
      const classLevel = assignment.curriculumSubject.class.level
      const studentCount = assignment.curriculumSubject.class._count.students
      
      if (!classMap.has(classId)) {
        classMap.set(classId, {
          classId,
          className,
          level: classLevel,
          subjects: []
        })
      }
      
      const classAssignment = classMap.get(classId)!
      classAssignment.subjects.push({
        subjectId: assignment.curriculumSubject.subject.id,
        subjectName: assignment.curriculumSubject.subject.name,
        subjectCode: assignment.curriculumSubject.subject.code,
        isPrimary: assignment.isPrimary,
        isActive: assignment.curriculumSubject.subject.isActive,
        studentCount
      })
    })

    const assignments = Array.from(classMap.values())

    // Calculate statistics
    const totalClasses = assignments.length
    const totalSubjects = assignments.reduce((sum, a) => sum + a.subjects.length, 0)
    const primarySubjects = assignments.reduce((sum, a) => 
      sum + a.subjects.filter(s => s.isPrimary).length, 0
    )
    const coTeachingSubjects = totalSubjects - primarySubjects
    const totalStudents = assignments.reduce((sum, a) => 
      sum + a.subjects.reduce((subSum, s) => subSum + s.studentCount, 0), 0
    )

    const stats: AssignmentStats = {
      totalClasses,
      totalSubjects,
      primarySubjects,
      coTeachingSubjects,
      totalStudents
    }

    return NextResponse.json({
      assignments,
      stats,
      currentTerm: {
        id: currentTerm.id,
        name: currentTerm.name
      },
      currentAcademicYear: {
        id: currentAcademicYear.id,
        name: currentAcademicYear.name
      }
    })

  } catch (error) {
    console.error('Error fetching teacher assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}