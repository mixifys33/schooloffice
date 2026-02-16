/**
 * Student Marks Entry Table Component
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8
 * - Implement data table with alternating row colors for better readability
 * - Add sortable column headers with clear sort indicators
 * - Create inline editing with immediate visual feedback for mark entries
 * - Implement validation styling (red borders, error messages) for invalid entries
 * - Add row highlighting on hover and focus states
 * - Use color coding to distinguish between CA marks, Exam marks, and calculated totals
 * - Implement sticky headers for large student lists
 * - Provide bulk selection capabilities with checkboxes
 * 
 * Requirements: 23.1, 23.2, 23.3, 23.4, 29.1
 * - Add CA entry creation interface within table
 * - Support multiple CA entries per student
 * - Implement CA type selection and custom naming
 * - Add custom max score input with validation
 * - Display CA entries with proper grouping
 * 
 * Requirements: 25.1, 25.2, 25.6
 * - Add exam score input with validation
 * - Enforce one exam per student constraint in UI
 * - Implement exam score validation (max 100)
 * - Add proper error display for exam validation
 * 
 * Requirements: 24.4, 25.4, 30.1, 30.5
 * - Show CA contribution (out of 20) clearly
 * - Show exam contribution (out of 80) clearly
 * - Display final score with proper formatting
 * - Add calculation breakdown on demand
 * 
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7
 * - Implement lazy loading for large student lists
 * - Provide optimistic UI updates for immediate user feedback
 * - Cache frequently accessed data to reduce server requests
 * - Implement efficient pagination for large datasets
 * - Optimize performance for smooth interactions
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Plus, 
  Edit3, 
  Save, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Calculator,
  AlertCircle,
  Check,
  Trash2,
  MoreHorizontal,
  BookOpen,
  FileText,
  Target,
  Beaker,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { 
  spacing, 
  typography, 
  cardStyles, 
  teacherColors,
  statusBadgeStyles
} from '@/lib/teacher-ui-standards'
import { cn } from '@/lib/utils'
import { 
  useDebounce, 
  useOptimisticUpdate, 
  useVirtualScroll, 
  usePagination,
  usePerformanceMonitor,
  createMemoComponent
} from '@/lib/performance'
import { 
  focusStyles, 
  keyboardNavigation, 
  tableAccessibility,
  a11yUtils,
  ariaStates,
  statusAccessibility
} from '@/lib/accessibility'

// Types and Interfaces
export interface CAEntry {
  id: string;
  subjectId: string;
  studentId: string;
  teacherId: string;
  termId: string;
  name: string;
  type: CAType;
  maxScore: number;
  rawScore: number;
  date: Date;
  competencyId?: string;
  competencyComment?: string;
  status: SubmissionStatus;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
export interface ExamEntry {
  id: string;
  subjectId: string;
  studentId: string;
  teacherId: string;
  termId: string;
  examScore: number;
  maxScore: number;
  examDate: Date;
  status: SubmissionStatus;
  submittedAt?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GradeCalculation {
  studentId: string;
  subjectId: string;
  termId: string;
  caEntries: CAEntry[];
  caPercentages: number[];
  averageCAPercentage: number;
  caContribution: number;
  examEntry?: ExamEntry;
  examContribution: number;
  finalScore: number;
  hasCA: boolean;
  hasExam: boolean;
  isComplete: boolean;
  calculatedAt: Date;
  lastUpdated: Date;
}

export interface StudentWithMarks {
  id: string;
  name: string;
  admissionNumber: string;
  caEntries: CAEntry[];
  examEntry?: ExamEntry;
  gradeCalculation: GradeCalculation;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  maxCAScore: number;
  maxExamScore: number;
}

export enum CAType {
  ASSIGNMENT = "ASSIGNMENT",
  TEST = "TEST", 
  PROJECT = "PROJECT",
  PRACTICAL = "PRACTICAL",
  OBSERVATION = "OBSERVATION",
}

export enum SubmissionStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED", 
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}
export interface CreateCAEntryRequest {
  studentId: string;
  subjectId: string;
  name: string;
  type: CAType;
  maxScore: number;
  rawScore: number;
  competencyId?: string;
  competencyComment?: string;
}

export interface CreateExamEntryRequest {
  studentId: string;
  subjectId: string;
  examScore: number;
  examDate: string;
}

export interface MarksEntryTableProps {
  students: StudentWithMarks[];
  subject: Subject;
  onCAEntryCreate: (entry: CreateCAEntryRequest) => Promise<void>;
  onCAEntryUpdate: (id: string, entry: Partial<CreateCAEntryRequest>) => Promise<void>;
  onCAEntryDelete: (id: string) => Promise<void>;
  onExamEntryCreate: (entry: CreateExamEntryRequest) => Promise<void>;
  onExamEntryUpdate: (id: string, entry: Partial<CreateExamEntryRequest>) => Promise<void>;
  onBatchSave: (entries: any[]) => Promise<void>;
  readOnly?: boolean;
  loading?: boolean;
}

// Sort types
type SortField = 'name' | 'admissionNumber' | 'caScore' | 'examScore' | 'finalScore';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// CA Type display configuration
const CA_TYPE_CONFIG = {
  [CAType.ASSIGNMENT]: {
    label: 'Assignment',
    icon: FileText,
    color: teacherColors.info,
  },
  [CAType.TEST]: {
    label: 'Test',
    icon: BookOpen,
    color: teacherColors.warning,
  },
  [CAType.PROJECT]: {
    label: 'Project',
    icon: Target,
    color: teacherColors.success,
  },
  [CAType.PRACTICAL]: {
    label: 'Practical',
    icon: Beaker,
    color: teacherColors.secondary,
  },
  [CAType.OBSERVATION]: {
    label: 'Observation',
    icon: Eye,
    color: teacherColors.primary,
  },
} as const;
export default function MarksEntryTable({
  students,
  subject,
  onCAEntryCreate,
  onCAEntryUpdate,
  onCAEntryDelete,
  onExamEntryCreate,
  onExamEntryUpdate,
  onBatchSave,
  readOnly = false,
  loading = false,
}: MarksEntryTableProps) {
  // Performance monitoring
  usePerformanceMonitor('MarksEntryTable')
  
  // State management
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'name', direction: 'asc' })
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{ studentId: string; type: 'ca' | 'exam'; caId?: string } | null>(null)
  const [showCalculationBreakdown, setShowCalculationBreakdown] = useState<Set<string>>(new Set())
  const [pendingChanges, setPendingChanges] = useState<Map<string, any>>(new Map())
  const [validationErrors, setValidationErrors] = useState<Map<string, string>>(new Map())
  const [showCAEntryForm, setShowCAEntryForm] = useState<{ studentId: string } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'ca' | 'exam'; id: string; studentName: string } | null>(null)

  // Performance optimizations
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  const [pageSize, setPageSize] = useState(20)
  
  // CA Entry form state
  const [caEntryForm, setCAEntryForm] = useState<{
    name: string;
    type: CAType;
    maxScore: string;
    rawScore: string;
    competencyComment: string;
  }>({
    name: '',
    type: CAType.ASSIGNMENT,
    maxScore: '',
    rawScore: '',
    competencyComment: '',
  })

  // Optimistic updates for better UX
  const { data: optimisticStudents, update: updateOptimistically } = useOptimisticUpdate(
    students,
    async (currentStudents, update) => {
      // This would be called after successful API update
      return currentStudents.map(student => 
        student.id === update.studentId 
          ? { ...student, ...update.changes }
          : student
      )
    }
  )

  // Memoized filtered and sorted students with search
  const filteredAndSortedStudents = useMemo(() => {
    let filtered = optimisticStudents

    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase()
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(searchLower) ||
        student.admissionNumber.toLowerCase().includes(searchLower)
      )
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'admissionNumber':
          aValue = a.admissionNumber;
          bValue = b.admissionNumber;
          break;
        case 'caScore':
          aValue = a.gradeCalculation.caContribution;
          bValue = b.gradeCalculation.caContribution;
          break;
        case 'examScore':
          aValue = a.gradeCalculation.examContribution;
          bValue = b.gradeCalculation.examContribution;
          break;
        case 'finalScore':
          aValue = a.gradeCalculation.finalScore;
          bValue = b.gradeCalculation.finalScore;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [optimisticStudents, sortConfig, debouncedSearchTerm]);

  // Pagination for large datasets
  const {
    currentData: paginatedStudents,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,
  } = usePagination({
    data: filteredAndSortedStudents,
    pageSize,
  })

  // Virtual scrolling for very large lists (when pagination is disabled)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [useVirtualization, setUseVirtualization] = useState(false)
  
  useEffect(() => {
    // Enable virtualization for very large datasets
    setUseVirtualization(filteredAndSortedStudents.length > 100)
  }, [filteredAndSortedStudents.length])

  const virtualScroll = useVirtualScroll({
    items: useVirtualization ? filteredAndSortedStudents : [],
    itemHeight: 80, // Approximate row height
    containerHeight: 600, // Container height
    overscan: 5,
  })

  const displayStudents = useVirtualization ? virtualScroll.visibleItems : paginatedStudents

  // Optimized event handlers with useCallback
  const handleSort = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    
    // Announce sort change to screen readers
    a11yUtils.announce(
      `Table sorted by ${field} in ${sortConfig.direction === 'asc' ? 'descending' : 'ascending'} order`,
      'polite'
    )
  }, [sortConfig.direction]);

  const handleStudentSelect = useCallback((studentId: string, selected: boolean) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(studentId);
      } else {
        newSet.delete(studentId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedStudents(new Set(displayStudents.map(s => s.id)));
      a11yUtils.announce(`Selected all ${displayStudents.length} students`, 'polite')
    } else {
      setSelectedStudents(new Set());
      a11yUtils.announce('Deselected all students', 'polite')
    }
  }, [displayStudents]);

  const toggleCalculationBreakdown = useCallback((studentId: string) => {
    setShowCalculationBreakdown(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  }, []);

  // Optimized validation with debouncing
  const validateMarkEntry = useCallback((value: number, maxScore: number, type: 'ca' | 'exam'): string | null => {
    if (isNaN(value) || value < 0) {
      return 'Score must be a non-negative number';
    }
    if (value > maxScore) {
      return `Score cannot exceed ${maxScore}`;
    }
    if (type === 'exam' && maxScore === 100 && value > 100) {
      return 'Exam score cannot exceed 100';
    }
    return null;
  }, []);

  // Optimistic CA entry creation with immediate UI feedback
  const handleCAEntryCreate = useCallback(async () => {
    if (!showCAEntryForm) return;

    const maxScore = parseFloat(caEntryForm.maxScore);
    const rawScore = parseFloat(caEntryForm.rawScore);

    // Validation
    const errors: string[] = [];
    if (!caEntryForm.name.trim()) errors.push('CA entry name is required');
    if (isNaN(maxScore) || maxScore <= 0) errors.push('Valid max score is required');
    if (isNaN(rawScore) || rawScore < 0) errors.push('Valid raw score is required');
    if (rawScore > maxScore) errors.push('Raw score cannot exceed max score');

    if (errors.length > 0) {
      setValidationErrors(new Map([['caForm', errors.join(', ')]]));
      return;
    }

    const newEntry = {
      studentId: showCAEntryForm.studentId,
      subjectId: subject.id,
      name: caEntryForm.name.trim(),
      type: caEntryForm.type,
      maxScore,
      rawScore,
      competencyComment: caEntryForm.competencyComment.trim() || undefined,
    };

    try {
      // Apply optimistic update immediately
      await updateOptimistically({
        studentId: showCAEntryForm.studentId,
        changes: {
          // This would add the new CA entry optimistically
          caEntries: [...(optimisticStudents.find(s => s.id === showCAEntryForm.studentId)?.caEntries || []), newEntry]
        }
      });

      // Perform actual API call
      await onCAEntryCreate(newEntry);

      // Reset form on success
      setCAEntryForm({
        name: '',
        type: CAType.ASSIGNMENT,
        maxScore: '',
        rawScore: '',
        competencyComment: '',
      });
      setShowCAEntryForm(null);
      setValidationErrors(new Map());
      
      // Announce success
      a11yUtils.announce(`CA entry "${newEntry.name}" created successfully`, 'polite');
    } catch (error) {
      console.error('Error creating CA entry:', error);
      setValidationErrors(new Map([['caForm', 'Failed to create CA entry. Please try again.']]));
    }
  }, [showCAEntryForm, caEntryForm, subject.id, onCAEntryCreate, updateOptimistically, optimisticStudents]);

  // Optimized exam entry update with debouncing
  const debouncedExamUpdate = useDebounce(
    useCallback(async (studentId: string, examScore: number) => {
      const student = optimisticStudents.find(s => s.id === studentId);
      if (!student) return;

      const validationError = validateMarkEntry(examScore, 100, 'exam');
      if (validationError) {
        setValidationErrors(new Map([[`exam-${studentId}`, validationError]]));
        return;
      }

      try {
        // Apply optimistic update
        await updateOptimistically({
          studentId,
          changes: {
            examEntry: student.examEntry 
              ? { ...student.examEntry, examScore }
              : { examScore, examDate: new Date().toISOString() }
          }
        });

        // Perform actual API call
        if (student.examEntry) {
          await onExamEntryUpdate(student.examEntry.id, { examScore });
        } else {
          await onExamEntryCreate({
            studentId,
            subjectId: subject.id,
            examScore,
            examDate: new Date().toISOString(),
          });
        }
        
        setValidationErrors(new Map());
        a11yUtils.announce(`Exam score ${examScore} recorded successfully`, 'polite');
      } catch (error) {
        console.error('Error updating exam entry:', error);
        setValidationErrors(new Map([[`exam-${studentId}`, 'Failed to update exam score. Please try again.']]));
      }
    }, [optimisticStudents, validateMarkEntry, updateOptimistically, onExamEntryUpdate, onExamEntryCreate, subject.id]),
    500 // 500ms debounce
  );

  const handleExamEntryUpdate = useCallback((studentId: string, examScore: number) => {
    debouncedExamUpdate(studentId, examScore);
  }, [debouncedExamUpdate]);
  // Memoized components for performance
  const MemoizedCAEntries = useMemo(() => createMemoComponent<{ student: StudentWithMarks }>(
    ({ student }) => renderCAEntries(student),
    (prevProps, nextProps) => {
      // Only re-render if CA entries actually changed
      return JSON.stringify(prevProps.student.caEntries) === JSON.stringify(nextProps.student.caEntries)
    }
  ), []);

  const MemoizedCalculationBreakdown = useMemo(() => createMemoComponent<{ student: StudentWithMarks }>(
    ({ student }) => renderCalculationBreakdown(student),
    (prevProps, nextProps) => {
      // Only re-render if grade calculation changed
      return JSON.stringify(prevProps.student.gradeCalculation) === JSON.stringify(nextProps.student.gradeCalculation)
    }
  ), []);

  // Handle CA entry deletion
  const handleCAEntryDelete = useCallback(async (caId: string) => {
    try {
      await onCAEntryDelete(caId);
      setShowDeleteConfirm(null);
      a11yUtils.announce('CA entry deleted successfully', 'polite');
    } catch (error) {
      console.error('Error deleting CA entry:', error);
      a11yUtils.announce('Failed to delete CA entry', 'assertive');
    }
  }, [onCAEntryDelete]);

  // Render sortable header with accessibility
  const renderSortableHeader = useCallback((field: SortField, label: string) => (
    <TableHead 
      className={cn(
        "cursor-pointer select-none hover:bg-muted/50 transition-colors",
        focusStyles.ring
      )}
      onClick={() => handleSort(field)}
      onKeyDown={keyboardNavigation.handleEnterSpace(() => handleSort(field))}
      tabIndex={0}
      {...tableAccessibility.columnHeaderProps(true, sortConfig.field === field ? sortConfig.direction : undefined)}
      aria-label={`Sort by ${label}. Currently ${sortConfig.field === field ? `sorted ${sortConfig.direction}ending` : 'not sorted'}`}
    >
      <div className="flex items-center gap-2">
        <span className={cn(typography.label, 'text-[var(--text-primary)]')}>{label}</span>
        <div className="flex flex-col">
          <ChevronUp 
            className={cn(
              'h-3 w-3 transition-colors',
              sortConfig.field === field && sortConfig.direction === 'asc' 
                ? 'text-[var(--accent-primary)]' 
                : 'text-[var(--text-muted)]'
            )} 
            aria-hidden="true"
          />
          <ChevronDown 
            className={cn(
              'h-3 w-3 -mt-1 transition-colors',
              sortConfig.field === field && sortConfig.direction === 'desc' 
                ? 'text-[var(--accent-primary)]' 
                : 'text-[var(--text-muted)]'
            )} 
            aria-hidden="true"
          />
        </div>
      </div>
    </TableHead>
  ), [handleSort, sortConfig]);

  // Render CA entries for a student (memoized)
  const renderCAEntries = useCallback((student: StudentWithMarks) => {
    if (student.caEntries.length === 0) {
      return (
        <div className="text-center py-2" role="status">
          <span className={cn(typography.caption, 'text-[var(--text-muted)]')}>
            No CA entries
          </span>
        </div>
      );
    }

    return (
      <div className="space-y-2" role="group" aria-label={`CA entries for ${student.name}`}>
        {student.caEntries.map((ca) => {
          const config = CA_TYPE_CONFIG[ca.type];
          const Icon = config.icon;
          const percentage = (ca.rawScore / ca.maxScore) * 100;

          return (
            <div 
              key={ca.id} 
              className={cn(
                'flex items-center justify-between p-2 rounded-lg border',
                config.color.bg,
                config.color.border
              )}
              role="listitem"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Icon className={cn('h-4 w-4 flex-shrink-0', config.color.text)} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className={cn('font-medium text-sm truncate', config.color.text)}>
                    {ca.name}
                  </div>
                  <div className={cn('text-xs', config.color.text, 'opacity-80')}>
                    {ca.rawScore}/{ca.maxScore} ({percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
              
              {!readOnly && ca.status === SubmissionStatus.DRAFT && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn("h-6 w-6 p-0", focusStyles.ring)}
                      aria-label={`Actions for ${ca.name}`}
                    >
                      <MoreHorizontal className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => setShowDeleteConfirm({
                        type: 'ca',
                        id: ca.id,
                        studentName: student.name
                      })}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [readOnly]);
  // Render calculation breakdown
  const renderCalculationBreakdown = (student: StudentWithMarks) => {
    const calc = student.gradeCalculation;
    
    return (
      <div className={cn('p-3 rounded-lg border-l-4 space-y-3', teacherColors.info.bg, teacherColors.info.border)}>
        <div className="flex items-center gap-2">
          <Calculator className={cn('h-4 w-4', teacherColors.info.text)} />
          <span className={cn('font-medium text-sm', teacherColors.info.text)}>
            Grade Calculation Breakdown
          </span>
        </div>
        
        {/* CA Calculation */}
        <div className="space-y-2">
          <div className={cn('text-sm font-medium', teacherColors.info.text)}>
            Continuous Assessment (20%)
          </div>
          {calc.caEntries.length > 0 ? (
            <div className="space-y-1 text-xs">
              {calc.caPercentages.map((percentage, index) => (
                <div key={index} className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">
                    {calc.caEntries[index].name}:
                  </span>
                  <span className="font-mono">
                    {calc.caEntries[index].rawScore}/{calc.caEntries[index].maxScore} = {percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
              <div className="border-t pt-1 flex justify-between font-medium">
                <span>Average CA Percentage:</span>
                <span className="font-mono">{calc.averageCAPercentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>CA Contribution (20%):</span>
                <span className="font-mono">{calc.caContribution.toFixed(1)}/20</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[var(--text-muted)]">No CA entries</div>
          )}
        </div>

        {/* Exam Calculation */}
        <div className="space-y-2">
          <div className={cn('text-sm font-medium', teacherColors.info.text)}>
            Examination (80%)
          </div>
          {calc.examEntry ? (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Exam Score:</span>
                <span className="font-mono">{calc.examEntry.examScore}/100</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Exam Contribution (80%):</span>
                <span className="font-mono">{calc.examContribution.toFixed(1)}/80</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-[var(--text-muted)]">No exam entry</div>
          )}
        </div>

        {/* Final Score */}
        <div className={cn('border-t pt-2 flex justify-between font-bold text-sm', teacherColors.success.text)}>
          <span>Final Score:</span>
          <span className="font-mono">{calc.finalScore.toFixed(1)}/100</span>
        </div>
      </div>
    );
  };
  return (
    <div className={spacing.section}>
      {/* Performance and Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          {/* Search Input */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn("w-64", focusStyles.ring)}
              aria-label="Search students by name or admission number"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Page Size Selector */}
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => setPageSize(parseInt(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 per page</SelectItem>
              <SelectItem value="20">20 per page</SelectItem>
              <SelectItem value="50">50 per page</SelectItem>
              <SelectItem value="100">100 per page</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={cn(typography.body, 'text-[var(--text-secondary)]')}>
            {selectedStudents.size > 0 
              ? `${selectedStudents.size} selected` 
              : `${filteredAndSortedStudents.length} students`
            }
            {debouncedSearchTerm && ` (filtered from ${optimisticStudents.length})`}
          </span>
          {selectedStudents.size > 0 && !readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Handle batch operations
                console.log('Batch operations for:', Array.from(selectedStudents));
              }}
              className={focusStyles.ring}
              aria-label={`Perform batch actions on ${selectedStudents.size} selected students`}
            >
              Batch Actions
            </Button>
          )}
        </div>
      </div>

      {/* Table Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Handle batch save
                  onBatchSave([]);
                }}
                disabled={loading}
                className={focusStyles.ring}
                aria-label="Save all pending changes"
              >
                <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                Save All Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <Card className={cn(cardStyles.base, 'overflow-hidden')}>
        <div 
          className="overflow-x-auto"
          ref={containerRef}
          style={useVirtualization ? { height: '600px', overflowY: 'auto' } : undefined}
          onScroll={useVirtualization ? virtualScroll.handleScroll : undefined}
        >
          <Table {...tableAccessibility.tableProps(`Student marks for ${subject.name}`)}>
            <caption className="sr-only">
              Student marks table for {subject.name}. 
              {filteredAndSortedStudents.length} students shown.
              Use arrow keys to navigate, Enter or Space to interact with controls.
            </caption>
            <TableHeader className="sticky top-0 bg-[var(--bg-main)] z-10">
              <TableRow>
                {!readOnly && (
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedStudents.size === displayStudents.length && displayStudents.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className={cn("rounded border-[var(--border-default)]", focusStyles.ring)}
                      aria-label={`Select all ${displayStudents.length} visible students`}
                    />
                  </TableHead>
                )}
                {renderSortableHeader('name', 'Student')}
                {renderSortableHeader('admissionNumber', 'Admission #')}
                <TableHead>
                  <div className="flex items-center gap-2">
                    <span className={cn(typography.label, 'text-[var(--text-primary)]')}>
                      CA Entries
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Multiple
                    </Badge>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    <span className={cn(typography.label, 'text-[var(--text-primary)]')}>
                      Exam Score
                    </span>
                    <Badge variant="outline" className="text-xs">
                      /100
                    </Badge>
                  </div>
                </TableHead>
                {renderSortableHeader('caScore', 'CA (20)')}
                {renderSortableHeader('examScore', 'Exam (80)')}
                {renderSortableHeader('finalScore', 'Final (100)')}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {useVirtualization && (
                <tr style={{ height: virtualScroll.offsetY }} aria-hidden="true">
                  <td colSpan={readOnly ? 8 : 9} />
                </tr>
              )}
              {displayStudents.map((student, index) => (
                <React.Fragment key={student.id}>
                  <TableRow 
                    className={cn(
                      'hover:bg-muted/50 transition-colors',
                      index % 2 === 0 ? 'bg-[var(--bg-main)]' : 'bg-[var(--bg-surface)]'
                    )}
                    {...tableAccessibility.cellProps()}
                  >
                    {!readOnly && (
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedStudents.has(student.id)}
                          onChange={(e) => handleStudentSelect(student.id, e.target.checked)}
                          className={cn("rounded border-[var(--border-default)]", focusStyles.ring)}
                          aria-label={`Select ${student.name}`}
                        />
                      </TableCell>
                    )}
                    
                    {/* Student Info */}
                    <TableCell {...tableAccessibility.rowHeaderProps()}>
                      <div>
                        <div className={cn('font-medium', typography.body, 'text-[var(--text-primary)]')}>
                          {student.name}
                        </div>
                        <div className={cn(typography.caption, 'text-[var(--text-muted)]')}>
                          {student.admissionNumber}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className={cn(typography.body, 'font-mono text-[var(--text-secondary)]')}>
                        {student.admissionNumber}
                      </span>
                    </TableCell>

                    {/* CA Entries */}
                    <TableCell className="min-w-[300px]">
                      <div className="space-y-2">
                        <MemoizedCAEntries student={student} />
                        {!readOnly && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCAEntryForm({ studentId: student.id })}
                            className={cn("w-full", focusStyles.ring)}
                            aria-label={`Add CA entry for ${student.name}`}
                          >
                            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                            Add CA Entry
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    {/* Exam Score */}
                    <TableCell>
                      {readOnly || (student.examEntry && student.examEntry.status === SubmissionStatus.APPROVED) ? (
                        <div className="text-center">
                          <div className={cn('font-mono text-lg', typography.body, 'text-[var(--text-primary)]')}>
                            {student.examEntry?.examScore || '-'}
                          </div>
                          {student.examEntry && (
                            <Badge 
                              variant={student.examEntry.status === SubmissionStatus.APPROVED ? 'success' : 'secondary'}
                              className="text-xs mt-1"
                            >
                              {student.examEntry.status.toLowerCase()}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="0-100"
                            defaultValue={student.examEntry?.examScore || ''}
                            onBlur={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) {
                                handleExamEntryUpdate(student.id, value);
                              }
                            }}
                            className={cn(
                              'text-center font-mono',
                              validationErrors.has(`exam-${student.id}`) && 'border-red-500'
                            )}
                            error={validationErrors.has(`exam-${student.id}`)}
                          />
                          {validationErrors.has(`exam-${student.id}`) && (
                            <div className="text-xs text-red-600 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {validationErrors.get(`exam-${student.id}`)}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* CA Contribution */}
                    <TableCell>
                      <div className="text-center">
                        <div className={cn(
                          'font-mono text-lg font-bold',
                          student.gradeCalculation.hasCA ? teacherColors.success.text : 'text-[var(--text-muted)]'
                        )}>
                          {student.gradeCalculation.caContribution.toFixed(1)}
                        </div>
                        <div className={cn(typography.caption, 'text-[var(--text-muted)]')}>
                          / 20
                        </div>
                      </div>
                    </TableCell>

                    {/* Exam Contribution */}
                    <TableCell>
                      <div className="text-center">
                        <div className={cn(
                          'font-mono text-lg font-bold',
                          student.gradeCalculation.hasExam ? teacherColors.success.text : 'text-[var(--text-muted)]'
                        )}>
                          {student.gradeCalculation.examContribution.toFixed(1)}
                        </div>
                        <div className={cn(typography.caption, 'text-[var(--text-muted)]')}>
                          / 80
                        </div>
                      </div>
                    </TableCell>

                    {/* Final Score */}
                    <TableCell>
                      <div className="text-center">
                        <div className={cn(
                          'font-mono text-xl font-bold',
                          student.gradeCalculation.isComplete 
                            ? teacherColors.success.text 
                            : student.gradeCalculation.hasCA || student.gradeCalculation.hasExam
                            ? teacherColors.warning.text
                            : 'text-[var(--text-muted)]'
                        )}>
                          {student.gradeCalculation.finalScore.toFixed(1)}
                        </div>
                        <div className={cn(typography.caption, 'text-[var(--text-muted)]')}>
                          / 100
                        </div>
                        {!student.gradeCalculation.isComplete && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {!student.gradeCalculation.hasCA && !student.gradeCalculation.hasExam 
                              ? 'No marks' 
                              : !student.gradeCalculation.hasCA 
                              ? 'CA pending' 
                              : 'Exam pending'
                            }
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCalculationBreakdown(student.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Calculation Breakdown Row */}
                  {showCalculationBreakdown.has(student.id) && (
                    <TableRow>
                      <TableCell colSpan={readOnly ? 8 : 9} className="p-0">
                        <div className="p-4 bg-[var(--bg-surface)]">
                          {renderCalculationBreakdown(student)}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Controls */}
        {!useVirtualization && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)]">
                Page {currentPage} of {totalPages}
              </span>
              <span className="text-sm text-[var(--text-muted)]">
                ({filteredAndSortedStudents.length} total students)
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={prevPage}
                disabled={!hasPrevPage}
                className={focusStyles.ring}
                aria-label="Go to previous page"
              >
                Previous
              </Button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, currentPage - 2) + i;
                  if (pageNum > totalPages) return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      className={cn("w-8 h-8 p-0", focusStyles.ring)}
                      aria-label={`Go to page ${pageNum}`}
                      aria-current={pageNum === currentPage ? "page" : undefined}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={nextPage}
                disabled={!hasNextPage}
                className={focusStyles.ring}
                aria-label="Go to next page"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
      {/* CA Entry Form Modal */}
      {showCAEntryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className={cn(cardStyles.base, 'w-full max-w-md')}>
            <CardHeader>
              <CardTitle className={cn(typography.sectionTitle, 'flex items-center gap-2')}>
                <Plus className="h-5 w-5" />
                Add CA Entry
              </CardTitle>
              <p className={cn(typography.body, 'text-[var(--text-secondary)]')}>
                Student: {students.find(s => s.id === showCAEntryForm.studentId)?.name}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* CA Entry Name */}
              <div>
                <label className={cn(typography.label, 'block mb-2')}>
                  CA Entry Name *
                </label>
                <Input
                  placeholder="e.g., Assignment 1 - Algebra"
                  value={caEntryForm.name}
                  onChange={(e) => setCAEntryForm(prev => ({ ...prev, name: e.target.value }))}
                  error={validationErrors.has('caForm')}
                />
              </div>

              {/* CA Type */}
              <div>
                <label className={cn(typography.label, 'block mb-2')}>
                  CA Type *
                </label>
                <Select
                  value={caEntryForm.type}
                  onValueChange={(value: CAType) => setCAEntryForm(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CA_TYPE_CONFIG).map(([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <config.icon className="h-4 w-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Max Score and Raw Score */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={cn(typography.label, 'block mb-2')}>
                    Max Score *
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="0.1"
                    placeholder="e.g., 20"
                    value={caEntryForm.maxScore}
                    onChange={(e) => setCAEntryForm(prev => ({ ...prev, maxScore: e.target.value }))}
                    error={validationErrors.has('caForm')}
                  />
                </div>
                <div>
                  <label className={cn(typography.label, 'block mb-2')}>
                    Raw Score *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="e.g., 18"
                    value={caEntryForm.rawScore}
                    onChange={(e) => setCAEntryForm(prev => ({ ...prev, rawScore: e.target.value }))}
                    error={validationErrors.has('caForm')}
                  />
                </div>
              </div>

              {/* Competency Comment */}
              <div>
                <label className={cn(typography.label, 'block mb-2')}>
                  Competency Comment
                </label>
                <Input
                  placeholder="Optional competency-based comment"
                  value={caEntryForm.competencyComment}
                  onChange={(e) => setCAEntryForm(prev => ({ ...prev, competencyComment: e.target.value }))}
                />
              </div>

              {/* Error Display */}
              {validationErrors.has('caForm') && (
                <div className={cn('p-3 rounded-lg flex items-center gap-2', teacherColors.error.bg)}>
                  <AlertCircle className={cn('h-4 w-4', teacherColors.error.text)} />
                  <span className={cn('text-sm', teacherColors.error.text)}>
                    {validationErrors.get('caForm')}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4">
                <Button
                  onClick={handleCAEntryCreate}
                  disabled={loading}
                  className="flex-1"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add CA Entry
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCAEntryForm(null);
                    setValidationErrors(new Map());
                    setCAEntryForm({
                      name: '',
                      type: CAType.ASSIGNMENT,
                      maxScore: '',
                      rawScore: '',
                      competencyComment: '',
                    });
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={!!showDeleteConfirm}
        onOpenChange={(open) => !open && setShowDeleteConfirm(null)}
        actionType="destructive"
        title={`Delete ${showDeleteConfirm?.type === 'ca' ? 'CA Entry' : 'Exam Entry'}?`}
        description={`This will permanently delete the ${showDeleteConfirm?.type === 'ca' ? 'CA entry' : 'exam entry'} for ${showDeleteConfirm?.studentName}. This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => {
          if (showDeleteConfirm?.type === 'ca') {
            handleCAEntryDelete(showDeleteConfirm.id);
          }
        }}
      />
    </div>
  );
}