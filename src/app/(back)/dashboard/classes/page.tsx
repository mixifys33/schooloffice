'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ChevronRight, Users, Layers, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClassBulkUpload } from '@/components/classes/class-bulk-upload'

/**
 * Classes and Streams Management Page
 * Requirements: 4.1 - Display all classes (P1-P7, S1-S6) with their streams
 */

interface StreamItem {
  id: string
  name: string
}

interface ClassItem {
  id: string
  name: string
  level: number
  levelType?: 'O_LEVEL' | 'A_LEVEL' | null
  streams?: StreamItem[] // Make streams optional since it might be undefined
}

export default function ClassesPage() {
  const router = useRouter()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBulkUpload, setShowBulkUpload] = useState(false)

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/classes')
      
      if (!response.ok) {
        throw new Error('Failed to fetch classes')
      }

      const data = await response.json()
      // Handle both array and { classes: [...] } response formats
      const classesArray = Array.isArray(data) ? data : (data.classes || [])
      setClasses(classesArray)
      setError(null)
    } catch (err) {
      console.error('Error fetching classes:', err)
      setError('Unable to load classes. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClasses()
  }, [fetchClasses])

  const handleClassClick = (classItem: ClassItem) => {
    router.push(`/dashboard/classes/${classItem.id}`)
  }

  const handleAddClass = () => {
    router.push('/dashboard/classes/new')
  }

  const handleBulkUploadComplete = () => {
    setShowBulkUpload(false)
    fetchClasses()
  }

  // Group classes by level type (O-Level and A-Level)
  // Extra safety: ensure classes is always an array before filtering
  const safeClasses = Array.isArray(classes) ? classes : []
  const oLevelClasses = safeClasses.filter(c => c.levelType === 'O_LEVEL')
  const aLevelClasses = safeClasses.filter(c => c.levelType === 'A_LEVEL')
  const unspecifiedClasses = safeClasses.filter(c => !c.levelType)

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Classes & Streams</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage class structure and streams
            </p>
          </div>
        </div>
        <SkeletonLoader variant="card" count={4} />
      </div>
    )
  }

  if (showBulkUpload) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <ClassBulkUpload
          onUploadComplete={handleBulkUploadComplete}
          onCancel={() => setShowBulkUpload(false)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Classes & Streams</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {safeClasses.length} classes configured
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowBulkUpload(true)} variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Upload</span>
          </Button>
          <Button onClick={handleAddClass} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Class</span>
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Retry', onClick: fetchClasses }}
        />
      )}

      {/* Empty State */}
      {safeClasses.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Classes Yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Get started by creating your first class.
            </p>
            <Button onClick={handleAddClass} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Class
            </Button>
          </CardContent>
        </Card>
      )}

      {/* O-Level Classes Section */}
      {oLevelClasses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-muted)]">
            O-Level Classes (S1-S4)
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {oLevelClasses.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                onClick={() => handleClassClick(classItem)}
              />
            ))}
          </div>
        </div>
      )}

      {/* A-Level Classes Section */}
      {aLevelClasses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-muted)]">
            A-Level Classes (S5-S6)
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {aLevelClasses.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                onClick={() => handleClassClick(classItem)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unspecified Level Type Classes */}
      {unspecifiedClasses.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-muted)]">
            Other Classes
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {unspecifiedClasses.map((classItem) => (
              <ClassCard
                key={classItem.id}
                classItem={classItem}
                onClick={() => handleClassClick(classItem)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface ClassCardProps {
  classItem: ClassItem
  onClick: () => void
}

function ClassCard({ classItem, onClick }: ClassCardProps) {
  // Safely handle streams array - it might be undefined or null
  const streams = classItem.streams || [];
  
  // Format level type for display
  const levelTypeLabel = classItem.levelType === 'O_LEVEL' 
    ? 'O-Level' 
    : classItem.levelType === 'A_LEVEL' 
    ? 'A-Level' 
    : null;
  
  return (
    <Card 
      className="cursor-pointer hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{classItem.name}</CardTitle>
            {levelTypeLabel && (
              <Badge variant="outline" className="text-xs">
                {levelTypeLabel}
              </Badge>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Streams */}
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {streams.length} stream{streams.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {/* Stream badges */}
          {streams.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {streams.map((stream) => (
                <Badge key={stream.id} variant="secondary" className="text-xs">
                  {stream.name}
                </Badge>
              ))}
            </div>
          )}
          
          {streams.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No streams configured
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
