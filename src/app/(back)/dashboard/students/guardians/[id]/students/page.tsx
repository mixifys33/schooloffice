'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, Plus, Trash2, User, CreditCard, 
  MessageSquare, Star, Loader2, Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { RelationshipType } from '@/types/enums'

/**
 * Guardian-Student Linking UI
 * Link/unlink guardians from students, set primary guardian, set financial responsibility
 * Requirements: 2.1, 2.2, 4.1
 */

interface LinkedStudent {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  name: string
  className?: string
  streamName?: string
  relationshipType: string
  isPrimary: boolean
  isFinanciallyResponsible: boolean
  receivesAcademicMessages: boolean
  receivesFinanceMessages: boolean
}

interface AvailableStudent {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  className?: string
  streamName?: string
}

interface GuardianBasic {
  id: string
  firstName: string
  lastName: string
  name: string
}

export default function GuardianStudentsPage() {
  const params = useParams()
  const router = useRouter()
  const guardianId = params.id as string

  const [guardian, setGuardian] = useState<GuardianBasic | null>(null)
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([])
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Link dialog state
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<AvailableStudent | null>(null)
  const [linkRelationship, setLinkRelationship] = useState<RelationshipType>(RelationshipType.GUARDIAN)
  const [linkIsPrimary, setLinkIsPrimary] = useState(false)
  const [linkIsFinancial, setLinkIsFinancial] = useState(false)
  
  // Unlink dialog state
  const [unlinkStudent, setUnlinkStudent] = useState<LinkedStudent | null>(null)

  const fetchGuardian = useCallback(async () => {
    try {
      const response = await fetch(`/api/guardians/${guardianId}`)
      if (!response.ok) throw new Error('Failed to fetch guardian')
      const data = await response.json()
      setGuardian({
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        name: data.name,
      })
      setLinkedStudents(data.students || [])
    } catch (err) {
      console.error('Error fetching guardian:', err)
      setError('Unable to load guardian')
    }
  }, [guardianId])

  const fetchAvailableStudents = useCallback(async () => {
    try {
      const response = await fetch('/api/students?pageSize=100')
      if (!response.ok) throw new Error('Failed to fetch students')
      const data = await response.json()
      setAvailableStudents(data.students || [])
    } catch (err) {
      console.error('Error fetching students:', err)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchGuardian(), fetchAvailableStudents()])
      setLoading(false)
    }
    loadData()
  }, [fetchGuardian, fetchAvailableStudents])

  // Filter available students (exclude already linked)
  const filteredStudents = availableStudents.filter(student => {
    const isLinked = linkedStudents.some(ls => ls.id === student.id)
    if (isLinked) return false
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      student.firstName.toLowerCase().includes(query) ||
      student.lastName.toLowerCase().includes(query) ||
      student.admissionNumber.toLowerCase().includes(query)
    )
  })

  const handleLinkStudent = async () => {
    if (!selectedStudent) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/guardians/${guardianId}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          relationshipType: linkRelationship,
          isPrimary: linkIsPrimary,
          isFinanciallyResponsible: linkIsFinancial,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to link student')
      }

      setSuccess('Student linked successfully')
      setShowLinkDialog(false)
      setSelectedStudent(null)
      setLinkRelationship(RelationshipType.GUARDIAN)
      setLinkIsPrimary(false)
      setLinkIsFinancial(false)
      await fetchGuardian()
    } catch (err) {
      console.error('Error linking student:', err)
      setError(err instanceof Error ? err.message : 'Failed to link student')
    } finally {
      setSaving(false)
    }
  }

  const handleUnlinkStudent = async () => {
    if (!unlinkStudent) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/guardians/${guardianId}/students/${unlinkStudent.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to unlink student')
      }

      setSuccess('Student unlinked successfully')
      setUnlinkStudent(null)
      await fetchGuardian()
    } catch (err) {
      console.error('Error unlinking student:', err)
      setError(err instanceof Error ? err.message : 'Failed to unlink student')
    } finally {
      setSaving(false)
    }
  }

  const handleSetPrimary = async (student: LinkedStudent) => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/guardians/${guardianId}/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPrimary: true }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update')
      }

      setSuccess('Primary guardian updated')
      await fetchGuardian()
    } catch (err) {
      console.error('Error updating:', err)
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFinancial = async (student: LinkedStudent) => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/guardians/${guardianId}/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFinanciallyResponsible: !student.isFinanciallyResponsible }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Failed to update')
      }

      setSuccess('Financial responsibility updated')
      await fetchGuardian()
    } catch (err) {
      console.error('Error updating:', err)
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <SkeletonLoader variant="card" count={2} />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Linked Students</h1>
            <p className="text-sm text-muted-foreground">
              {guardian?.name} • {linkedStudents.length} student{linkedStudents.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button onClick={() => setShowLinkDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Link Student
        </Button>
      </div>

      {/* Alerts */}
      {error && <AlertBanner type="danger" message={error} />}
      {success && <AlertBanner type="success" message={success} />}

      {/* Linked Students List */}
      <Card>
        <CardHeader>
          <CardTitle>Linked Students</CardTitle>
        </CardHeader>
        <CardContent>
          {linkedStudents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No students linked to this guardian
            </p>
          ) : (
            <div className="space-y-4">
              {linkedStudents.map((student) => (
                <div 
                  key={student.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {student.admissionNumber} • {student.className}
                        {student.streamName && ` - ${student.streamName}`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{student.relationshipType}</Badge>
                    
                    {student.isPrimary ? (
                      <Badge variant="default">
                        <Star className="h-3 w-3 mr-1" />
                        Primary
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(student)}
                        disabled={saving}
                      >
                        Set Primary
                      </Button>
                    )}
                    
                    <Button
                      variant={student.isFinanciallyResponsible ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => handleToggleFinancial(student)}
                      disabled={saving}
                    >
                      <CreditCard className="h-3 w-3 mr-1" />
                      {student.isFinanciallyResponsible ? 'Financial' : 'Set Financial'}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUnlinkStudent(student)}
                      disabled={saving}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Student Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader>
              <CardTitle>Link Student to Guardian</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-sm"
                />
              </div>

              {/* Student List */}
              <div className="max-h-48 overflow-auto border rounded-md">
                {filteredStudents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-sm">
                    No students available
                  </p>
                ) : (
                  filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                        selectedStudent?.id === student.id ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <p className="font-medium">{student.firstName} {student.lastName}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.admissionNumber} • {student.className}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {selectedStudent && (
                <>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm font-medium">Selected: {selectedStudent.firstName} {selectedStudent.lastName}</p>
                  </div>

                  {/* Relationship Type - Requirement 2.1 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Relationship Type *</label>
                    <select
                      value={linkRelationship}
                      onChange={(e) => setLinkRelationship(e.target.value as RelationshipType)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {Object.values(RelationshipType).map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={linkIsPrimary}
                        onChange={(e) => setLinkIsPrimary(e.target.checked)}
                        className="rounded border-input"
                      />
                      <span className="text-sm">Set as primary guardian</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={linkIsFinancial}
                        onChange={(e) => setLinkIsFinancial(e.target.checked)}
                        className="rounded border-input"
                      />
                      <span className="text-sm">Financially responsible for this student</span>
                    </label>
                  </div>
                </>
              )}
            </CardContent>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLinkDialog(false)
                  setSelectedStudent(null)
                  setSearchQuery('')
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLinkStudent}
                disabled={!selectedStudent || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  'Link Student'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Unlink Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!unlinkStudent}
        onClose={() => setUnlinkStudent(null)}
        onConfirm={handleUnlinkStudent}
        title="Unlink Student"
        message={`Are you sure you want to unlink ${unlinkStudent?.name} from this guardian?`}
        confirmLabel="Unlink"
        variant="danger"
        loading={saving}
      />
    </div>
  )
}
