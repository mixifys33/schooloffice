import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

/**
 * ASSIGNMENTS TRUTH TABLE API
 * 
 * This endpoint provides the definitive source of who teaches what to whom.
 * It returns data in two views: Teacher-centric and Class-centric.
 * 
 * Core Principle: OWNERSHIP
 * - Makes teaching responsibility explicit, visible, and undisputable
 * - Admin owns staffing, DoS owns academics, Teachers view only
 */

interface TeacherAssignment {
  teacherId: string
  teacherName: string
  employeeNumber: string
  assignments: {
    classId: string
    className: string
    subjects: {
      subjectId: string
      subjectName: string
      subjectCode: string
      isPrimary: boolean
      isActive: boolean
    }[]
  }[]
}

interface ClassAssignment {
  classId: string
  className: string
  level: number
  subjects: {
    subjectId: string
    subjectName: string
    subjectCode: string
    primaryTeacher: {
      id: string
      name: string
      employeeNumber: string
    } | null
    coTeacher?: {
      id: string
      name: string
      employeeNumber: string
    }
    isActive: boolean
    hasConflict: boolean
  }[]
}

interface AssignmentStats {
  totalTeachers: number
  totalClasses: number
  totalSubjects: number
  assignedSubjects: number
  unassignedSubjects: number
  conflictCount: number
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin, School Admin, and DoS can access the truth table
    const allowedRoles = [Role.ADMIN, Role.SCHOOL_ADMIN, Role.DOS]
    if (!allowedRoles.includes(session.user.role as Role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

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

    // Fetch all staff assignments for the current term
    const staffAssignments = await prisma.staffSubject.findMany({
      where: {
        termId: currentTerm.id,
        staff: {
          schoolId,
          isActive: true
        }
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
            nationalId: true
          }
        },
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
            isActive: true
          }
        }
      }
    })

    // Get all active classes for the school
    const allClasses = await prisma.class.findMany({
      where: {
        schoolId,
        isActive: true
      },
      include: {
        curriculumSubjects: {
          where: {
            isActive: true
          },
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
                isActive: true
              }
            }
          }
        }
      }
    })

    // Build Teacher-Centric View
    const teacherMap = new Map<string, TeacherAssignment>()
    
    staffAssignments.forEach(assignment => {
      const teacherId = assignment.staff.id
      const teacherName = `${assignment.staff.firstName} ${assignment.staff.lastName}`
      const employeeNumber = assignment.staff.employeeNumber || assignment.staff.nationalId || 'N/A'
      
      if (!teacherMap.has(teacherId)) {
        teacherMap.set(teacherId, {
          teacherId,
          teacherName,
          employeeNumber,
          assignments: []
        })
      }
      
      const teacher = teacherMap.get(teacherId)!
      let classAssignment = teacher.assignments.find(a => a.classId === assignment.classId)
      
      if (!classAssignment) {
        classAssignment = {
          classId: assignment.classId,
          className: assignment.class.name,
          subjects: []
        }
        teacher.assignments.push(classAssignment)
      }
      
      classAssignment.subjects.push({
        subjectId: assignment.subject.id,
        subjectName: assignment.subject.name,
        subjectCode: assignment.subject.code,
        isPrimary: assignment.isPrimary,
        isActive: assignment.subject.isActive
      })
    })

    // Build Class-Centric View
    const classAssignments: ClassAssignment[] = allClasses.map(classData => {
      const subjects = classData.curriculumSubjects.map(curriculumSubject => {
        // Find all assignments for this class-subject combination
        const assignments = staffAssignments.filter(sa => 
          sa.classId === classData.id && 
          sa.subjectId === curriculumSubject.subject.id
        )
        
        const primaryAssignment = assignments.find(a => a.isPrimary)
        const coAssignment = assignments.find(a => !a.isPrimary)
        
        // Check for conflicts (multiple primary teachers or no primary teacher but has assignments)
        const primaryCount = assignments.filter(a => a.isPrimary).length
        const hasConflict = primaryCount > 1 || (assignments.length > 0 && primaryCount === 0)
        
        return {
          subjectId: curriculumSubject.subject.id,
          subjectName: curriculumSubject.subject.name,
          subjectCode: curriculumSubject.subject.code,
          primaryTeacher: primaryAssignment ? {
            id: primaryAssignment.staff.id,
            name: `${primaryAssignment.staff.firstName} ${primaryAssignment.staff.lastName}`,
            employeeNumber: primaryAssignment.staff.employeeNumber || primaryAssignment.staff.nationalId || 'N/A'
          } : null,
          coTeacher: coAssignment ? {
            id: coAssignment.staff.id,
            name: `${coAssignment.staff.firstName} ${coAssignment.staff.lastName}`,
            employeeNumber: coAssignment.staff.employeeNumber || coAssignment.staff.nationalId || 'N/A'
          } : undefined,
          isActive: curriculumSubject.subject.isActive,
          hasConflict
        }
      })
      
      return {
        classId: classData.id,
        className: classData.name,
        level: classData.level,
        subjects
      }
    })

    // Calculate Statistics
    const totalTeachers = teacherMap.size
    const totalClasses = allClasses.length
    const totalSubjects = allClasses.reduce((sum, c) => sum + c.curriculumSubjects.length, 0)
    const assignedSubjects = classAssignments.reduce((sum, c) => 
      sum + c.subjects.filter(s => s.primaryTeacher).length, 0
    )
    const unassignedSubjects = totalSubjects - assignedSubjects
    const conflictCount = classAssignments.reduce((sum, c) => 
      sum + c.subjects.filter(s => s.hasConflict).length, 0
    )

    const stats: AssignmentStats = {
      totalTeachers,
      totalClasses,
      totalSubjects,
      assignedSubjects,
      unassignedSubjects,
      conflictCount
    }

    return NextResponse.json({
      teacherAssignments: Array.from(teacherMap.values()),
      classAssignments,
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
    console.error('Error fetching assignments truth table:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}