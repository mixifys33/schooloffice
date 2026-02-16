/**
 * Class and Stream Service
 * Handles class and stream management operations
 * Requirements: 2.3
 */  
import { prisma } from '@/lib/db'
import type { Class, Subject, Term } from '@/types'

// Define local types since they're not exported from @/types
interface CreateClassInput {
  schoolId: string
  name: string
  level: number
}

interface Stream {
  id: string
  schoolId: string
  classId: string
  name: string
  createdAt: Date
  updatedAt: Date
}

interface CreateStreamInput {
  schoolId: string
  classId: string
  name: string
}

/**
 * Map Prisma Class to domain Class type
 */
function mapPrismaClassToDomain(prismaClass: {
  id: string
  schoolId: string
  name: string
  level: number
  createdAt: Date
  updatedAt: Date
}): Class {
  return {
    id: prismaClass.id,
    schoolId: prismaClass.schoolId,
    name: prismaClass.name,
    level: prismaClass.level,
    createdAt: prismaClass.createdAt,
    updatedAt: prismaClass.updatedAt,
  }
}

/**
 * Map Prisma Stream to domain Stream type
 */
function mapPrismaStreamToDomain(prismaStream: {
  id: string
  schoolId: string
  classId: string
  name: string
  createdAt: Date
  updatedAt: Date
}): Stream {
  return {
    id: prismaStream.id,
    schoolId: prismaStream.schoolId,
    classId: prismaStream.classId,
    name: prismaStream.name,
    createdAt: prismaStream.createdAt,
    updatedAt: prismaStream.updatedAt,
  }
}

/**
 * Map Prisma Subject to domain Subject type
 */
function mapPrismaSubjectToDomain(prismaSubject: {
  id: string
  schoolId: string
  name: string
  code: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): Subject {
  return {
    id: prismaSubject.id,
    schoolId: prismaSubject.schoolId,
    name: prismaSubject.name,
    code: prismaSubject.code,
    createdAt: prismaSubject.createdAt,
    updatedAt: prismaSubject.updatedAt,
  }
}


export class ClassService {
  /**
   * Create a new class
   * Requirement 2.3: Allow creation of classes
   */
  async createClass(data: CreateClassInput): Promise<Class> {
    // Validate school exists
    const school = await prisma.school.findUnique({
      where: { id: data.schoolId },
    })

    if (!school) {
      throw new Error(`School with id ${data.schoolId} not found`)
    }

    // Check for duplicate class name in the same school
    const existingClass = await prisma.class.findFirst({
      where: {
        schoolId: data.schoolId,
        name: data.name,
      },
    })

    if (existingClass) {
      throw new Error(`Class with name "${data.name}" already exists in this school`)
    }

    const classRecord = await prisma.class.create({
      data: {
        schoolId: data.schoolId,
        name: data.name,
        level: data.level,
      },
    })

    return mapPrismaClassToDomain(classRecord)
  }

  /**
   * Get class by ID
   */
  async getClassById(id: string): Promise<Class | null> {
    const classRecord = await prisma.class.findUnique({
      where: { id },
    })

    if (!classRecord) return null
    return mapPrismaClassToDomain(classRecord)
  }

  /**
   * Get all classes for a school
   */
  async getClassesBySchool(schoolId: string): Promise<Class[]> {
    const classes = await prisma.class.findMany({
      where: { schoolId },
      orderBy: { level: 'asc' },
    })

    return classes.map(mapPrismaClassToDomain)
  }

  /**
   * Update a class
   */
  async updateClass(
    id: string,
    data: Partial<Pick<Class, 'name' | 'level'>>
  ): Promise<Class> {
    const existingClass = await prisma.class.findUnique({
      where: { id },
    })

    if (!existingClass) {
      throw new Error(`Class with id ${id} not found`)
    }

    // If name is being updated, check for duplicates
    if (data.name && data.name !== existingClass.name) {
      const duplicateClass = await prisma.class.findFirst({
        where: {
          schoolId: existingClass.schoolId,
          name: data.name,
          id: { not: id },
        },
      })

      if (duplicateClass) {
        throw new Error(`Class with name "${data.name}" already exists in this school`)
      }
    }

    const classRecord = await prisma.class.update({
      where: { id },
      data,
    })

    return mapPrismaClassToDomain(classRecord)
  }

  /**
   * Delete a class (only if it has no students or streams)
   */
  async deleteClass(id: string): Promise<void> {
    // Check for associated students
    const studentCount = await prisma.student.count({
      where: { classId: id },
    })

    if (studentCount > 0) {
      throw new Error('Cannot delete class with existing students')
    }

    // Check for associated streams
    const streamCount = await prisma.stream.count({
      where: { classId: id },
    })

    if (streamCount > 0) {
      throw new Error('Cannot delete class with existing streams')
    }

    // Delete class-subject associations first
    await prisma.classSubject.deleteMany({
      where: { classId: id },
    })

    await prisma.class.delete({
      where: { id },
    })
  }


  // ============================================
  // STREAM MANAGEMENT
  // ============================================

  /**
   * Create a new stream for a class
   * Requirement 2.3: Allow assignment of streams to classes
   */
  async createStream(data: CreateStreamInput): Promise<Stream> {
    // Validate class exists
    const classRecord = await prisma.class.findUnique({
      where: { id: data.classId },
    })

    if (!classRecord) {
      throw new Error(`Class with id ${data.classId} not found`)
    }

    // Check for duplicate stream name in the same class
    const existingStream = await prisma.stream.findFirst({
      where: {
        classId: data.classId,
        name: data.name,
      },
    })

    if (existingStream) {
      throw new Error(`Stream with name "${data.name}" already exists in this class`)
    }

    const stream = await prisma.stream.create({
      data: {
        schoolId: data.schoolId,
        classId: data.classId,
        name: data.name,
      },
    })

    return mapPrismaStreamToDomain(stream)
  }

  /**
   * Get stream by ID
   */
  async getStreamById(id: string): Promise<Stream | null> {
    const stream = await prisma.stream.findUnique({
      where: { id },
    })

    if (!stream) return null
    return mapPrismaStreamToDomain(stream)
  }

  /**
   * Get all streams for a class
   */
  async getStreamsByClass(classId: string): Promise<Stream[]> {
    const streams = await prisma.stream.findMany({
      where: { classId },
      orderBy: { name: 'asc' },
    })

    return streams.map(mapPrismaStreamToDomain)
  }

  /**
   * Update a stream
   */
  async updateStream(
    id: string,
    data: Partial<Pick<Stream, 'name'>>
  ): Promise<Stream> {
    const existingStream = await prisma.stream.findUnique({
      where: { id },
    })

    if (!existingStream) {
      throw new Error(`Stream with id ${id} not found`)
    }

    // If name is being updated, check for duplicates
    if (data.name && data.name !== existingStream.name) {
      const duplicateStream = await prisma.stream.findFirst({
        where: {
          classId: existingStream.classId,
          name: data.name,
          id: { not: id },
        },
      })

      if (duplicateStream) {
        throw new Error(`Stream with name "${data.name}" already exists in this class`)
      }
    }

    const stream = await prisma.stream.update({
      where: { id },
      data,
    })

    return mapPrismaStreamToDomain(stream)
  }

  /**
   * Delete a stream (only if it has no students)
   */
  async deleteStream(id: string): Promise<void> {
    // Check for associated students
    const studentCount = await prisma.student.count({
      where: { streamId: id },
    })

    if (studentCount > 0) {
      throw new Error('Cannot delete stream with existing students')
    }

    await prisma.stream.delete({
      where: { id },
    })
  }


  // ============================================
  // SUBJECT ASSIGNMENT
  // ============================================

  /**
   * Assign subjects to a class
   * Requirement 2.3: Allow assignment of subjects to classes
   */
  async assignSubjectsToClass(classId: string, subjectIds: string[]): Promise<void> {
    // Validate class exists
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
    })

    if (!classRecord) {
      throw new Error(`Class with id ${classId} not found`)
    }

    // Validate all subjects exist and belong to the same school
    const subjects = await prisma.subject.findMany({
      where: {
        id: { in: subjectIds },
        schoolId: classRecord.schoolId,
      },
    })

    if (subjects.length !== subjectIds.length) {
      const foundIds = subjects.map(s => s.id)
      const missingIds = subjectIds.filter(id => !foundIds.includes(id))
      throw new Error(`Subjects not found or not in same school: ${missingIds.join(', ')}`)
    }

    // Remove existing assignments for this class
    await prisma.classSubject.deleteMany({
      where: { classId },
    })

    // Create new assignments
    if (subjectIds.length > 0) {
      await prisma.classSubject.createMany({
        data: subjectIds.map(subjectId => ({
          schoolId: classRecord.schoolId,
          classId,
          subjectId,
        })),
      })
    }
  }

  /**
   * Get subjects assigned to a class
   */
  async getSubjectsByClass(classId: string): Promise<Subject[]> {
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId },
      include: { subject: true },
    })

    return classSubjects.map(cs => mapPrismaSubjectToDomain(cs.subject))
  }

  /**
   * Add a single subject to a class
   */
  async addSubjectToClass(classId: string, subjectId: string): Promise<void> {
    // Validate class exists
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
    })

    if (!classRecord) {
      throw new Error(`Class with id ${classId} not found`)
    }

    // Validate subject exists and belongs to the same school
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    })

    if (!subject) {
      throw new Error(`Subject with id ${subjectId} not found`)
    }

    if (subject.schoolId !== classRecord.schoolId) {
      throw new Error('Subject must belong to the same school as the class')
    }

    // Check if already assigned
    const existingAssignment = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId,
          subjectId,
        },
      },
    })

    if (existingAssignment) {
      throw new Error('Subject is already assigned to this class')
    }

    await prisma.classSubject.create({
      data: {
        schoolId: classRecord.schoolId,
        classId,
        subjectId,
      },
    })
  }

  /**
   * Remove a subject from a class
   */
  async removeSubjectFromClass(classId: string, subjectId: string): Promise<void> {
    const assignment = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId,
          subjectId,
        },
      },
    })

    if (!assignment) {
      throw new Error('Subject is not assigned to this class')
    }

    await prisma.classSubject.delete({
      where: {
        classId_subjectId: {
          classId,
          subjectId,
        },
      },
    })
  }

  /**
   * Get class with streams and subjects
   */
  async getClassWithDetails(id: string): Promise<{
    class: Class
    streams: Stream[]
    subjects: Subject[]
  } | null> {
    const classRecord = await prisma.class.findUnique({
      where: { id },
      include: {
        streams: true,
        classSubjects: {
          include: { subject: true },
        },
      },
    })

    if (!classRecord) return null

    return {
      class: mapPrismaClassToDomain(classRecord),
      streams: classRecord.streams.map(mapPrismaStreamToDomain),
      subjects: classRecord.classSubjects.map(cs => mapPrismaSubjectToDomain(cs.subject)),
    }
  }
}

// Export singleton instance
export const classService = new ClassService()
