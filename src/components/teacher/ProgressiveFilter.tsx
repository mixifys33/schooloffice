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
 */

'use client'

import React, { useState, useEffect } from 'react'
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
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { 
  spacing, 
  typography, 
  cardStyles, 
  teacherColors
} from '@/lib/teacher-ui-standards'
import { cn } from '@/lib/utils'

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
  const [error, setError] = useState<string | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  
  // Mobile-responsive state management
  const [expandedSections, setExpandedSections] = useState({
    classes: true,
    streams: true,
    subjects: true
  })
  
  // Mobile-specific state for better UX
  const [isMobile, setIsMobile] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullToRefreshDistance, setPullToRefreshDistance] = useState(0)
  const [touchStartY, setTouchStartY] = useState(0)
  
  // Data states
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [streams, setStreams] = useState<StreamOption[]>([])
  const [subjects, setSubjects] = useState<SubjectOption[]>([])

  // Detect mobile viewport with enhanced breakpoint detection
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window === 'undefined') return
      
      const width = window.innerWidth
      const isMobileViewport = width < 768 // sm breakpoint
      const isVerySmallScreen = width < 480 // xs breakpoint for very small screens
      
      setIsMobile(isMobileViewport)
      
      // Auto-collapse sections on mobile for better UX
      // On very small screens (320px-480px), be more aggressive with collapsing
      if (isMobileViewport) {
        setExpandedSections(() => ({
          classes: !selection.classId, // Only expand classes if no class selected
          streams: Boolean(selection.classId && !selection.streamId && streams.length > 0 && !isVerySmallScreen),
          subjects: Boolean(selection.classId && (streams.length === 0 || selection.streamId) && !selection.subjectId && !isVerySmallScreen)
        }))
      } else {
        // Keep all sections expanded on desktop
        setExpandedSections({
          classes: true,
          streams: true,
          subjects: true
        })
      }
    }
    
    checkMobile()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }
  }, [selection, streams.length])

  // Pull-to-refresh functionality for mobile
  useEffect(() => {
    if (!isMobile) return

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        setTouchStartY(e.touches[0].clientY)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (window.scrollY === 0 && touchStartY > 0) {
        const touchY = e.touches[0].clientY
        const pullDistance = Math.max(0, touchY - touchStartY)
        
        if (pullDistance > 0) {
          setPullToRefreshDistance(Math.min(pullDistance, 100))
          
          // Prevent default scrolling when pulling down
          if (pullDistance > 10) {
            e.preventDefault()
          }
        }
      }
    }

    const handleTouchEnd = () => {
      if (pullToRefreshDistance > 60 && !isRefreshing) {
        setIsRefreshing(true)
        // Refresh data
        Promise.all([
          loadClasses(),
          selection.classId ? loadStreams(selection.classId) : Promise.resolve(),
          selection.classId ? loadSubjects(selection.classId) : Promise.resolve()
        ]).finally(() => {
          setIsRefreshing(false)
          setPullToRefreshDistance(0)
          setTouchStartY(0)
        })
      } else {
        setPullToRefreshDistance(0)
        setTouchStartY(0)
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isMobile, touchStartY, pullToRefreshDistance, isRefreshing, selection.classId])

  // Load classes on component mount
  useEffect(() => {
    loadClasses()
  }, [])

  // Load streams when class is selected
  useEffect(() => {
    if (selection.classId && selection.classId !== initialSelection.classId) {
      loadStreams(selection.classId)
    }
  }, [selection.classId, initialSelection.classId])

  // Load subjects when class is selected (streams are optional)
  useEffect(() => {
    if (selection.classId && selection.classId !== initialSelection.classId) {
      loadSubjects(selection.classId)
    }
  }, [selection.classId, initialSelection.classId])

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange(selection)
  }, [selection, onSelectionChange])

  const loadClasses = async () => {
    setLoading(prev => ({ ...prev, classes: true }))
    setError(null)
    
    try {
      const response = await fetch('/api/teacher/marks/classes')
      if (!response.ok) {
        throw new Error('Failed to load classes')
      }
      
      const data = await response.json()
      setClasses(data.classes || [])
    } catch (err: unknown) {
      setError('Unable to load classes. Please try again.')
      console.error('Error loading classes:', err)
    } finally {
      setLoading(prev => ({ ...prev, classes: false }))
    }
  }

  const loadStreams = async (classId: string) => {
    setLoading(prev => ({ ...prev, streams: true }))
    
    try {
      const response = await fetch(`/api/teacher/marks/classes/${classId}/streams`)
      if (!response.ok) {
        throw new Error('Failed to load streams')
      }
      
      const data = await response.json()
      setStreams(data.streams || [])
    } catch (err: unknown) {
      console.error('Error loading streams:', err)
      setStreams([]) // Continue without streams if they fail to load
    } finally {
      setLoading(prev => ({ ...prev, streams: false }))
    }
  }

  const loadSubjects = async (classId: string) => {
    setLoading(prev => ({ ...prev, subjects: true }))
    
    try {
      const response = await fetch(`/api/teacher/marks/classes/${classId}/subjects`)
      if (!response.ok) {
        throw new Error('Failed to load subjects')
      }
      
      const data = await response.json()
      setSubjects(data.subjects || [])
    } catch (err: unknown) {
      console.error('Error loading subjects:', err)
      setSubjects([])
    } finally {
      setLoading(prev => ({ ...prev, subjects: false }))
    }
  }

  const handleClassSelect = (classId: string) => {
    setSelection({
      classId,
      streamId: undefined,
      subjectId: undefined,
    })
    
    // Auto-collapse classes section on mobile after selection
    if (isMobile) {
      setExpandedSections(prev => ({
        ...prev,
        classes: false,
        streams: true, // Expand streams if they exist
        subjects: false
      }))
    }
  }

  const handleStreamSelect = (streamId: string) => {
    setSelection(prev => ({
      ...prev,
      streamId,
      subjectId: undefined,
    }))
    
    // Auto-collapse streams section on mobile after selection
    if (isMobile) {
      setExpandedSections(prev => ({
        ...prev,
        streams: false,
        subjects: true // Expand subjects after stream selection
      }))
    }
  }

  const handleSubjectSelect = (subjectId: string) => {
    setSelection(prev => ({
      ...prev,
      subjectId,
    }))
    
    // Auto-collapse subjects section on mobile after selection
    if (isMobile) {
      setExpandedSections(prev => ({
        ...prev,
        subjects: false
      }))
    }
  }

  const resetFilters = () => {
    setSelection({})
    setStreams([])
    setSubjects([])
    setShowResetConfirm(false)
  }

  const handleResetConfirm = () => {
    resetFilters()
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Mobile-specific: Smart section management
  const handleMobileToggle = (section: keyof typeof expandedSections) => {
    if (isMobile) {
      // On mobile, collapse other sections when opening one
      setExpandedSections(prev => ({
        classes: section === 'classes' ? !prev.classes : false,
        streams: section === 'streams' ? !prev.streams : false,
        subjects: section === 'subjects' ? !prev.subjects : false,
      }))
    } else {
      toggleSection(section)
    }
  }

  const getSelectedClass = () => classes.find(c => c.id === selection.classId)
  const getSelectedStream = () => streams.find(s => s.id === selection.streamId)
  const getSelectedSubject = () => subjects.find(s => s.id === selection.subjectId)

  // Calculate total students for metadata display
  const getTotalStudents = () => {
    if (selection.streamId) {
      const stream = getSelectedStream()
      return stream?.studentCount || 0
    }
    if (selection.classId) {
      const classData = getSelectedClass()
      return classData?.enrollmentCount || 0
    }
    return 0
  }

  // Generate breadcrumb steps
  const steps: FilterStep[] = [
    {
      id: 'class',
      label: 'Select Class',
      isActive: !selection.classId,
      isComplete: !!selection.classId,
      data: getSelectedClass(),
    },
    {
      id: 'stream',
      label: 'Select Stream',
      isActive: !!selection.classId && !selection.streamId && streams.length > 0,
      isComplete: !!selection.streamId || streams.length === 0,
      data: getSelectedStream(),
    },
    {
      id: 'subject',
      label: 'Select Subject',
      isActive: !!selection.classId && (!streams.length || !!selection.streamId) && !selection.subjectId,
      isComplete: !!selection.subjectId,
      data: getSelectedSubject(),
    },
  ]

  if (error) {
    return (
      <Card className={cn(cardStyles.base, cardStyles.compact)}>
        <CardContent className="flex items-center gap-3 p-4">
          <AlertCircle className={cn('h-5 w-5', teacherColors.warning.text)} />
          <div>
            <p className={cn(typography.body, teacherColors.warning.text)}>{error}</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadClasses}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={spacing.section}>
      {/* Pull-to-refresh indicator for mobile */}
      {isMobile && (pullToRefreshDistance > 0 || isRefreshing) && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm border-b transition-all duration-200"
          style={{ 
            height: `${Math.min(pullToRefreshDistance, 60)}px`,
            opacity: pullToRefreshDistance > 30 ? 1 : pullToRefreshDistance / 30
          }}
        >
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <RefreshCw 
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isRefreshing && 'animate-spin',
                pullToRefreshDistance > 60 && 'rotate-180'
              )} 
            />
            <span>
              {isRefreshing 
                ? 'Refreshing...' 
                : pullToRefreshDistance > 60 
                ? 'Release to refresh' 
                : 'Pull to refresh'
              }
            </span>
          </div>
        </div>
      )}

      {/* Enhanced Breadcrumb Navigation with Metadata - Mobile Responsive */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Mobile: Stack breadcrumbs vertically, Desktop: Horizontal layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          {/* Breadcrumb Steps - Mobile: Vertical stack, Desktop: Horizontal */}
          <div className="flex flex-col xs:flex-row sm:flex-row sm:items-center gap-2 xs:gap-1 sm:gap-2">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className={cn(
                  'flex items-center gap-1 xs:gap-2 px-2 py-2 xs:px-3 xs:py-2 sm:px-4 sm:py-3 rounded-lg transition-all duration-200',
                  'border-2 min-h-[44px] text-xs xs:text-sm', // Smaller text on very small screens
                  step.isActive && [
                    teacherColors.info.bg,
                    teacherColors.info.border,
                    'shadow-sm'
                  ],
                  step.isComplete && [
                    teacherColors.success.bg,
                    teacherColors.success.border,
                    'shadow-sm'
                  ],
                  !step.isActive && !step.isComplete && [
                    teacherColors.secondary.bg,
                    teacherColors.secondary.border
                  ]
                )}>
                  {step.isComplete && (
                    <Check className={cn('h-3 w-3 xs:h-4 xs:w-4 flex-shrink-0', teacherColors.success.text)} />
                  )}
                  <span className={cn(
                    'text-xs xs:text-sm font-medium truncate',
                    step.isActive && teacherColors.info.text,
                    step.isComplete && teacherColors.success.text,
                    !step.isActive && !step.isComplete && 'text-[var(--text-secondary)]'
                  )}>
                    {step.label}
                  </span>
                  {step.data && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        'ml-1 xs:ml-2 text-xs flex-shrink-0 hidden xs:inline-flex', // Hide badges on very small screens
                        step.isActive && 'bg-white/20',
                        step.isComplete && 'bg-white/20'
                      )}
                    >
                      {step.data 
                        ? ('name' in step.data 
                          ? step.data.name 
                          : 'code' in step.data 
                          ? (step.data as SubjectOption).code 
                          : ''
                        )
                        : ''
                      }
                    </Badge>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className={cn(
                    'h-3 w-3 xs:h-4 xs:w-4 transition-colors mx-auto xs:mx-0 rotate-90 xs:rotate-0',
                    step.isComplete ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>
          
          {/* Reset Button - Full width on mobile */}
          {selection.classId && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              className={cn(
                'flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto',
                teacherColors.warning.text,
                'hover:' + teacherColors.warning.bg
              )}
            >
              <RotateCcw className="h-4 w-4" />
              <span className="sm:inline">Reset Filters</span>
            </Button>
          )}
        </div>

        {/* Selection Metadata Display - Mobile Responsive */}
        {(selection.classId || selection.streamId || selection.subjectId) && (
          <Card className={cn(cardStyles.base, 'border-l-4', teacherColors.info.border)}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Info className={cn('h-4 w-4 flex-shrink-0', teacherColors.info.text)} />
                  <span className={cn('font-medium', teacherColors.info.text)}>
                    Current Selection:
                  </span>
                </div>
                {/* Mobile: Stack selection items vertically, Desktop: Horizontal */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[var(--text-secondary)] pl-6 sm:pl-0">
                  {selection.classId && (
                    <div className="flex items-center gap-1">
                      <GraduationCap className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{getSelectedClass()?.name}</span>
                    </div>
                  )}
                  {selection.streamId && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{getSelectedStream()?.name}</span>
                    </div>
                  )}
                  {selection.subjectId && (
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{getSelectedSubject()?.code}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 font-medium">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span>{getTotalStudents()} students</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Step 1: Enhanced Class Selection - Mobile Responsive */}
      {!selection.classId && (
        <Card className={cn(cardStyles.base, cardStyles.normal, 'border-l-4', teacherColors.primary.border)}>
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <CardTitle className={cn(typography.sectionTitle, 'flex items-center gap-2')}>
                <div className={cn('p-2 rounded-lg flex-shrink-0', teacherColors.primary.bg)}>
                  <GraduationCap className={cn('h-5 w-5', teacherColors.primary.text)} />
                </div>
                <span className="truncate">Select Class</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMobileToggle('classes')}
                className="flex items-center gap-1 min-h-[44px] w-full sm:w-auto justify-center sm:justify-start"
              >
                {expandedSections.classes ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {expandedSections.classes ? 'Collapse' : 'Expand'}
              </Button>
            </div>
            <p className={cn(typography.body, 'mt-2')}>
              Choose from your assigned classes to begin marks management
            </p>
          </CardHeader>
          {expandedSections.classes && (
            <CardContent className="px-3 sm:px-6">
              {loading.classes ? (
                <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 xs:gap-3 sm:gap-4">
                  <SkeletonLoader variant="card" count={6} />
                </div>
              ) : classes.length === 0 ? (
                <div className="text-center py-4 xs:py-6 sm:py-8">
                  <div className={cn('p-3 xs:p-4 rounded-full mx-auto mb-3 xs:mb-4 w-fit', teacherColors.secondary.bg)}>
                    <GraduationCap className="h-6 w-6 xs:h-8 xs:w-8 sm:h-12 sm:w-12 text-[var(--text-muted)]" />
                  </div>
                  <p className={cn(typography.body, 'text-[var(--text-secondary)] mb-2 text-sm xs:text-base')}>
                    No classes assigned
                  </p>
                  <p className={cn(typography.caption, 'text-[var(--text-muted)] text-xs xs:text-sm')}>
                    Please contact your school administrator for class assignments
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 xs:gap-3 sm:gap-4">
                  {classes.map((classOption) => (
                    <Card 
                      key={classOption.id}
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]',
                        'active:scale-[0.98] touch-manipulation', // Mobile touch feedback
                        cardStyles.base,
                        'hover:border-[var(--accent)] group relative overflow-hidden',
                        'min-h-[100px] xs:min-h-[120px] sm:min-h-[140px]' // Smaller height on very small screens
                      )}
                      onClick={() => handleClassSelect(classOption.id)}
                    >
                      <div className={cn(
                        'absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity',
                        teacherColors.primary.bg
                      )} />
                      <CardContent className="p-2 xs:p-3 sm:p-4 relative h-full flex flex-col">
                        <div className="flex items-start justify-between mb-2 xs:mb-3 flex-1">
                          <div className="flex-1 min-w-0">
                            <h3 className={cn(typography.h3, 'text-[var(--text-primary)] mb-1 truncate text-sm xs:text-base')}>
                              {classOption.name}
                            </h3>
                            <p className={cn(typography.caption, 'text-[var(--text-muted)] text-xs')}>
                              Level {classOption.level}
                            </p>
                          </div>
                          <Badge 
                            variant={classOption.teacherRole === 'CLASS_TEACHER' ? 'default' : 'secondary'}
                            className="shrink-0 ml-1 xs:ml-2 text-xs hidden xs:inline-flex"
                          >
                            {classOption.teacherRole === 'CLASS_TEACHER' ? 'Class Teacher' : 'Subject Teacher'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-1 xs:gap-2 sm:gap-3 text-xs xs:text-sm mt-auto">
                          <div className={cn('flex items-center gap-1 xs:gap-2 p-1 xs:p-2 rounded-lg', teacherColors.info.bg)}>
                            <Users className={cn('h-3 w-3 xs:h-4 xs:w-4 flex-shrink-0', teacherColors.info.text)} />
                            <div className="min-w-0">
                              <div className={cn('font-medium truncate text-xs xs:text-sm', teacherColors.info.text)}>
                                {classOption.enrollmentCount}
                              </div>
                              <div className={cn('text-xs truncate', teacherColors.info.text, 'opacity-80 hidden xs:block')}>
                                Students
                              </div>
                            </div>
                          </div>
                          <div className={cn('flex items-center gap-1 xs:gap-2 p-1 xs:p-2 rounded-lg', teacherColors.secondary.bg)}>
                            <BookOpen className="h-3 w-3 xs:h-4 xs:w-4 flex-shrink-0 text-[var(--text-secondary)]" />
                            <div className="min-w-0">
                              <div className="font-medium text-[var(--text-primary)] truncate text-xs xs:text-sm">
                                {classOption.subjects.length}
                              </div>
                              <div className="text-xs text-[var(--text-muted)] truncate hidden xs:block">
                                Subjects
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Step 2: Enhanced Stream Selection - Mobile Responsive */}
      {selection.classId && !selection.streamId && streams.length > 0 && (
        <Card className={cn(cardStyles.base, cardStyles.normal, 'border-l-4', teacherColors.info.border)}>
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <CardTitle className={cn(typography.sectionTitle, 'flex items-center gap-2')}>
                <div className={cn('p-2 rounded-lg flex-shrink-0', teacherColors.info.bg)}>
                  <Users className={cn('h-5 w-5', teacherColors.info.text)} />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                  <span className="truncate">Select Stream</span>
                  <Badge variant="outline" className="text-xs self-start sm:self-auto">
                    {getSelectedClass()?.name}
                  </Badge>
                </div>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMobileToggle('streams')}
                className="flex items-center gap-1 min-h-[44px] w-full sm:w-auto justify-center sm:justify-start"
              >
                {expandedSections.streams ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {expandedSections.streams ? 'Collapse' : 'Expand'}
              </Button>
            </div>
            <p className={cn(typography.body, 'mt-2')}>
              Select a stream within {getSelectedClass()?.name} to focus on specific student groups
            </p>
          </CardHeader>
          {expandedSections.streams && (
            <CardContent className="px-3 sm:px-6">
              {loading.streams ? (
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4">
                  <SkeletonLoader variant="card" count={4} />
                </div>
              ) : (
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4">
                  {streams.map((stream) => (
                    <Card 
                      key={stream.id}
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]',
                        'active:scale-[0.98] touch-manipulation', // Mobile touch feedback
                        cardStyles.base,
                        'hover:border-[var(--accent)] group relative overflow-hidden',
                        'min-h-[100px] xs:min-h-[120px]' // Smaller height on very small screens
                      )}
                      onClick={() => handleStreamSelect(stream.id)}
                    >
                      <div className={cn(
                        'absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity',
                        teacherColors.info.bg
                      )} />
                      <CardContent className="p-2 xs:p-3 sm:p-4 text-center relative h-full flex flex-col justify-center">
                        <div className={cn('p-2 xs:p-3 rounded-full mx-auto mb-2 xs:mb-3 w-fit', teacherColors.info.bg)}>
                          <Users className={cn('h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6', teacherColors.info.text)} />
                        </div>
                        <h3 className={cn(typography.h3, 'text-[var(--text-primary)] mb-2 truncate text-sm xs:text-base')}>
                          {stream.name}
                        </h3>
                        <div className={cn('inline-flex items-center gap-1 px-2 xs:px-3 py-1 rounded-full text-xs xs:text-sm mx-auto', teacherColors.secondary.bg)}>
                          <Users className="h-3 w-3 xs:h-4 xs:w-4 text-[var(--text-secondary)] flex-shrink-0" />
                          <span className="font-medium text-[var(--text-primary)]">
                            {stream.studentCount}
                          </span>
                          <span className="text-[var(--text-muted)] hidden xs:inline">students</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Step 3: Enhanced Subject Selection - Mobile Responsive */}
      {selection.classId && (streams.length === 0 || selection.streamId) && !selection.subjectId && (
        <Card className={cn(cardStyles.base, cardStyles.normal, 'border-l-4', teacherColors.success.border)}>
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
              <CardTitle className={cn(typography.sectionTitle, 'flex items-center gap-2')}>
                <div className={cn('p-2 rounded-lg flex-shrink-0', teacherColors.success.bg)}>
                  <BookOpen className={cn('h-5 w-5', teacherColors.success.text)} />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                  <span className="truncate">Select Subject</span>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getSelectedClass()?.name}
                    </Badge>
                    {getSelectedStream() && (
                      <Badge variant="outline" className="text-xs">
                        {getSelectedStream()?.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMobileToggle('subjects')}
                className="flex items-center gap-1 min-h-[44px] w-full sm:w-auto justify-center sm:justify-start"
              >
                {expandedSections.subjects ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                {expandedSections.subjects ? 'Collapse' : 'Expand'}
              </Button>
            </div>
            <p className={cn(typography.body, 'mt-2')}>
              Choose a subject to begin entering marks for your students
            </p>
          </CardHeader>
          {expandedSections.subjects && (
            <CardContent className="px-3 sm:px-6">
              {loading.subjects ? (
                <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 xs:gap-3 sm:gap-4">
                  <SkeletonLoader variant="card" count={6} />
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-4 xs:py-6 sm:py-8">
                  <div className={cn('p-3 xs:p-4 rounded-full mx-auto mb-3 xs:mb-4 w-fit', teacherColors.secondary.bg)}>
                    <BookOpen className="h-6 w-6 xs:h-8 xs:w-8 sm:h-12 sm:w-12 text-[var(--text-muted)]" />
                  </div>
                  <p className={cn(typography.body, 'text-[var(--text-secondary)] mb-2 text-sm xs:text-base')}>
                    No subjects assigned for this class
                  </p>
                  <p className={cn(typography.caption, 'text-[var(--text-muted)] text-xs xs:text-sm')}>
                    Please contact your school administrator for subject assignments
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 xs:gap-3 sm:gap-4">
                  {subjects.map((subject) => (
                    <Card 
                      key={subject.id}
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]',
                        'active:scale-[0.98] touch-manipulation', // Mobile touch feedback
                        cardStyles.base,
                        'hover:border-[var(--accent)] group relative overflow-hidden',
                        'min-h-[120px] xs:min-h-[140px] sm:min-h-[160px]' // Smaller height on very small screens
                      )}
                      onClick={() => handleSubjectSelect(subject.id)}
                    >
                      <div className={cn(
                        'absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity',
                        teacherColors.success.bg
                      )} />
                      <CardContent className="p-2 xs:p-3 sm:p-4 relative h-full flex flex-col">
                        <div className="flex items-start justify-between mb-2 xs:mb-3 flex-1">
                          <div className="flex-1 min-w-0">
                            <h3 className={cn(typography.h3, 'text-[var(--text-primary)] mb-1 truncate text-sm xs:text-base')}>
                              {subject.name}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {subject.code}
                            </Badge>
                          </div>
                          <div className={cn('p-1 xs:p-2 rounded-lg flex-shrink-0 ml-1 xs:ml-2', teacherColors.success.bg)}>
                            <BookOpen className={cn('h-3 w-3 xs:h-4 xs:w-4', teacherColors.success.text)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1 xs:gap-2 sm:gap-3 text-xs xs:text-sm mt-auto">
                          <div className={cn('p-1 xs:p-2 rounded-lg text-center', teacherColors.info.bg)}>
                            <div className={cn('font-bold text-sm xs:text-base sm:text-lg', teacherColors.info.text)}>
                              {subject.maxCAScore}
                            </div>
                            <div className={cn('text-xs truncate', teacherColors.info.text, 'opacity-80 hidden xs:block')}>
                              CA Max
                            </div>
                          </div>
                          <div className={cn('p-1 xs:p-2 rounded-lg text-center', teacherColors.secondary.bg)}>
                            <div className="font-bold text-sm xs:text-base sm:text-lg text-[var(--text-primary)]">
                              {subject.maxExamScore}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] truncate hidden xs:block">
                              Exam Max
                            </div>
                          </div>
                        </div>
                        {!subject.teacherCanAccess && (
                          <div className={cn('mt-2 xs:mt-3 p-1 xs:p-2 rounded-lg text-center', teacherColors.warning.bg)}>
                            <p className={cn('text-xs', teacherColors.warning.text)}>
                              Limited Access
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        actionType="custom"
        title="Reset All Filters?"
        description="This will clear your current selection and return to class selection. Any unsaved work will be lost."
        confirmText="Reset Filters"
        customIcon={RotateCcw}
        onConfirm={handleResetConfirm}
      />
    </div>
  )
}