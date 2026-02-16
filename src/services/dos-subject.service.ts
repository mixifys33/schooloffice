import { PrismaClient, SchoolType } from '@prisma/client';

const prisma = new PrismaClient();

export interface SubjectDefinition {
  name: string;
  code: string;
  educationLevel: SchoolType;
}    

export interface ClassSubjectAssignment {
  classId: string;
  subjectIds: string[];
}

export interface SubjectMarkStructure {
  maxMark: number;
  appearsOnReport: boolean;
  affectsPosition: boolean;
}

export interface SubjectTeacherAssignment {
  subjectId: string;
  classId: string;
  teacherId: string;
  isPrimary?: boolean;
}

export class DoSSubjectService {
  
  /**
   * 1. SUBJECT DEFINITION (FOUNDATION)
   * Creates a new subject with minimal required fields only
   */
  async createSubject(
    schoolId: string, 
    dosId: string,
    data: SubjectDefinition
  ) {
    // Validate DoS permission
    await this.validateDoSPermission(dosId, schoolId);
    
    // Check for duplicate code
    const existing = await prisma.subject.findUnique({
      where: { 
        schoolId_code: { 
          schoolId, 
          code: data.code 
        } 
      }
    });
    
    if (existing) {
      throw new Error(`Subject code ${data.code} already exists`);
    }

    return await prisma.subject.create({
      data: {
        schoolId,
        name: data.name,
        code: data.code,
        educationLevel: data.educationLevel,
        isActive: true
      }
    });
  }

  /**
   * 2. CLASS–SUBJECT ASSIGNMENT
   * DoS assigns subjects to classes with mark structure
   */
  async assignSubjectsToClass(
    schoolId: string,
    dosId: string,
    classId: string,
    assignments: { subjectId: string; markStructure: SubjectMarkStructure }[]
  ) {
    await this.validateDoSPermission(dosId, schoolId);
    
    // Verify class belongs to school
    const classExists = await prisma.class.findFirst({
      where: { id: classId, schoolId }
    });
    
    if (!classExists) {
      throw new Error('Class not found');
    }

    // Remove existing assignments for this class
    await prisma.classSubject.deleteMany({
      where: { classId }
    });

    // Create new assignments
    const classSubjects = assignments.map(({ subjectId, markStructure }) => ({
      classId,
      subjectId,
      maxMark: markStructure.maxMark,
      appearsOnReport: markStructure.appearsOnReport,
      affectsPosition: markStructure.affectsPosition
    }));

    await prisma.classSubject.createMany({
      data: classSubjects
    });

    return { success: true, assignedCount: assignments.length };
  }

  /**
   * 3. SUBJECT–TEACHER LINK (CONTROLLED)
   * DoS assigns teachers to subjects per class
   */
  async assignTeacherToSubject(
    schoolId: string,
    dosId: string,
    assignment: SubjectTeacherAssignment
  ) {
    await this.validateDoSPermission(dosId, schoolId);
    
    // Verify subject is assigned to class
    const classSubject = await prisma.classSubject.findUnique({
      where: {
        classId_subjectId: {
          classId: assignment.classId,
          subjectId: assignment.subjectId
        }
      }
    });

    if (!classSubject) {
      throw new Error('This subject is not assigned to this class for this term.');
    }

    // Verify teacher exists and belongs to school
    const teacher = await prisma.staff.findFirst({
      where: { 
        id: assignment.teacherId, 
        schoolId,
        status: 'ACTIVE'
      }
    });

    if (!teacher) {
      throw new Error('Teacher not found or inactive');
    }

    // Remove existing assignment if replacing primary teacher
    if (assignment.isPrimary !== false) {
      await prisma.staffSubject.deleteMany({
        where: {
          subjectId: assignment.subjectId,
          classId: assignment.classId,
          isPrimary: true
        }
      });
    }

    return await prisma.staffSubject.create({
      data: {
        staffId: assignment.teacherId,
        subjectId: assignment.subjectId,
        classId: assignment.classId,
        isPrimary: assignment.isPrimary ?? true,
        assignedBy: dosId
      }
    });
  }

  /**
   * 4. SUBJECT VISIBILITY & LIFE CYCLE
   * Activate/deactivate subjects (never hard delete if marks exist)
   */
  async deactivateSubject(schoolId: string, dosId: string, subjectId: string) {
    await this.validateDoSPermission(dosId, schoolId);
    
    // Check if marks exist
    const marksExist = await prisma.mark.findFirst({
      where: { subjectId }
    });

    if (marksExist) {
      // Soft deactivate only
      return await prisma.subject.update({
        where: { id: subjectId },
        data: { isActive: false }
      });
    } else {
      // Can hard delete if no marks
      return await prisma.subject.delete({
        where: { id: subjectId }
      });
    }
  }

  async activateSubject(schoolId: string, dosId: string, subjectId: string) {
    await this.validateDoSPermission(dosId, schoolId);
    
    return await prisma.subject.update({
      where: { id: subjectId },
      data: { isActive: true }
    });
  }

  /**
   * Get subjects for a class (for teachers - read only)
   */
  async getClassSubjects(schoolId: string, classId: string) {
    return await prisma.classSubject.findMany({
      where: { classId },
      include: {
        subject: {
          where: { 
            schoolId,
            isActive: true 
          }
        }
      }
    });
  }

  /**
   * Get teacher's assigned subjects (for mark entry validation)
   */
  async getTeacherSubjects(teacherId: string, classId?: string) {
    const where: any = { staffId: teacherId };
    if (classId) {
      where.classId = classId;
    }

    return await prisma.staffSubject.findMany({
      where,
      include: {
        subject: {
          where: { isActive: true }
        },
        class: true
      }
    });
  }

  /**
   * Validate teacher can enter marks for subject
   */
  async validateMarkEntry(teacherId: string, subjectId: string, classId: string) {
    const assignment = await prisma.staffSubject.findUnique({
      where: {
        staffId_subjectId_classId: {
          staffId: teacherId,
          subjectId,
          classId
        }
      },
      include: {
        subject: true
      }
    });

    if (!assignment) {
      throw new Error('This subject is not assigned to this class for this term.');
    }

    if (!assignment.subject.isActive) {
      throw new Error('This subject is no longer active.');
    }

    return true;
  }

  /**
   * Get all subjects for DoS management
   */
  async getAllSubjects(schoolId: string, dosId: string) {
    await this.validateDoSPermission(dosId, schoolId);
    
    return await prisma.subject.findMany({
      where: { schoolId },
      include: {
        classSubjects: {
          include: {
            class: true
          }
        },
        staffSubjects: {
          include: {
            staff: true,
            class: true
          }
        }
      },
      orderBy: [
        { educationLevel: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  /**
   * Private helper to validate DoS permission
   */
  private async validateDoSPermission(dosId: string, schoolId: string) {
    const dos = await prisma.staff.findFirst({
      where: {
        id: dosId,
        schoolId,
        role: 'DOS',
        status: 'ACTIVE'
      }
    });

    if (!dos) {
      throw new Error('Only the Director of Studies can manage subjects');
    }

    return dos;
  }
}

export const dosSubjectService = new DoSSubjectService();