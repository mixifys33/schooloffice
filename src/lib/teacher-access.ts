/**
 * Teacher Access Restriction Utilities
 * Requirements: 9.4 - Restrict access to assigned classes and subjects based on RBAC
 */
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

export interface TeacherAssignments {
  staffId: string
  classIds: string[]
  subjectIds: string[]
}

/**
 * Get teacher's assigned classes and subjects
 * Used to filter data access for teachers
 */
export async function getTeacherAssignments(userId: string): Promise<TeacherAssignments | null> {
  const staff = await prisma.staff.findUnique({
    where: { userId },
    include: {
      staffClasses: {
        select: { classId: true },
      },
      staffSubjects: {
        select: { subjectId: true },
      },
    },
  })

  if (!staff) {
    return null
  }

  return {
    staffId: staff.id,
    classIds: staff.staffClasses.map((sc) => sc.classId),
    subjectIds: staff.staffSubjects.map((ss) => ss.subjectId),
  }
}

/**
 * Check if a teacher has access to a specific class
 */
export async function canTeacherAccessClass(userId: string, classId: string): Promise<boolean> {
  const assignments = await getTeacherAssignments(userId)
  if (!assignments) return false
  return assignments.classIds.includes(classId)
}

/**
 * Check if a teacher has access to a specific subject
 */
export async function canTeacherAccessSubject(userId: string, subjectId: string): Promise<boolean> {
  const assignments = await getTeacherAssignments(userId)
  if (!assignments) return false
  return assignments.subjectIds.includes(subjectId)
}

/**
 * Check if a teacher has access to a specific class and subject combination
 */
export async function canTeacherAccessClassSubject(
  userId: string,
  classId: string,
  subjectId: string
): Promise<boolean> {
  const assignments = await getTeacherAssignments(userId)
  if (!assignments) return false
  return assignments.classIds.includes(classId) && assignments.subjectIds.includes(subjectId)
}

/**
 * Filter students by teacher's assigned classes
 * Returns only students in classes the teacher is assigned to
 */
export async function filterStudentsByTeacherAccess(
  userId: string,
  schoolId: string
): Promise<string[]> {
  const assignments = await getTeacherAssignments(userId)
  if (!assignments || assignments.classIds.length === 0) {
    return []
  }

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      classId: { in: assignments.classIds },
    },
    select: { id: true },
  })

  return students.map((s) => s.id)
}

/**
 * Get data access scope based on user role
 * Returns the appropriate filter for data queries
 */
export interface DataAccessScope {
  type: 'all' | 'school' | 'class' | 'own'
  schoolId?: string
  classIds?: string[]
  subjectIds?: string[]
  userId?: string
}

export async function getDataAccessScope(
  userId: string,
  role: Role,
  schoolId: string
): Promise<DataAccessScope> {
  switch (role) {
    case Role.SUPER_ADMIN:
      return { type: 'all' }

    case Role.SCHOOL_ADMIN:
    case Role.DEPUTY:
    case Role.ACCOUNTANT:
      return { type: 'school', schoolId }

    case Role.TEACHER: {
      const assignments = await getTeacherAssignments(userId)
      return {
        type: 'class',
        schoolId,
        classIds: assignments?.classIds || [],
        subjectIds: assignments?.subjectIds || [],
      }
    }

    case Role.STUDENT:
    case Role.PARENT:
      return { type: 'own', schoolId, userId }

    default:
      return { type: 'own', schoolId, userId }
  }
}

/**
 * Apply teacher access filter to a Prisma query
 * Returns the where clause to filter by teacher's assigned classes
 */
export function applyTeacherClassFilter(
  baseWhere: Record<string, unknown>,
  classIds: string[]
): Record<string, unknown> {
  if (classIds.length === 0) {
    // No classes assigned - return impossible condition
    return { ...baseWhere, classId: { in: [] } }
  }
  return { ...baseWhere, classId: { in: classIds } }
}

/**
 * Apply teacher access filter for subjects
 */
export function applyTeacherSubjectFilter(
  baseWhere: Record<string, unknown>,
  subjectIds: string[]
): Record<string, unknown> {
  if (subjectIds.length === 0) {
    return { ...baseWhere, subjectId: { in: [] } }
  }
  return { ...baseWhere, subjectId: { in: subjectIds } }
}

/**
 * Middleware helper to check teacher access in API routes
 */
export async function checkTeacherAccess(
  userId: string,
  role: string,
  resourceType: 'class' | 'subject' | 'student',
  resourceId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Non-teachers have different access rules
  if (role !== 'TEACHER') {
    return { allowed: true }
  }

  const assignments = await getTeacherAssignments(userId)
  if (!assignments) {
    return { allowed: false, reason: 'Teacher profile not found' }
  }

  switch (resourceType) {
    case 'class':
      if (!assignments.classIds.includes(resourceId)) {
        return { allowed: false, reason: 'Not assigned to this class' }
      }
      break

    case 'subject':
      if (!assignments.subjectIds.includes(resourceId)) {
        return { allowed: false, reason: 'Not assigned to this subject' }
      }
      break

    case 'student': {
      // Check if student is in one of teacher's assigned classes
      const student = await prisma.student.findUnique({
        where: { id: resourceId },
        select: { classId: true },
      })
      if (!student || !assignments.classIds.includes(student.classId)) {
        return { allowed: false, reason: 'Student not in assigned class' }
      }
      break
    }
  }

  return { allowed: true }
}
