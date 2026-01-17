/**
 * Property Test: Marks Entry Authorization
 * **Feature: school-office, Property 13: Marks Entry Authorization**
 * **Validates: Requirements 7.2, 7.4**
 * 
 * For any marks entry attempt, it SHALL succeed only if the teacher is assigned 
 * to that subject AND class AND the exam is open.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// ============================================
// TYPES FOR TESTING
// ============================================

interface Teacher {
  id: string
  schoolId: string
  name: string
}

interface Subject {
  id: string
  schoolId: string
  name: string
  code: string
}

interface Class {
  id: string
  schoolId: string
  name: string
  level: number
}

interface Student {
  id: string
  schoolId: string
  classId: string
  name: string
}

interface Exam {
  id: string
  schoolId: string
  termId: string
  name: string
  type: 'BOT' | 'MID' | 'EOT' | 'CA'
  isOpen: boolean
}

interface StaffSubjectAssignment {
  staffId: string
  subjectId: string
}

interface StaffClassAssignment {
  staffId: string
  classId: string
}

interface Mark {
  id: string
  examId: string
  studentId: string
  subjectId: string
  score: number
  maxScore: number
  enteredBy: string
}

interface MarksEntryValidationResult {
  authorized: boolean
  error?: string
  teacherAssignedToSubject: boolean
  teacherAssignedToClass: boolean
  examIsOpen: boolean
}

// ============================================
// SIMULATED STORES WITH VALIDATION
// ============================================

class ExaminationStore {
  private teachers: Map<string, Teacher> = new Map()
  private subjects: Map<string, Subject> = new Map()
  private classes: Map<string, Class> = new Map()
  private students: Map<string, Student> = new Map()
  private exams: Map<string, Exam> = new Map()
  private staffSubjects: StaffSubjectAssignment[] = []
  private staffClasses: StaffClassAssignment[] = []
  private marks: Map<string, Mark> = new Map()

  addTeacher(teacher: Teacher): void {
    this.teachers.set(teacher.id, teacher)
  }

  addSubject(subject: Subject): void {
    this.subjects.set(subject.id, subject)
  }

  addClass(cls: Class): void {
    this.classes.set(cls.id, cls)
  }

  addStudent(student: Student): void {
    this.students.set(student.id, student)
  }

  addExam(exam: Exam): void {
    this.exams.set(exam.id, exam)
  }

  assignTeacherToSubject(staffId: string, subjectId: string): void {
    if (!this.staffSubjects.some(a => a.staffId === staffId && a.subjectId === subjectId)) {
      this.staffSubjects.push({ staffId, subjectId })
    }
  }

  assignTeacherToClass(staffId: string, classId: string): void {
    if (!this.staffClasses.some(a => a.staffId === staffId && a.classId === classId)) {
      this.staffClasses.push({ staffId, classId })
    }
  }

  isTeacherAssignedToSubject(teacherId: string, subjectId: string): boolean {
    return this.staffSubjects.some(
      a => a.staffId === teacherId && a.subjectId === subjectId
    )
  }

  isTeacherAssignedToClass(teacherId: string, classId: string): boolean {
    return this.staffClasses.some(
      a => a.staffId === teacherId && a.classId === classId
    )
  }

  isExamOpen(examId: string): boolean {
    const exam = this.exams.get(examId)
    return exam?.isOpen ?? false
  }

  openExam(examId: string): void {
    const exam = this.exams.get(examId)
    if (exam) {
      exam.isOpen = true
    }
  }

  closeExam(examId: string): void {
    const exam = this.exams.get(examId)
    if (exam) {
      exam.isOpen = false
    }
  }

  getStudent(studentId: string): Student | undefined {
    return this.students.get(studentId)
  }


  /**
   * Validate marks entry authorization
   * Property 13: Marks entry SHALL succeed only if:
   * - Teacher is assigned to the subject
   * - Teacher is assigned to the class
   * - Exam is open
   */
  validateMarksEntry(
    teacherId: string,
    examId: string,
    subjectId: string,
    classId: string
  ): MarksEntryValidationResult {
    const examIsOpen = this.isExamOpen(examId)
    const teacherAssignedToSubject = this.isTeacherAssignedToSubject(teacherId, subjectId)
    const teacherAssignedToClass = this.isTeacherAssignedToClass(teacherId, classId)

    const authorized = examIsOpen && teacherAssignedToSubject && teacherAssignedToClass

    let error: string | undefined
    if (!examIsOpen) {
      error = 'Exam is closed for marks entry'
    } else if (!teacherAssignedToSubject) {
      error = 'Teacher is not assigned to this subject'
    } else if (!teacherAssignedToClass) {
      error = 'Teacher is not assigned to this class'
    }

    return {
      authorized,
      error,
      teacherAssignedToSubject,
      teacherAssignedToClass,
      examIsOpen,
    }
  }

  /**
   * Enter marks for a student
   * Enforces Property 13: Authorization check before entry
   */
  enterMark(
    teacherId: string,
    examId: string,
    studentId: string,
    subjectId: string,
    score: number,
    maxScore: number
  ): { success: boolean; error?: string; mark?: Mark } {
    const student = this.getStudent(studentId)
    if (!student) {
      return { success: false, error: 'Student not found' }
    }

    const validation = this.validateMarksEntry(teacherId, examId, subjectId, student.classId)

    if (!validation.authorized) {
      return { success: false, error: validation.error }
    }

    // Validate score
    if (score < 0 || score > maxScore) {
      return { success: false, error: 'Invalid score' }
    }

    const markId = `${examId}-${studentId}-${subjectId}`
    const mark: Mark = {
      id: markId,
      examId,
      studentId,
      subjectId,
      score,
      maxScore,
      enteredBy: teacherId,
    }

    this.marks.set(markId, mark)
    return { success: true, mark }
  }

  getMark(examId: string, studentId: string, subjectId: string): Mark | undefined {
    const markId = `${examId}-${studentId}-${subjectId}`
    return this.marks.get(markId)
  }

  getAllMarks(): Mark[] {
    return Array.from(this.marks.values())
  }
}

// ============================================
// ARBITRARIES FOR GENERATING TEST DATA
// ============================================

const teacherArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
})

const subjectArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  code: fc.string({ minLength: 2, maxLength: 10 }),
})

const classArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  level: fc.integer({ min: 1, max: 12 }),
})

const studentArbitrary = (classId: string) => fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  classId: fc.constant(classId),
  name: fc.string({ minLength: 1, maxLength: 50 }),
})

const examArbitrary = fc.record({
  id: fc.uuid(),
  schoolId: fc.uuid(),
  termId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  type: fc.constantFrom('BOT' as const, 'MID' as const, 'EOT' as const, 'CA' as const),
  isOpen: fc.boolean(),
})

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 13: Marks Entry Authorization', () => {
  /**
   * Property: Teacher not assigned to subject cannot enter marks
   */
  it('teacher not assigned to subject cannot enter marks', () => {
    fc.assert(
      fc.property(
        teacherArbitrary,
        subjectArbitrary,
        classArbitrary,
        examArbitrary,
        fc.integer({ min: 0, max: 100 }),
        (teacher, subject, cls, exam, score) => {
          const store = new ExaminationStore()
          
          store.addTeacher(teacher)
          store.addSubject(subject)
          store.addClass(cls)
          store.addExam({ ...exam, isOpen: true }) // Ensure exam is open
          
          // Create a student in the class
          const student = {
            id: fc.sample(fc.uuid(), 1)[0],
            schoolId: cls.schoolId,
            classId: cls.id,
            name: 'Test Student',
          }
          store.addStudent(student)
          
          // Assign teacher to class but NOT to subject
          store.assignTeacherToClass(teacher.id, cls.id)
          // NOT assigning to subject: store.assignTeacherToSubject(teacher.id, subject.id)
          
          const result = store.enterMark(
            teacher.id,
            exam.id,
            student.id,
            subject.id,
            score,
            100
          )
          
          // Should fail because teacher is not assigned to subject
          return result.success === false && 
                 result.error?.includes('not assigned to this subject')
        }
      ),
      { numRuns: 20 }
    )
  })


  /**
   * Property: Teacher not assigned to class cannot enter marks
   */
  it('teacher not assigned to class cannot enter marks', () => {
    fc.assert(
      fc.property(
        teacherArbitrary,
        subjectArbitrary,
        classArbitrary,
        examArbitrary,
        fc.integer({ min: 0, max: 100 }),
        (teacher, subject, cls, exam, score) => {
          const store = new ExaminationStore()
          
          store.addTeacher(teacher)
          store.addSubject(subject)
          store.addClass(cls)
          store.addExam({ ...exam, isOpen: true }) // Ensure exam is open
          
          // Create a student in the class
          const student = {
            id: fc.sample(fc.uuid(), 1)[0],
            schoolId: cls.schoolId,
            classId: cls.id,
            name: 'Test Student',
          }
          store.addStudent(student)
          
          // Assign teacher to subject but NOT to class
          store.assignTeacherToSubject(teacher.id, subject.id)
          // NOT assigning to class: store.assignTeacherToClass(teacher.id, cls.id)
          
          const result = store.enterMark(
            teacher.id,
            exam.id,
            student.id,
            subject.id,
            score,
            100
          )
          
          // Should fail because teacher is not assigned to class
          return result.success === false && 
                 result.error?.includes('not assigned to this class')
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Marks cannot be entered when exam is closed
   */
  it('marks cannot be entered when exam is closed', () => {
    fc.assert(
      fc.property(
        teacherArbitrary,
        subjectArbitrary,
        classArbitrary,
        examArbitrary,
        fc.integer({ min: 0, max: 100 }),
        (teacher, subject, cls, exam, score) => {
          const store = new ExaminationStore()
          
          store.addTeacher(teacher)
          store.addSubject(subject)
          store.addClass(cls)
          store.addExam({ ...exam, isOpen: false }) // Exam is closed
          
          // Create a student in the class
          const student = {
            id: fc.sample(fc.uuid(), 1)[0],
            schoolId: cls.schoolId,
            classId: cls.id,
            name: 'Test Student',
          }
          store.addStudent(student)
          
          // Assign teacher to both subject and class
          store.assignTeacherToSubject(teacher.id, subject.id)
          store.assignTeacherToClass(teacher.id, cls.id)
          
          const result = store.enterMark(
            teacher.id,
            exam.id,
            student.id,
            subject.id,
            score,
            100
          )
          
          // Should fail because exam is closed
          return result.success === false && 
                 result.error?.includes('closed')
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Authorized teacher can enter marks when exam is open
   */
  it('authorized teacher can enter marks when exam is open', () => {
    fc.assert(
      fc.property(
        teacherArbitrary,
        subjectArbitrary,
        classArbitrary,
        examArbitrary,
        fc.integer({ min: 0, max: 100 }),
        (teacher, subject, cls, exam, score) => {
          const store = new ExaminationStore()
          
          store.addTeacher(teacher)
          store.addSubject(subject)
          store.addClass(cls)
          store.addExam({ ...exam, isOpen: true }) // Exam is open
          
          // Create a student in the class
          const student = {
            id: fc.sample(fc.uuid(), 1)[0],
            schoolId: cls.schoolId,
            classId: cls.id,
            name: 'Test Student',
          }
          store.addStudent(student)
          
          // Assign teacher to both subject and class
          store.assignTeacherToSubject(teacher.id, subject.id)
          store.assignTeacherToClass(teacher.id, cls.id)
          
          const result = store.enterMark(
            teacher.id,
            exam.id,
            student.id,
            subject.id,
            score,
            100
          )
          
          // Should succeed because all conditions are met
          return result.success === true && result.mark !== undefined
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Validation result correctly reflects all authorization conditions
   */
  it('validation result correctly reflects all authorization conditions', () => {
    fc.assert(
      fc.property(
        teacherArbitrary,
        subjectArbitrary,
        classArbitrary,
        examArbitrary,
        fc.boolean(), // assignToSubject
        fc.boolean(), // assignToClass
        (teacher, subject, cls, exam, assignToSubject, assignToClass) => {
          const store = new ExaminationStore()
          
          store.addTeacher(teacher)
          store.addSubject(subject)
          store.addClass(cls)
          store.addExam(exam)
          
          if (assignToSubject) {
            store.assignTeacherToSubject(teacher.id, subject.id)
          }
          if (assignToClass) {
            store.assignTeacherToClass(teacher.id, cls.id)
          }
          
          const validation = store.validateMarksEntry(
            teacher.id,
            exam.id,
            subject.id,
            cls.id
          )
          
          // Verify validation result matches actual state
          const expectedAuthorized = exam.isOpen && assignToSubject && assignToClass
          
          return (
            validation.teacherAssignedToSubject === assignToSubject &&
            validation.teacherAssignedToClass === assignToClass &&
            validation.examIsOpen === exam.isOpen &&
            validation.authorized === expectedAuthorized
          )
        }
      ),
      { numRuns: 20 }
    )
  })


  /**
   * Property: Opening a closed exam enables marks entry
   */
  it('opening a closed exam enables marks entry', () => {
    fc.assert(
      fc.property(
        teacherArbitrary,
        subjectArbitrary,
        classArbitrary,
        examArbitrary,
        fc.integer({ min: 0, max: 100 }),
        (teacher, subject, cls, exam, score) => {
          const store = new ExaminationStore()
          
          store.addTeacher(teacher)
          store.addSubject(subject)
          store.addClass(cls)
          store.addExam({ ...exam, isOpen: false }) // Start with closed exam
          
          // Create a student in the class
          const student = {
            id: fc.sample(fc.uuid(), 1)[0],
            schoolId: cls.schoolId,
            classId: cls.id,
            name: 'Test Student',
          }
          store.addStudent(student)
          
          // Assign teacher to both subject and class
          store.assignTeacherToSubject(teacher.id, subject.id)
          store.assignTeacherToClass(teacher.id, cls.id)
          
          // First attempt should fail (exam closed)
          const firstResult = store.enterMark(
            teacher.id,
            exam.id,
            student.id,
            subject.id,
            score,
            100
          )
          
          // Open the exam
          store.openExam(exam.id)
          
          // Second attempt should succeed
          const secondResult = store.enterMark(
            teacher.id,
            exam.id,
            student.id,
            subject.id,
            score,
            100
          )
          
          return firstResult.success === false && secondResult.success === true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Closing an open exam prevents further marks entry
   */
  it('closing an open exam prevents further marks entry', () => {
    fc.assert(
      fc.property(
        teacherArbitrary,
        subjectArbitrary,
        classArbitrary,
        examArbitrary,
        fc.integer({ min: 0, max: 100 }),
        (teacher, subject, cls, exam, score) => {
          const store = new ExaminationStore()
          
          store.addTeacher(teacher)
          store.addSubject(subject)
          store.addClass(cls)
          store.addExam({ ...exam, isOpen: true }) // Start with open exam
          
          // Create two students in the class
          const student1 = {
            id: fc.sample(fc.uuid(), 1)[0],
            schoolId: cls.schoolId,
            classId: cls.id,
            name: 'Test Student 1',
          }
          const student2 = {
            id: fc.sample(fc.uuid(), 1)[0],
            schoolId: cls.schoolId,
            classId: cls.id,
            name: 'Test Student 2',
          }
          store.addStudent(student1)
          store.addStudent(student2)
          
          // Assign teacher to both subject and class
          store.assignTeacherToSubject(teacher.id, subject.id)
          store.assignTeacherToClass(teacher.id, cls.id)
          
          // First entry should succeed (exam open)
          const firstResult = store.enterMark(
            teacher.id,
            exam.id,
            student1.id,
            subject.id,
            score,
            100
          )
          
          // Close the exam
          store.closeExam(exam.id)
          
          // Second entry should fail (exam closed)
          const secondResult = store.enterMark(
            teacher.id,
            exam.id,
            student2.id,
            subject.id,
            score,
            100
          )
          
          return firstResult.success === true && secondResult.success === false
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: All successful marks entries have authorized teachers
   */
  it('all successful marks entries have authorized teachers', () => {
    fc.assert(
      fc.property(
        fc.array(teacherArbitrary, { minLength: 1, maxLength: 3 }),
        fc.array(subjectArbitrary, { minLength: 1, maxLength: 3 }),
        fc.array(classArbitrary, { minLength: 1, maxLength: 2 }),
        examArbitrary,
        (teachers, subjects, classes, exam) => {
          const store = new ExaminationStore()
          
          // Add all entities
          teachers.forEach(t => store.addTeacher(t))
          subjects.forEach(s => store.addSubject(s))
          classes.forEach(c => store.addClass(c))
          store.addExam({ ...exam, isOpen: true })
          
          // Create students for each class
          const students: Student[] = []
          classes.forEach(cls => {
            const student = {
              id: fc.sample(fc.uuid(), 1)[0],
              schoolId: cls.schoolId,
              classId: cls.id,
              name: `Student in ${cls.name}`,
            }
            store.addStudent(student)
            students.push(student)
          })
          
          // Randomly assign some teachers to some subjects and classes
          teachers.forEach((teacher, i) => {
            if (i % 2 === 0 && subjects.length > 0) {
              store.assignTeacherToSubject(teacher.id, subjects[i % subjects.length].id)
            }
            if (i % 2 === 0 && classes.length > 0) {
              store.assignTeacherToClass(teacher.id, classes[i % classes.length].id)
            }
          })
          
          // Try all combinations of marks entry
          teachers.forEach(teacher => {
            subjects.forEach(subject => {
              students.forEach(student => {
                store.enterMark(
                  teacher.id,
                  exam.id,
                  student.id,
                  subject.id,
                  50,
                  100
                )
              })
            })
          })
          
          // Verify: all marks in the store were entered by authorized teachers
          const allMarks = store.getAllMarks()
          
          for (const mark of allMarks) {
            const student = store.getStudent(mark.studentId)
            if (!student) continue
            
            const validation = store.validateMarksEntry(
              mark.enteredBy,
              mark.examId,
              mark.subjectId,
              student.classId
            )
            
            // Every mark should have been entered by an authorized teacher
            // (since unauthorized entries are rejected)
            if (!validation.teacherAssignedToSubject || !validation.teacherAssignedToClass) {
              return false
            }
          }
          
          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Authorization is checked per subject-class combination
   */
  it('authorization is checked per subject-class combination', () => {
    fc.assert(
      fc.property(
        teacherArbitrary,
        fc.array(subjectArbitrary, { minLength: 2, maxLength: 3 }),
        fc.array(classArbitrary, { minLength: 2, maxLength: 3 }),
        examArbitrary,
        (teacher, subjects, classes, exam) => {
          const store = new ExaminationStore()
          
          store.addTeacher(teacher)
          subjects.forEach(s => store.addSubject(s))
          classes.forEach(c => store.addClass(c))
          store.addExam({ ...exam, isOpen: true })
          
          // Assign teacher to only the first subject and first class
          if (subjects.length > 0) {
            store.assignTeacherToSubject(teacher.id, subjects[0].id)
          }
          if (classes.length > 0) {
            store.assignTeacherToClass(teacher.id, classes[0].id)
          }
          
          // Create students in each class
          const students: Student[] = []
          classes.forEach(cls => {
            const student = {
              id: fc.sample(fc.uuid(), 1)[0],
              schoolId: cls.schoolId,
              classId: cls.id,
              name: `Student in ${cls.name}`,
            }
            store.addStudent(student)
            students.push(student)
          })
          
          // Verify authorization for each combination
          let allCorrect = true
          
          subjects.forEach((subject, si) => {
            classes.forEach((cls, ci) => {
              const validation = store.validateMarksEntry(
                teacher.id,
                exam.id,
                subject.id,
                cls.id
              )
              
              const expectedSubjectAuth = si === 0 // Only first subject
              const expectedClassAuth = ci === 0   // Only first class
              const expectedAuthorized = expectedSubjectAuth && expectedClassAuth
              
              if (
                validation.teacherAssignedToSubject !== expectedSubjectAuth ||
                validation.teacherAssignedToClass !== expectedClassAuth ||
                validation.authorized !== expectedAuthorized
              ) {
                allCorrect = false
              }
            })
          })
          
          return allCorrect
        }
      ),
      { numRuns: 20 }
    )
  })
})
