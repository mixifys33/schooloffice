/**
 * Class Teacher Profile API
 * GET - Fetch profile
 * PUT - Update profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'No school context found' }, { status: 400 })
    }

    // Get staff record with all details
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
            role: true,
            activeRole: true,
            lastLogin: true,
          },
        },
        staffSubjects: {
          include: {
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true, code: true } },
          },
        },
        staffClasses: {
          include: {
            class: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!staff) {
      return NextResponse.json({ error: 'No staff profile found' }, { status: 404 })
    }

    // Get current term and academic year
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true, name: true },
    })

    const currentTerm = currentAcademicYear
      ? await prisma.term.findFirst({
          where: {
            academicYearId: currentAcademicYear.id,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
          select: { id: true, name: true, startDate: true, endDate: true },
        })
      : null

    // Get statistics
    const [caEntriesCount, examEntriesCount, evidenceCount] = await Promise.all([
      prisma.cAEntry.count({
        where: { teacherId: staff.id },
      }),
      prisma.examEntry.count({
        where: { teacherId: staff.id },
      }),
      prisma.learningEvidence.count({
        where: { staffId: staff.id },
      }),
    ])

    // Format assignments
    const subjectAssignments = staff.staffSubjects.map(assignment => ({
      classId: assignment.class.id,
      className: assignment.class.name,
      subjectId: assignment.subject.id,
      subjectName: assignment.subject.name,
      subjectCode: assignment.subject.code,
    }))

    const classAssignments = staff.staffClasses.map(assignment => ({
      classId: assignment.class.id,
      className: assignment.class.name,
      isClassTeacher: true,
    }))

    const profile = {
      id: staff.id,
      employeeNumber: staff.employeeNumber,
      firstName: staff.firstName,
      lastName: staff.lastName,
      phone: staff.phone || staff.user.phone,
      email: staff.email || staff.user.email,
      role: staff.role,
      primaryRole: staff.primaryRole,
      secondaryRoles: staff.secondaryRoles,
      department: staff.department || 'Not specified',
      position: staff.primaryRole || 'Teacher',
      hireDate: staff.hireDate,
      status: staff.status,
      lastLogin: staff.user.lastLogin,
      photo: null,
      
      // Assignments
      subjectAssignments,
      classAssignments,
      classTeacherFor: classAssignments.map(ca => ({
        id: ca.classId,
        name: ca.className,
      })),
      subjectsTaught: subjectAssignments.map(sa => ({
        id: sa.subjectId,
        name: sa.subjectName,
        classId: sa.classId,
        className: sa.className,
      })),
      
      // Statistics
      statistics: {
        caEntries: caEntriesCount,
        examEntries: examEntriesCount,
        evidenceFiles: evidenceCount,
        totalClasses: classAssignments.length,
        totalSubjects: subjectAssignments.length,
      },
      
      // Workload (placeholder - would need actual timetable data)
      workload: {
        totalPeriods: subjectAssignments.length * 5, // Estimate: 5 periods per subject
        completedPeriods: 0, // Would need actual attendance/lesson data
        remainingPeriods: subjectAssignments.length * 5,
        classesTaught: classAssignments.length,
        subjectsTaught: subjectAssignments.length,
      },
      
      // Teacher-specific fields
      isTeacher: staff.isTeacher,
      teacherCode: staff.teacherCode,
      qualifications: staff.qualifications,
      subjectsTaught: staff.subjectsTaught,
      classesHandled: staff.classesHandled,
    }

    // Build context
    const context = {
      teacherId: staff.id,
      teacherName: `${staff.firstName} ${staff.lastName}`,
      roleName: staff.primaryRole || 'Class Teacher',
      currentTerm: currentTerm
        ? {
            id: currentTerm.id,
            name: currentTerm.name,
            startDate: currentTerm.startDate.toISOString(),
            endDate: currentTerm.endDate.toISOString(),
          }
        : null,
      academicYear: currentAcademicYear
        ? {
            id: currentAcademicYear.id,
            name: currentAcademicYear.name,
          }
        : null,
      contextError: null,
    }

    return NextResponse.json({ context, profile })

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/profile - GET - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'No school context found' }, { status: 400 })
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
        userId: true,
      },
    })

    if (!staff) {
      return NextResponse.json({ error: 'No staff profile found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const {
      phone,
      email,
      department,
      qualifications,
    } = body

    // Update staff record
    const updatedStaff = await prisma.staff.update({
      where: { id: staff.id },
      data: {
        phone: phone || undefined,
        email: email || undefined,
        department: department || undefined,
        qualifications: qualifications || undefined,
      },
      include: {
        user: {
          select: {
            email: true,
            phone: true,
          },
        },
      },
    })

    // Update user record if email or phone changed
    if (email || phone) {
      await prisma.user.update({
        where: { id: staff.userId },
        data: {
          email: email || undefined,
          phone: phone || undefined,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        id: updatedStaff.id,
        phone: updatedStaff.phone || updatedStaff.user.phone,
        email: updatedStaff.email || updatedStaff.user.email,
        department: updatedStaff.department,
        qualifications: updatedStaff.qualifications,
      },
    })

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/profile - PUT - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to update profile', details: error.message },
      { status: 500 }
    )
  }
}
