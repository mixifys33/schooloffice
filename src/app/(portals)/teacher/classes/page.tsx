'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, Users, ChevronRight, Star } from 'lucide-react'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessagePanel } from '@/components/teacher'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { 
  cardStyles, 
  typography, 
  spacing, 
  teacherColors, 
  transitions,
  errorMessages 
} from '@/lib/teacher-ui-standards'

/**
 * My Classes Page for Teacher Portal
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 * - Display only classes assigned to logged-in teacher
 * - Show subject name, class name, and student count for each assignment
 * - Implement click navigation to class detail view
 * - Ensure no global student search functionality is exposed
 */

interface AssignedClass {
  id: string
  classId: string
  className: string
  streamName: string | null
  subject: {
    id: string
    name: string
  }
  studentCount: number
  isClassTeacher: boolean
}

export default function MyClassesPage() {
  const [classes, setClasses] = useState<AssignedClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchClasses() {
      try {
        const response = await fetch('/api/teacher/classes')
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.details || errorData.error || 'Failed to fetch classes'
          
          // Show user-friendly toast notification instead of throwing error
          toast({
            title: "Unable to Load Classes",
            description: errorMessage,
            variant: "destructive",
          })
          
          setError(errorMessage)
          return
        }
        const data = await response.json()
        setClasses(data.classes || [])
        setError(null) // Clear any previous errors
      } catch (err) {
        const errorMessage = 'Unable to load your classes. Please check your connection and try again.'
        console.error('Error fetching teacher classes:', err)
        
        // Show user-friendly toast notification
        toast({
          title: "Connection Error",
          description: errorMessage,
          variant: "destructive",
        })
        
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchClasses()
  }, [])

  // Add retry functionality
  const handleRetry = () => {
    setLoading(true)
    setError(null)
    
    async function retryFetchClasses() {
      try {
        const response = await fetch('/api/teacher/classes')
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.details || errorData.error || 'Failed to fetch classes'
          
          toast({
            title: "Still Unable to Load Classes",
            description: errorMessage,
            variant: "destructive",
          })
          
          setError(errorMessage)
          return
        }
        const data = await response.json()
        setClasses(data.classes || [])
        setError(null)
        
        // Show success message on retry
        toast({
          title: "Classes Loaded Successfully",
          description: "Your classes have been loaded.",
          variant: "default",
        })
      } catch (err) {
        const errorMessage = 'Unable to load your classes. Please check your connection and try again.'
        console.error('Error retrying teacher classes:', err)
        
        toast({
          title: "Connection Error",
          description: errorMessage,
          variant: "destructive",
        })
        
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }
    
    retryFetchClasses()
  }

  if (loading) {
    return (
      <div className={cn(spacing.section, 'p-4 sm:p-6')}>
        <div className="flex items-center justify-between">
          <h1 className={typography.pageTitle}>My Classes</h1>
        </div>
        <SkeletonLoader variant="card" count={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorMessagePanel
          config={{
            title: 'Unable to Load Classes',
            message: error,
            nextSteps: [
              'Check your internet connection',
              'Try refreshing the page',
              'Contact support if the problem persists',
            ],
          }}
          onRetry={handleRetry}
        />
      </div>
    )
  }

  return (
    <div className={cn(spacing.section, 'p-4 sm:p-6')}>
      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact)}>
        <h1 className={typography.pageTitle}>My Classes</h1>
        <p className={cn(typography.caption, 'mt-1')}>
          {classes.length} {classes.length === 1 ? 'class' : 'classes'} assigned to you
        </p>
      </div>

      {/* Requirements: 3.5 - No global student search functionality exposed */}
      
      {/* Classes Grid */}
      {classes.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Link
              key={cls.id}
              href={`/teacher/classes/${cls.classId}${cls.subject.id ? `?subjectId=${cls.subject.id}` : ''}`}
              className={cn(
                'group p-4 rounded-lg border transition-all',
                cardStyles.base,
                'hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm',
                transitions.color
              )}
            >
              {/* Class Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', teacherColors.info.bg)}>
                    <BookOpen className={cn('h-5 w-5', teacherColors.info.text)} />
                  </div>
                  <div>
                    <h3 className={cn(
                      typography.sectionTitle,
                      'group-hover:text-[var(--text-primary)] dark:group-hover:text-[var(--white-pure)] transition-colors'
                    )}>
                      {cls.className}
                      {cls.streamName && (
                        <span className={cn(typography.body, 'font-normal')}>
                          {' '}({cls.streamName})
                        </span>
                      )}
                    </h3>
                    {/* Requirements: 3.2 - Show subject name */}
                    <p className={typography.caption}>
                      {cls.subject.name}
                    </p>
                  </div>
                </div>
                <ChevronRight className={cn(
                  'h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] dark:group-hover:text-[var(--text-muted)] transition-colors'
                )} />
              </div>

              {/* Class Stats */}
              <div className="flex items-center gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                {/* Requirements: 3.2 - Show student count */}
                <div className={cn('flex items-center gap-1.5', typography.caption)}>
                  <Users className="h-4 w-4" />
                  <span>{cls.studentCount} students</span>
                </div>
                
                {/* Class Teacher Badge */}
                {cls.isClassTeacher && (
                  <div className="flex items-center gap-1 text-sm text-[var(--chart-yellow)] dark:text-[var(--warning)]">
                    <Star className="h-4 w-4 fill-current" />
                    <span>Class Teacher</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={cn(cardStyles.base, cardStyles.normal, 'text-center')}>
          <div className={cn('mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4', teacherColors.secondary.bg)}>
            <BookOpen className="h-6 w-6 text-[var(--text-muted)]" />
          </div>
          <h3 className={cn(typography.sectionTitle, 'mb-2')}>
            No Classes Assigned
          </h3>
          <p className={cn(typography.body, 'max-w-sm mx-auto')}>
            You don&apos;t have any classes assigned yet. Please contact your school administrator.
          </p>
        </div>
      )}
    </div>
  )
}
