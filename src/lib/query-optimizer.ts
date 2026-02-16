/**
 * Database Query Optimizer
 * Optimizes Prisma queries for large datasets
 * Requirements: 22.1, 22.4, 22.5
 */

import { Prisma } from '@prisma/client';

/**
 * Optimized query configuration for student marks data
 */
export const optimizedStudentMarksQuery = {
  // Select only necessary fields to reduce data transfer
  studentSelect: {
    id: true,
    firstName: true,
    lastName: true,
    admissionNumber: true,
    // Exclude unnecessary fields like dateOfBirth, address, etc.
  } as Prisma.StudentSelect,

  // Optimized CA entry selection
  caEntrySelect: {
    id: true,
    studentId: true,
    subjectId: true,
    teacherId: true,
    termId: true,
    name: true,
    type: true,
    maxScore: true,
    rawScore: true,
    date: true,
    competencyId: true,
    competencyComment: true,
    status: true,
    submittedAt: true,
    approvedAt: true,
    approvedBy: true,
    createdAt: true,
    updatedAt: true,
  } as Prisma.CAEntrySelect,

  // Optimized exam entry selection
  examEntrySelect: {
    id: true,
    studentId: true,
    subjectId: true,
    teacherId: true,
    termId: true,
    examScore: true,
    maxScore: true,
    examDate: true,
    status: true,
    submittedAt: true,
    approvedAt: true,
    approvedBy: true,
    createdAt: true,
    updatedAt: true,
  } as Prisma.ExamEntrySelect,
};

/**
 * Pagination configuration for large datasets
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

/**
 * Calculate pagination parameters
 */
export const calculatePagination = (
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): { skip: number; take: number } => {
  const validPageSize = Math.min(Math.max(1, pageSize), MAX_PAGE_SIZE);
  const validPage = Math.max(1, page);
  
  return {
    skip: (validPage - 1) * validPageSize,
    take: validPageSize,
  };
};

/**
 * Batch query helper for processing large datasets
 */
export const batchQuery = async <T>(
  items: string[],
  batchSize: number,
  queryFn: (batch: string[]) => Promise<T[]>
): Promise<T[]> => {
  const results: T[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await queryFn(batch);
    results.push(...batchResults);
  }
  
  return results;
};

/**
 * Optimized query builder for student marks
 */
export const buildOptimizedMarksQuery = (
  studentIds: string[],
  subjectId: string,
  termId: string
) => {
  return {
    caEntriesWhere: {
      subjectId,
      termId,
      studentId: { in: studentIds },
    } as Prisma.CAEntryWhereInput,
    
    examEntriesWhere: {
      subjectId,
      termId,
      studentId: { in: studentIds },
    } as Prisma.ExamEntryWhereInput,
    
    orderBy: {
      caEntries: { date: 'asc' } as Prisma.CAEntryOrderByWithRelationInput,
      examEntries: { examDate: 'asc' } as Prisma.ExamEntryOrderByWithRelationInput,
    },
  };
};

/**
 * Query performance monitoring
 */
export class QueryPerformanceMonitor {
  private queryTimes: Map<string, number[]> = new Map();

  startQuery(queryName: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      
      if (!this.queryTimes.has(queryName)) {
        this.queryTimes.set(queryName, []);
      }
      
      this.queryTimes.get(queryName)!.push(duration);
      
      // Log slow queries (> 1 second)
      if (duration > 1000) {
        console.warn(`⚠️ Slow query detected: ${queryName} took ${duration}ms`);
      }
    };
  }

  getStats(queryName: string) {
    const times = this.queryTimes.get(queryName) || [];
    
    if (times.length === 0) {
      return null;
    }

    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return {
      count: times.length,
      average: Math.round(avg),
      min,
      max,
      total: sum,
    };
  }

  getAllStats() {
    const stats: Record<string, any> = {};
    
    for (const [queryName, times] of this.queryTimes.entries()) {
      stats[queryName] = this.getStats(queryName);
    }

    return stats;
  }

  reset() {
    this.queryTimes.clear();
  }
}

export const queryMonitor = new QueryPerformanceMonitor();

/**
 * Index recommendations for optimal query performance
 */
export const RECOMMENDED_INDEXES = {
  caEntry: [
    'CREATE INDEX IF NOT EXISTS idx_ca_entry_student_subject_term ON "ca_entries"("studentId", "subjectId", "termId");',
    'CREATE INDEX IF NOT EXISTS idx_ca_entry_status ON "ca_entries"("status");',
    'CREATE INDEX IF NOT EXISTS idx_ca_entry_date ON "ca_entries"("date");',
  ],
  examEntry: [
    'CREATE INDEX IF NOT EXISTS idx_exam_entry_student_subject_term ON "exam_entries"("studentId", "subjectId", "termId");',
    'CREATE INDEX IF NOT EXISTS idx_exam_entry_status ON "exam_entries"("status");',
  ],
  student: [
    'CREATE INDEX IF NOT EXISTS idx_student_class_status ON "students"("classId", "status");',
  ],
  staffSubject: [
    'CREATE INDEX IF NOT EXISTS idx_staff_subject_staff_class ON "staff_subjects"("staffId", "classId");',
  ],
};
