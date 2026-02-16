/**
 * Marks Audit Service Unit Tests
 * Tests audit logging functionality for marks management
 * Requirements: 32.1, 32.2
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { marksAuditService, MarksAuditAction } from '@/services/marks-audit.service'
import { prisma } from '@/lib/db'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    marksAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    staff: {
      findUnique: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
    },
    subject: {
      findUnique: vi.fn(),
    },
    class: {
      findUnique: vi.fn(),
    },
    term: {
      findUnique: vi.fn(),
    },
  },
}))

describe('MarksAuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('logAction', () => {
    it('should create audit log entry with enriched metadata', async () => {
      // Mock database responses
      vi.mocked(prisma.staff.findUnique).mockResolvedValue({
        id: 'teacher-1',
        firstName: 'John',
        lastName: 'Doe',
      } as any)

      vi.mocked(prisma.student.findUnique).mockResolvedValue({
        id: 'student-1',
        firstName: 'Jane',
        lastName: 'Smith',
        admissionNumber: 'ADM001',
      } as any)

      vi.mocked(prisma.subject.findUnique).mockResolvedValue({
        id: 'subject-1',
        name: 'Mathematics',
        code: 'MATH',
      } as any)

      vi.mocked(prisma.class.findUnique).mockResolvedValue({
        id: 'class-1',
        name: 'Form 1A',
        level: 'Form 1',
      } as any)

      vi.mocked(prisma.term.findUnique).mockResolvedValue({
        id: 'term-1',
        name: 'Term 1',
      } as any)

      vi.mocked(prisma.marksAuditLog.create).mockResolvedValue({
        id: 'audit-1',
        schoolId: 'school-1',
        entryType: 'CA',
        entryId: 'ca-1',
        studentId: 'student-1',
        subjectId: 'subject-1',
        classId: 'class-1',
        termId: 'term-1',
        action: 'CA_ENTRY_CREATED',
        performedBy: 'teacher-1',
        performedAt: new Date(),
        comments: null,
        metadata: {},
      } as any)

      // Test data
      const auditData = {
        schoolId: 'school-1',
        entryType: 'CA' as const,
        entryId: 'ca-1',
        studentId: 'student-1',
        subjectId: 'subject-1',
        classId: 'class-1',
        termId: 'term-1',
        action: MarksAuditAction.CA_ENTRY_CREATED,
        performedBy: 'teacher-1',
        metadata: {
          caName: 'Assignment 1',
          caType: 'ASSIGNMENT',
          maxScore: 20,
          rawScore: 18,
        },
      }

      // Execute
      const result = await marksAuditService.logAction(auditData)

      // Verify
      expect(prisma.marksAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: 'school-1',
          entryType: 'CA',
          entryId: 'ca-1',
          studentId: 'student-1',
          subjectId: 'subject-1',
          classId: 'class-1',
          termId: 'term-1',
          action: 'CA_ENTRY_CREATED',
          performedBy: 'teacher-1',
          performedAt: expect.any(Date),
          comments: null,
          metadata: expect.objectContaining({
            teacherName: 'John Doe',
            studentName: 'Jane Smith',
            subjectName: 'Mathematics',
            className: 'Form 1A Form 1',
            termName: 'Term 1',
            caName: 'Assignment 1',
            caType: 'ASSIGNMENT',
            maxScore: 20,
            rawScore: 18,
          }),
        }),
      })

      expect(result).toBeDefined()
      expect(result.id).toBe('audit-1')
    })

    it('should handle database errors gracefully during metadata enrichment', async () => {
      // Mock database error
      vi.mocked(prisma.staff.findUnique).mockRejectedValue(new Error('Database error'))
      
      vi.mocked(prisma.marksAuditLog.create).mockResolvedValue({
        id: 'audit-1',
        schoolId: 'school-1',
        entryType: 'CA',
        entryId: 'ca-1',
        studentId: 'student-1',
        subjectId: 'subject-1',
        classId: 'class-1',
        termId: 'term-1',
        action: 'CA_ENTRY_CREATED',
        performedBy: 'teacher-1',
        performedAt: new Date(),
        comments: null,
        metadata: {},
      } as any)

      const auditData = {
        schoolId: 'school-1',
        entryType: 'CA' as const,
        entryId: 'ca-1',
        studentId: 'student-1',
        subjectId: 'subject-1',
        classId: 'class-1',
        termId: 'term-1',
        action: MarksAuditAction.CA_ENTRY_CREATED,
        performedBy: 'teacher-1',
      }

      // Should not throw error, should continue with empty metadata
      const result = await marksAuditService.logAction(auditData)

      expect(result).toBeDefined()
      expect(prisma.marksAuditLog.create).toHaveBeenCalled()
    })
  })

  describe('logCAEntryCreated', () => {
    it('should log CA entry creation with proper action type', async () => {
      vi.mocked(prisma.marksAuditLog.create).mockResolvedValue({
        id: 'audit-1',
        action: 'CA_ENTRY_CREATED',
      } as any)

      const params = {
        schoolId: 'school-1',
        entryId: 'ca-1',
        studentId: 'student-1',
        subjectId: 'subject-1',
        classId: 'class-1',
        termId: 'term-1',
        teacherId: 'teacher-1',
        caData: {
          name: 'Assignment 1',
          type: 'ASSIGNMENT',
          maxScore: 20,
          rawScore: 18,
        },
      }

      await marksAuditService.logCAEntryCreated(params)

      expect(prisma.marksAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CA_ENTRY_CREATED',
          entryType: 'CA',
          entryId: 'ca-1',
          studentId: 'student-1',
          subjectId: 'subject-1',
          classId: 'class-1',
          termId: 'term-1',
          performedBy: 'teacher-1',
          metadata: expect.objectContaining({
            newValue: params.caData,
          }),
        }),
      })
    })
  })

  describe('logExamEntryCreated', () => {
    it('should log exam entry creation with proper action type', async () => {
      vi.mocked(prisma.marksAuditLog.create).mockResolvedValue({
        id: 'audit-1',
        action: 'EXAM_ENTRY_CREATED',
      } as any)

      const params = {
        schoolId: 'school-1',
        entryId: 'exam-1',
        studentId: 'student-1',
        subjectId: 'subject-1',
        classId: 'class-1',
        termId: 'term-1',
        teacherId: 'teacher-1',
        examData: {
          examScore: 85,
          maxScore: 100,
        },
      }

      await marksAuditService.logExamEntryCreated(params)

      expect(prisma.marksAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'EXAM_ENTRY_CREATED',
          entryType: 'EXAM',
          entryId: 'exam-1',
          studentId: 'student-1',
          subjectId: 'subject-1',
          classId: 'class-1',
          termId: 'term-1',
          performedBy: 'teacher-1',
          metadata: expect.objectContaining({
            newValue: params.examData,
          }),
        }),
      })
    })
  })

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with filters', async () => {
      const mockAuditLogs = [
        {
          id: 'audit-1',
          schoolId: 'school-1',
          entryType: 'CA',
          action: 'CA_ENTRY_CREATED',
          performedAt: new Date(),
          metadata: { teacherName: 'John Doe' },
        },
      ]

      vi.mocked(prisma.marksAuditLog.findMany).mockResolvedValue(mockAuditLogs as any)

      const filter = {
        schoolId: 'school-1',
        entryType: 'CA' as const,
      }

      const result = await marksAuditService.getAuditLogs(filter, 50, 0)

      expect(prisma.marksAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: 'school-1',
          entryType: 'CA',
        },
        orderBy: { performedAt: 'desc' },
        take: 50,
        skip: 0,
      })

      expect(result).toHaveLength(1)
      expect(result[0].teacherName).toBe('John Doe')
    })

    it('should handle date range filters', async () => {
      vi.mocked(prisma.marksAuditLog.findMany).mockResolvedValue([])

      const dateFrom = new Date('2024-01-01')
      const dateTo = new Date('2024-01-31')

      await marksAuditService.getAuditLogs({
        schoolId: 'school-1',
        dateFrom,
        dateTo,
      })

      expect(prisma.marksAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          schoolId: 'school-1',
          performedAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        orderBy: { performedAt: 'desc' },
        take: 100,
        skip: 0,
      })
    })
  })

  describe('countAuditLogs', () => {
    it('should count audit logs with filters', async () => {
      vi.mocked(prisma.marksAuditLog.count).mockResolvedValue(25)

      const filter = {
        schoolId: 'school-1',
        action: MarksAuditAction.CA_ENTRY_CREATED,
      }

      const count = await marksAuditService.countAuditLogs(filter)

      expect(prisma.marksAuditLog.count).toHaveBeenCalledWith({
        where: {
          schoolId: 'school-1',
          action: 'CA_ENTRY_CREATED',
        },
      })

      expect(count).toBe(25)
    })
  })
})