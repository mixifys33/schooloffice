/**
 * Teacher Marks Management - Classes API Route
 * Progressive filtering: Step 1 - Class Selection
 * 
 * Requirements: 1.1, 1.2, 1.3, 11.1, 11.2
 * - Display only classes where teacher has subject assignments
 * - Filter classes based on teacher role (class teacher vs subject teacher)
 * - Include class metadata (enrollment count, teacher role, subjects)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StudentStatus } from '@/types/enums'

export interface TeacherClassesResponse {
  classes: {
    id: string;
    name: string;
    level: string;
    enrollmentCount: number;
    teacherRole: "CLASS_TEACHER" | "SUBJECT_TEACHER";
    subjects: string[]; // Subject IDs teacher can access
  }[];
}

/**
 * GET /api/teacher/marks/classes
 * Returns classes available for marks entry based on teacher assignments
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/marks/classes - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      console.log('❌ [API] /api/teacher/marks/classes - No session found')
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to access marks management'
      }, { status: 401 })
    }

    // Verify user has appropriate role
    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      console.log('❌ [API] /api/teacher/marks/classes - Invalid role:', userRole)
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
      console.log('❌ [API] /api/teacher/marks/classes - No school context')
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
        firstName: true,
        lastName: true,
        role: true,
        primaryRole: true,
        status: true,
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

    // Get staff subject assignments to determine accessible classes
    const staffSubjects = await prisma.staffSubject.findMany({
      where: { staffId: staff.id },
      include: {
        subject: { 
          select: { 
            id: true, 
            name: true,
            code: true 
          } 
        },
        class: { 
          select: { 
            id: true, 
            name: true,
            level: true,
          } 
        }
      }
    })

    // Get staff class assignments (for class teachers)
    const staffClasses = await prisma.staffClass.findMany({
      where: { staffId: staff.id },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            level: true,
          }
        }
      }
    })

    if (staffSubjects.length === 0 && staffClasses.length === 0) {
      return NextResponse.json({ classes: [] })
    }

    // Build unique classes map
    const classesMap = new Map<string, {
      id: string;
      name: string;
      level: string;
      enrollmentCount: number;
      teacherRole: "CLASS_TEACHER" | "SUBJECT_TEACHER";
      subjects: string[];
    }>()

    // Process subject assignments (regular teacher role)
    for (const staffSubject of staffSubjects) {
      const classId = staffSubject.classId
      const className = staffSubject.class.name
      const classLevel = staffSubject.class.level.toString()

      if (!classesMap.has(classId)) {
        // Get student count for this class
        const enrollmentCount = await prisma.student.count({
          where: {
            classId,
            status: StudentStatus.ACTIVE,
          },
        })

        classesMap.set(classId, {
          id: classId,
          name: className,
          level: classLevel,
          enrollmentCount,
          teacherRole: "SUBJECT_TEACHER",
          subjects: []
        })
      }

      // Add subject to the class
      const classData = classesMap.get(classId)!
      if (!classData.subjects.includes(staffSubject.subjectId)) {
        classData.subjects.push(staffSubject.subjectId)
      }
    }

    // Process class assignments (class teacher role)
    for (const staffClass of staffClasses) {
      const classId = staffClass.classId
      const className = staffClass.class.name
      const classLevel = staffClass.class.level.toString()

      if (!classesMap.has(classId)) {
        // Get student count for this class
        const enrollmentCount = await prisma.student.count({
          where: {
            classId,
            status: StudentStatus.ACTIVE,
          },
        })

        classesMap.set(classId, {
          id: classId,
          name: className,
          level: classLevel,
          enrollmentCount,
          teacherRole: "CLASS_TEACHER",
          subjects: []
        })
      } else {
        // Update role to class teacher if already exists
        const classData = classesMap.get(classId)!
        classData.teacherRole = "CLASS_TEACHER"
      }

      // For class teachers, get all subjects for the class
      const classSubjects = await prisma.classSubject.findMany({
        where: { classId },
        select: { subjectId: true }
      })

      const classData = classesMap.get(classId)!
      for (const classSubject of classSubjects) {
        if (!classData.subjects.includes(classSubject.subjectId)) {
          classData.subjects.push(classSubject.subjectId)
        }
      }
    }

    const classes = Array.from(classesMap.values())

    console.log('✅ [API] /api/teacher/marks/classes - Successfully returning', classes.length, 'classes')
    return NextResponse.json({ classes })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/classes - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch teacher classes',
        details: 'An unexpected error occurred. Please try refreshing the page.'
      },
      { status: 500 }
    )
  }
}