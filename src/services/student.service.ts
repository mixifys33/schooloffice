/**
 * Student Service
 * Handles student enrollment and profile management operations
 * Requirements: 4.1, 4.4, 19.1
 */   
import { prisma } from '@/lib/db'
import {
  Student,
  CreateStudentInput,
  UpdateStudentInput,
} from '@/types'
import { PilotType, StudentStatus } from '@/types/enums'

// SMS limits based on pilot type (Requirement 19.1)
const SMS_LIMITS_BY_PILOT_TYPE: Record<PilotType, number> = {
  [PilotType.FREE]: 2,
  [PilotType.PAID]: 20,
}

/**
 * Map Prisma Student to domain Student type
 */
function mapPrismaStudentToDomain(prismaStudent: {
  id: string
  schoolId: string
  admissionNumber: string
  firstName: string
  lastName: string
  dateOfBirth: Date | null
  gender: string | null
  classId: string
  streamId: string | null
  pilotType: string
  smsLimitPerTerm: number
  smsSentCount: number
  photo: string | null
  medicalInfo: string | null
  enrollmentDate: Date
  status: string
  createdAt: Date
  updatedAt: Date
}): Student {
  return {
    id: prismaStudent.id,
    schoolId: prismaStudent.schoolId,
    admissionNumber: prismaStudent.admissionNumber,
    firstName: prismaStudent.firstName,
    lastName: prismaStudent.lastName,
    dateOfBirth: prismaStudent.dateOfBirth ?? undefined,
    gender: prismaStudent.gender as Student['gender'],
    classId: prismaStudent.classId,
    streamId: prismaStudent.streamId ?? undefined,
    pilotType: prismaStudent.pilotType as PilotType,
    smsLimitPerTerm: prismaStudent.smsLimitPerTerm,
    smsSentCount: prismaStudent.smsSentCount,
    photo: prismaStudent.photo ?? undefined,
    medicalInfo: prismaStudent.medicalInfo ?? undefined,
    enrollmentDate: prismaStudent.enrollmentDate,
    status: prismaStudent.status as StudentStatus,
    createdAt: prismaStudent.createdAt,
    updatedAt: prismaStudent.updatedAt,
  }
}

export class StudentService {
  /**
   * Enroll a new student with bio data, class, and stream
   * Requirement 4.1: Create student profile with bio data, assigned class, and stream
   * Requirement 19.1: Assign pilot type (FREE/PAID) with corresponding SMS limits
   */
  async enrollStudent(data: CreateStudentInput): Promise<Student> {
    // Validate school exists
    const school = await prisma.school.findUnique({
      where: { id: data.schoolId },
    })

    if (!school) {
      throw new Error(`School with id ${data.schoolId} not found`)
    }

    // Validate class exists and belongs to the school
    const classRecord = await prisma.class.findUnique({
      where: { id: data.classId },
    })

    if (!classRecord) {
      throw new Error(`Class with id ${data.classId} not found`)
    }

    if (classRecord.schoolId !== data.schoolId) {
      throw new Error('Class does not belong to the specified school')
    }

    // Validate stream if provided
    if (data.streamId) {
      const stream = await prisma.stream.findUnique({
        where: { id: data.streamId },
      })

      if (!stream) {
        throw new Error(`Stream with id ${data.streamId} not found`)
      }

      if (stream.classId !== data.classId) {
        throw new Error('Stream does not belong to the specified class')
      }
    }

    // Check for duplicate admission number in the same school
    const existingStudent = await prisma.student.findFirst({
      where: {
        schoolId: data.schoolId,
        admissionNumber: data.admissionNumber,
      },
    })

    if (existingStudent) {
      throw new Error(`Student with admission number "${data.admissionNumber}" already exists in this school`)
    }

    // Determine pilot type and SMS limit (Requirement 19.1)
    const pilotType = data.pilotType ?? PilotType.FREE
    const smsLimit = SMS_LIMITS_BY_PILOT_TYPE[pilotType]

    const student = await prisma.student.create({
      data: {
        schoolId: data.schoolId,
        admissionNumber: data.admissionNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        classId: data.classId,
        streamId: data.streamId,
        pilotType: pilotType,
        smsLimitPerTerm: smsLimit,
        smsSentCount: 0,
        photo: data.photo,
        medicalInfo: data.medicalInfo,
        enrollmentDate: new Date(),
        status: StudentStatus.ACTIVE,
      },
    })

    return mapPrismaStudentToDomain(student)
  }

  /**
   * Get student by ID
   */
  async getStudentById(id: string): Promise<Student | null> {
    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) return null
    return mapPrismaStudentToDomain(student)
  }

  /**
   * Get student by admission number within a school
   */
  async getStudentByAdmissionNumber(schoolId: string, admissionNumber: string): Promise<Student | null> {
    const student = await prisma.student.findFirst({
      where: {
        schoolId,
        admissionNumber,
      },
    })

    if (!student) return null
    return mapPrismaStudentToDomain(student)
  }

  /**
   * Get all students for a school
   */
  async getStudentsBySchool(schoolId: string): Promise<Student[]> {
    const students = await prisma.student.findMany({
      where: { schoolId },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    return students.map(mapPrismaStudentToDomain)
  }

  /**
   * Get all students in a class
   */
  async getStudentsByClass(classId: string): Promise<Student[]> {
    const students = await prisma.student.findMany({
      where: { classId },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    return students.map(mapPrismaStudentToDomain)
  }

  /**
   * Get all students in a stream
   */
  async getStudentsByStream(streamId: string): Promise<Student[]> {
    const students = await prisma.student.findMany({
      where: { streamId },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    return students.map(mapPrismaStudentToDomain)
  }

  /**
   * Get active students for a school
   */
  async getActiveStudentsBySchool(schoolId: string): Promise<Student[]> {
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        status: StudentStatus.ACTIVE,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    return students.map(mapPrismaStudentToDomain)
  }

  /**
   * Update student information
   * Requirement 4.4: Preserve historical data while allowing updates
   */
  async updateStudent(id: string, data: UpdateStudentInput): Promise<Student> {
    const existingStudent = await prisma.student.findUnique({
      where: { id },
    })

    if (!existingStudent) {
      throw new Error(`Student with id ${id} not found`)
    }

    const updateData: Record<string, unknown> = {}

    if (data.firstName !== undefined) updateData.firstName = data.firstName
    if (data.lastName !== undefined) updateData.lastName = data.lastName
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth
    if (data.gender !== undefined) updateData.gender = data.gender
    if (data.photo !== undefined) updateData.photo = data.photo
    if (data.medicalInfo !== undefined) updateData.medicalInfo = data.medicalInfo

    // Handle class change
    if (data.classId !== undefined && data.classId !== existingStudent.classId) {
      const classRecord = await prisma.class.findUnique({
        where: { id: data.classId },
      })

      if (!classRecord) {
        throw new Error(`Class with id ${data.classId} not found`)
      }

      if (classRecord.schoolId !== existingStudent.schoolId) {
        throw new Error('Class does not belong to the student\'s school')
      }

      updateData.classId = data.classId
      // Clear stream if class changes (stream must belong to new class)
      updateData.streamId = null
    }

    // Handle stream change
    if (data.streamId !== undefined) {
      if (data.streamId === null) {
        updateData.streamId = null
      } else {
        const stream = await prisma.stream.findUnique({
          where: { id: data.streamId },
        })

        if (!stream) {
          throw new Error(`Stream with id ${data.streamId} not found`)
        }

        const targetClassId = (updateData.classId as string) ?? existingStudent.classId
        if (stream.classId !== targetClassId) {
          throw new Error('Stream does not belong to the specified class')
        }

        updateData.streamId = data.streamId
      }
    }

    // Handle pilot type change (Requirement 19.1)
    if (data.pilotType !== undefined && data.pilotType !== existingStudent.pilotType) {
      updateData.pilotType = data.pilotType
      updateData.smsLimitPerTerm = SMS_LIMITS_BY_PILOT_TYPE[data.pilotType]
    }

    // Handle status change (but use dedicated methods for status transitions)
    if (data.status !== undefined) {
      updateData.status = data.status
    }

    const student = await prisma.student.update({
      where: { id },
      data: updateData,
    })

    return mapPrismaStudentToDomain(student)
  }

  /**
   * Transfer a student
   * Requirement 4.4: Archive student record while preserving historical data
   */
  async transferStudent(id: string): Promise<Student> {
    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      throw new Error(`Student with id ${id} not found`)
    }

    if (student.status === StudentStatus.TRANSFERRED) {
      throw new Error('Student is already transferred')
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: { status: StudentStatus.TRANSFERRED },
    })

    return mapPrismaStudentToDomain(updatedStudent)
  }

  /**
   * Graduate a student
   * Requirement 4.4: Archive student record while preserving historical data
   */
  async graduateStudent(id: string): Promise<Student> {
    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      throw new Error(`Student with id ${id} not found`)
    }

    if (student.status === StudentStatus.GRADUATED) {
      throw new Error('Student is already graduated')
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: { status: StudentStatus.GRADUATED },
    })

    return mapPrismaStudentToDomain(updatedStudent)
  }

  /**
   * Suspend a student
   */
  async suspendStudent(id: string): Promise<Student> {
    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      throw new Error(`Student with id ${id} not found`)
    }

    if (student.status === StudentStatus.SUSPENDED) {
      throw new Error('Student is already suspended')
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: { status: StudentStatus.SUSPENDED },
    })

    return mapPrismaStudentToDomain(updatedStudent)
  }

  /**
   * Reactivate a student (from transferred, graduated, or suspended status)
   */
  async reactivateStudent(id: string): Promise<Student> {
    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      throw new Error(`Student with id ${id} not found`)
    }

    if (student.status === StudentStatus.ACTIVE) {
      throw new Error('Student is already active')
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: { status: StudentStatus.ACTIVE },
    })

    return mapPrismaStudentToDomain(updatedStudent)
  }

  /**
   * Update pilot type for a student
   * Requirement 19.1: Assign pilot type with corresponding SMS limits
   */
  async updatePilotType(id: string, pilotType: PilotType): Promise<Student> {
    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      throw new Error(`Student with id ${id} not found`)
    }

    const smsLimit = SMS_LIMITS_BY_PILOT_TYPE[pilotType]

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        pilotType: pilotType,
        smsLimitPerTerm: smsLimit,
      },
    })

    return mapPrismaStudentToDomain(updatedStudent)
  }

  /**
   * Increment SMS sent count for a student
   */
  async incrementSmsSentCount(id: string): Promise<Student> {
    const student = await prisma.student.findUnique({
      where: { id },
    })

    if (!student) {
      throw new Error(`Student with id ${id} not found`)
    }

    const updatedStudent = await prisma.student.update({
      where: { id },
      data: {
        smsSentCount: { increment: 1 },
      },
    })

    return mapPrismaStudentToDomain(updatedStudent)
  }

  /**
   * Reset SMS sent count for all students in a school (called at term end)
   * Requirement 19.5: Reset sms_sent_count to zero for all students
   */
  async resetSmsSentCountForSchool(schoolId: string): Promise<number> {
    const result = await prisma.student.updateMany({
      where: { schoolId },
      data: { smsSentCount: 0 },
    })

    return result.count
  }

  /**
   * Check if student can receive SMS (within limit)
   * Requirement 19.2: Check sms_sent_count against sms_limit_per_term
   */
  async canReceiveSms(id: string): Promise<boolean> {
    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        smsSentCount: true,
        smsLimitPerTerm: true,
      },
    })

    if (!student) {
      throw new Error(`Student with id ${id} not found`)
    }

    return student.smsSentCount < student.smsLimitPerTerm
  }

  /**
   * Get SMS usage for a student
   */
  async getSmsUsage(id: string): Promise<{ sent: number; limit: number; remaining: number }> {
    const student = await prisma.student.findUnique({
      where: { id },
      select: {
        smsSentCount: true,
        smsLimitPerTerm: true,
      },
    })

    if (!student) {
      throw new Error(`Student with id ${id} not found`)
    }

    return {
      sent: student.smsSentCount,
      limit: student.smsLimitPerTerm,
      remaining: Math.max(0, student.smsLimitPerTerm - student.smsSentCount),
    }
  }

  /**
   * Check if admission number is available in a school
   */
  async isAdmissionNumberAvailable(schoolId: string, admissionNumber: string): Promise<boolean> {
    const existing = await prisma.student.findFirst({
      where: {
        schoolId,
        admissionNumber,
      },
      select: { id: true },
    })
    return !existing
  }

  /**
   * Get students by status
   */
  async getStudentsByStatus(schoolId: string, status: StudentStatus): Promise<Student[]> {
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        status,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    return students.map(mapPrismaStudentToDomain)
  }

  /**
   * Get students by pilot type
   */
  async getStudentsByPilotType(schoolId: string, pilotType: PilotType): Promise<Student[]> {
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        pilotType,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    return students.map(mapPrismaStudentToDomain)
  }

  /**
   * Count students by school
   */
  async countStudentsBySchool(schoolId: string): Promise<number> {
    return prisma.student.count({
      where: { schoolId },
    })
  }

  /**
   * Count active students by school
   */
  async countActiveStudentsBySchool(schoolId: string): Promise<number> {
    return prisma.student.count({
      where: {
        schoolId,
        status: StudentStatus.ACTIVE,
      },
    })
  }
}

// Export singleton instance
export const studentService = new StudentService()
