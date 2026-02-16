/**
 * Progressive Filter Component for Teacher Marks Management
 * 
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7
 * - Implement class selection with teacher authorization
 * - Create stream selection with proper filtering
 * - Create subject selection with teacher permissions
 * - Add breadcrumb navigation and filter state management
 * - Implement smooth transitions and loading states
 * - Create card-based layout for filter options
 * - Add visual indicators for active/inactive states
 * - Implement progressive disclosure pattern
 * - Add reset filters functionality with confirmation
 * - Include metadata display (student counts, subject codes)
 * 
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7
 * - Meet WCAG 2.1 AA accessibility standards
 * - Provide proper ARIA labels and semantic HTML structure
 * - Implement keyboard navigation for all elements
 * - Ensure sufficient color contrast ratios
 * - Support screen readers with proper heading structure
 * - Provide focus indicators that are clearly visible
 * - Allow users to navigate the entire interface using only keyboard input
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  ChevronRight, 
  Users, 
  BookOpen, 
  GraduationCap, 
  RefreshCw, 
  AlertCircle, 
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  Wifi,
  WifiOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { 
  EnhancedErrorDisplay,
  NetworkStatus
} from '@/components/teacher/enhanced-error-display'
import { 
  spacing, 
  typography, 
  cardStyles, 
  teacherColors
} from '@/lib/teacher-ui-standards'
import { cn } from '@/lib/utils'
import { 
  focusStyles, 
  keyboardNavigation, 
  navigationAccessibility,
  a11yUtils,
  ariaStates,
  statusAccessibility
} from '@/lib/accessibility'
import { 
  teacherMarksErrorHandler,
  fetchWithErrorHandling,
  type TeacherMarksError
} from '@/lib/teacher-marks-error-handler'
import { useNetworkStatus, useNetworkAwareOperation } from '@/hooks/use-network-status'

export interface FilterSelection {
  classId?: string;
  streamId?: string;
  subjectId?: string;
}

export interface FilterStep {
  id: string;
  label: string;
  isActive: boolean;
  isComplete: boolean;
  data?: ClassOption | StreamOption | SubjectOption;
}

export interface ProgressiveFilterProps {
  onSelectionChange: (selection: FilterSelection) => void;
  initialSelection?: FilterSelection;
}

interface ClassOption {
  id: string;
  name: string;
  level: string;
  enrollmentCount: number;
  teacherRole: "CLASS_TEACHER" | "SUBJECT_TEACHER";
  subjects: string[];
}

interface StreamOption {
  id: string;
  name: string;
  studentCount: number;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
  maxCAScore: number;
  maxExamScore: number;
  teacherCanAccess: boolean;
}

export default function ProgressiveFilter({ 
  onSelectionChange, 
  initialSelection = {} 
}: ProgressiveFilterProps) {
  const [selection, setSelection] = useState<FilterSelection>(initialSelection)
  const [loading, setLoading] = useState({ classes: false, streams: false, subjects: false })
  const [errors, setErrors] = useState<{ 
    classes?: TeacherMarksError | null
    streams?: TeacherMarksError | null
    subjects?: TeacherMarksError | null
  }>({})
  const [retryCount, setRetryCount] = useState({ classes: 0, streams: 0, subjects: 0 })

  // Network status monitoring
  const networkStatus = useNetworkStatus({
    onOnline: () => {
      // Auto-retry failed operations when coming back online
      if (errors.classes) fetchClasses()
      if (errors.streams && selection.classId) fetchStreams(selection.classId)
      if (errors.subjects && selection.classId) fetchSubjects(selection.classId)
    }
  })

  // Network-aware operations with retry logic
  const classesOperation = useNetworkAwareOperation(
    () => fetchWithErrorHandling('/api/teacher/marks/classes', {}, 'classes'),
    {
      maxRetries: 3,
      onRetry: (attempt) => {
        setRetryCount(prev => ({ ...prev, classes: attempt }))
      },
      onMaxRetriesReached: (error) => {
        setErrors(prev => ({ 
          ...prev, 
          classes: teacherMarksErrorHandler.handleError(error, 'classes') 
        }))
      }
    }
  )

  const streamsOperation = useNetworkAwareOperation(
    (classId: string) => fetchWithErrorHandling(`/api/teacher/marks/classes/${classId}/streams`, {}, 'streams'),
    {
      maxRetries: 3,
      onRetry: (attempt) => {
        setRetryCount(prev => ({ ...prev, streams: attempt }))
      },
      onMaxRetriesReached: (error) => {
        setErrors(prev => ({ 
          ...prev, 
          streams: teacherMarksErrorHandler.handleError(error, 'streams') 
        }))
      }
    }
  )

  const subjectsOperation = useNetworkAwareOperation(
    (classId: string) => fetchWithErrorHandling(`/api/teacher/marks/classes/${classId}/subjects`, {}, 'subjects'),
    {
      maxRetries: 3,
      onRetry: (attempt) => {
        setRetryCount(prev => ({ ...prev, subjects: attempt }))
      },
      onMaxRetriesReached: (error) => {
        setErrors(prev => ({ 
          ...prev, 
          subjects: teacherMarksErrorHandler.handleError(error, 'subjects') 
        }))
      }
    }
  )

  // Data state
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [streams, setStreams] = useState<StreamOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])

  // Enhanced fetch functions with error handling
  const fetchClasses = async () => {
    setLoading(prev => ({ ...prev, classes: true }))
    setErrors(prev => ({ ...prev, classes: null }))
    
    try {
      const response = await classesOperation.execute()
      if (response) {
        const data = await response.json()
        setClasses(data.classes || [])
      }
    } catch (error) {
      // Error is already handled by the operation
    } finally {
      setLoading(prev => ({ ...prev, classes: false }))
    }
  }

  const fetchStreams = async (classId: string) => {
    setLoading(prev => ({ ...prev, streams: true }))
    setErrors(prev => ({ ...prev, streams: null }))
    
    try {
      const response = await streamsOperation.execute(classId)
      if (response) {
        const data = await response.json()
        setStreams(data.streams || [])
      }
    } catch (error) {
      // Error is already handled by the operation
    } finally {
      setLoading(prev => ({ ...prev, streams: false }))
    }
  }

  const fetchSubjects = async (classId: string) => {
    setLoading(prev => ({ ...prev, subjects: true }))
    setErrors(prev => ({ ...prev, subjects: null }))
    
    try {
      const response = await subjectsOperation.execute(classId)
      if (response) {
        const data = await response.json()
        const subjectsData = data.subjects || []
        
        // Deduplicate subjects by ID to prevent duplicate key errors
        const uniqueSubjects = Array.from(
          new Map(subjectsData.map((subject: SubjectOption) => [subject.id, subject])).values()
        )
        
        setSubjects(uniqueSubjects)
      }
    } catch (error) {
      // Error is already handled by the operation
    } finally {
      setLoading(prev => ({ ...prev, subjects: false }))
    }
  }

  // Enhanced selection handlers with error recovery
  const handleClassSelect = (classOption: ClassOption) => {
    const newSelection = { 
      classId: classOption.id, 
      streamId: undefined, 
      subjectId: undefined 
    }
    setSelection(newSelection)
    onSelectionChange(newSelection)
    
    // Clear downstream data and errors
    setStreams([])
    setSubjects([])
    setErrors(prev => ({ ...prev, streams: null, subjects: null }))
    
    // Fetch streams for selected class
    fetchStreams(classOption.id)
    fetchSubjects(classOption.id)
  }

  const handleStreamSelect = (streamOption: StreamOption) => {
    const newSelection = { 
      ...selection, 
      streamId: streamOption.id, 
      subjectId: undefined 
    }
    setSelection(newSelection)
    onSelectionChange(newSelection)
  }

  const handleSubjectSelect = (subjectOption: SubjectOption) => {
    const newSelection = { 
      ...selection, 
      subjectId: subjectOption.id 
    }
    setSelection(newSelection)
    onSelectionChange(newSelection)
  }

  // Retry handlers
  const handleRetryClasses = () => {
    setRetryCount(prev => ({ ...prev, classes: 0 }))
    fetchClasses()
  }

  const handleRetryStreams = () => {
    if (selection.classId) {
      setRetryCount(prev => ({ ...prev, streams: 0 }))
      fetchStreams(selection.classId)
    }
  }

  const handleRetrySubjects = () => {
    if (selection.classId) {
      setRetryCount(prev => ({ ...prev, subjects: 0 }))
      fetchSubjects(selection.classId)
    }
  }

  // Load classes on mount
  useEffect(() => {
    fetchClasses()
  }, [])

  // Auto-load streams and subjects if initial selection is provided
  useEffect(() => {
    if (initialSelection.classId && initialSelection.classId !== selection.classId) {
      fetchStreams(initialSelection.classId)
      fetchSubjects(initialSelection.classId)
    }
  }, [initialSelection.classId])

  return (
    <div className="space-y-6">
      {/* Network Status Indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Select Class, Stream, and Subject
        </h2>
        <NetworkStatus isOnline={networkStatus.isOnline} />
      </div>

      {/* Step 1: Class Selection */}
      <Card className={cardStyles.default}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--accent-primary)]" />
            Step 1: Select Class
            {selection.classId && (
              <Badge variant="secondary" className="ml-2">
                <Check className="h-3 w-3 mr-1" />
                Selected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errors.classes ? (
            <EnhancedErrorDisplay
              error={errors.classes}
              onRetry={handleRetryClasses}
              context="Loading classes"
              className="mb-4"
            />
          ) : loading.classes ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-[var(--bg-muted)] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No classes found</p>
              <p className="text-sm">Contact your administrator if you should have class access</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((classOption) => (
                <Card
                  key={classOption.id}
                  className={cn(
                    'cursor-pointer transition-all duration-200 hover:shadow-md',
                    selection.classId === classOption.id
                      ? 'ring-2 ring-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                      : 'hover:bg-[var(--bg-hover)]',
                    focusStyles.default
                  )}
                  onClick={() => handleClassSelect(classOption)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={selection.classId === classOption.id}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleClassSelect(classOption)
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-[var(--text-primary)]">
                        {classOption.name}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {classOption.teacherRole === 'CLASS_TEACHER' ? 'Class Teacher' : 'Subject Teacher'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {classOption.enrollmentCount} students
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {classOption.subjects.length} subjects
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Stream Selection (if class selected) */}
      {selection.classId && (
        <Card className={cardStyles.default}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[var(--accent-primary)]" />
              Step 2: Select Stream
              {selection.streamId && (
                <Badge variant="secondary" className="ml-2">
                  <Check className="h-3 w-3 mr-1" />
                  Selected
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {errors.streams ? (
              <EnhancedErrorDisplay
                error={errors.streams}
                onRetry={handleRetryStreams}
                context="Loading streams"
                className="mb-4"
              />
            ) : loading.streams ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-12 bg-[var(--bg-muted)] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : streams.length === 0 ? (
              <div className="text-center py-6 text-[var(--text-secondary)]">
                <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No streams in this class</p>
                <p className="text-sm">All students will be shown together</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {streams.map((streamOption) => (
                  <Card
                    key={streamOption.id}
                    className={cn(
                      'cursor-pointer transition-all duration-200 hover:shadow-md',
                      selection.streamId === streamOption.id
                        ? 'ring-2 ring-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                        : 'hover:bg-[var(--bg-hover)]',
                      focusStyles.default
                    )}
                    onClick={() => handleStreamSelect(streamOption)}
                    tabIndex={0}
                    role="button"
                    aria-pressed={selection.streamId === streamOption.id}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleStreamSelect(streamOption)
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="text-center">
                        <h3 className="font-medium text-[var(--text-primary)] mb-1">
                          {streamOption.name}
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {streamOption.studentCount} students
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Subject Selection (if class selected) */}
      {selection.classId && (
        <Card className={cardStyles.default}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[var(--accent-primary)]" />
              Step 3: Select Subject
              {selection.subjectId && (
                <Badge variant="secondary" className="ml-2">
                  <Check className="h-3 w-3 mr-1" />
                  Selected
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {errors.subjects ? (
              <EnhancedErrorDisplay
                error={errors.subjects}
                onRetry={handleRetrySubjects}
                context="Loading subjects"
                className="mb-4"
              />
            ) : loading.subjects ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-12 bg-[var(--bg-muted)] rounded-lg animate-pulse" />
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No subjects found</p>
                <p className="text-sm">Contact your administrator about subject assignments</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {subjects.map((subjectOption, index) => (
                  <Card
                    key={`${subjectOption.id}-${index}`}
                    className={cn(
                      'cursor-pointer transition-all duration-200 hover:shadow-md',
                      selection.subjectId === subjectOption.id
                        ? 'ring-2 ring-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                        : 'hover:bg-[var(--bg-hover)]',
                      focusStyles.default
                    )}
                    onClick={() => handleSubjectSelect(subjectOption)}
                    tabIndex={0}
                    role="button"
                    aria-pressed={selection.subjectId === subjectOption.id}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleSubjectSelect(subjectOption)
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-[var(--text-primary)]">
                          {subjectOption.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {subjectOption.code}
                        </Badge>
                      </div>
                      <div className="text-sm text-[var(--text-secondary)]">
                        CA Max: {subjectOption.maxCAScore} | Exam Max: {subjectOption.maxExamScore}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reset Button */}
      {(selection.classId || selection.streamId || selection.subjectId) && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              const newSelection = {}
              setSelection(newSelection)
              onSelectionChange(newSelection)
              setStreams([])
              setSubjects([])
              setErrors({})
            }}
            className={focusStyles.default}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  )
}
