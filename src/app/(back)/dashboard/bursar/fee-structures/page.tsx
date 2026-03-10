'use client'

import React, { useState, useEffect } from 'react'
import {
  RefreshCw,
  Filter,
  Plus,
  Edit,
  Trash2,
  Printer
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessage } from '@/components/ui/error-message'
import {
  getResponsiveSpacingClasses,
  getResponsiveTypographyClasses,
} from '@/lib/responsive'
import { PrintFeeStructures } from '@/components/bursar/print-fee-structures'

// ============================================
// TYPES & INTERFACES
// ============================================

interface FeeStructure {
  id: string
  classId: string
  className: string
  stream: string | null
  term: string
  academicYear: string
  totalAmount: number
  breakdown: {
    tuition: number
    development: number
    meals: number
    boarding: number
    optional: Array<{ name: string; amount: number }>
  }
  createdAt: string
  updatedAt: string
}

interface ClassWithStreams {
  id: string
  name: string
  level: string
  streams: Array<{ id: string; name: string }>
}

interface Term {
  id: string
  name: string
  academicYear: string
  isActive: boolean
  startDate: string
  endDate: string
}

interface AcademicYear {
  id: string
  name: string
  isActive: boolean
  terms: Array<{ id: string; name: string }>
}

// ============================================
// COMPONENTS
// ============================================

interface FeeStructureTableProps {
  structures: FeeStructure[]
  onEdit: (structure: FeeStructure) => void
  onDelete: (id: string) => void
  classes: ClassWithStreams[]
}

function FeeStructureTable({ structures, onEdit, onDelete, classes }: FeeStructureTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClassFilter, setSelectedClassFilter] = useState<string[]>([])
  const [selectedStreamFilter, setSelectedStreamFilter] = useState<string[]>([])
  const [selectedTermFilter, setSelectedTermFilter] = useState<string[]>([])
  const [selectedAcademicYearFilter, setSelectedAcademicYearFilter] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const classOptions: MultiSelectOption[] = classes.map(c => ({
    label: c.name,
    value: c.id
  }))

  // Get all unique streams, terms, and academic years
  const allStreams = React.useMemo(() => {
    const streams = new Set<string>()
    structures.forEach(s => {
      if (s.stream) streams.add(s.stream)
    })
    return Array.from(streams)
  }, [structures])

  const allTerms = React.useMemo(() => {
    const terms = new Set<string>()
    structures.forEach(s => {
      if (s.term) terms.add(s.term)
    })
    return Array.from(terms)
  }, [structures])

  const allAcademicYears = React.useMemo(() => {
    const years = new Set<string>()
    structures.forEach(s => {
      if (s.academicYear) years.add(s.academicYear)
    })
    return Array.from(years)
  }, [structures])

  const streamOptions: MultiSelectOption[] = allStreams.map(s => ({
    label: s,
    value: s
  }))

  const termOptions: MultiSelectOption[] = allTerms.map(t => ({
    label: t,
    value: t
  }))

  const academicYearOptions: MultiSelectOption[] = allAcademicYears.map(ay => ({
    label: ay,
    value: ay
  }))

  const filteredStructures = React.useMemo(() => {
    return structures.filter(structure => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        structure.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        structure.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        structure.academicYear.toLowerCase().includes(searchTerm.toLowerCase())

      // Class filter
      const matchesClass = selectedClassFilter.length === 0 || 
        selectedClassFilter.includes(structure.classId)

      // Stream filter
      const matchesStream = selectedStreamFilter.length === 0 || 
        (structure.stream && selectedStreamFilter.includes(structure.stream))

      // Term filter
      const matchesTerm = selectedTermFilter.length === 0 || 
        selectedTermFilter.includes(structure.term)

      // Academic year filter
      const matchesAcademicYear = selectedAcademicYearFilter.length === 0 || 
        selectedAcademicYearFilter.includes(structure.academicYear)

      return matchesSearch && matchesClass && matchesStream && matchesTerm && matchesAcademicYear
    })
  }, [structures, searchTerm, selectedClassFilter, selectedStreamFilter, selectedTermFilter, selectedAcademicYearFilter])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg font-semibold">Fee Structures</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search structures..."
                className="max-w-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[var(--border-default)]">
              <div>
                <label className="block text-sm font-medium mb-1">Filter by Class</label>
                <MultiSelect
                  options={classOptions}
                  selected={selectedClassFilter}
                  onChange={setSelectedClassFilter}
                  placeholder="All classes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Filter by Stream</label>
                <MultiSelect
                  options={streamOptions}
                  selected={selectedStreamFilter}
                  onChange={setSelectedStreamFilter}
                  placeholder="All streams..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Filter by Term</label>
                <MultiSelect
                  options={termOptions}
                  selected={selectedTermFilter}
                  onChange={setSelectedTermFilter}
                  placeholder="All terms..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Filter by Academic Year</label>
                <MultiSelect
                  options={academicYearOptions}
                  selected={selectedAcademicYearFilter}
                  onChange={setSelectedAcademicYearFilter}
                  placeholder="All years..."
                />
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Class
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Term
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Academic Year
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Total Amount
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Created
                </th>
                <th className="py-2 px-4 text-left text-sm font-medium text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredStructures.map((structure) => (
                <tr key={structure.id} className="border-b border-[var(--border-default)] dark:border-[var(--border-strong)]">
                  <td className="py-3 px-4">
                    <div className="font-medium">
                      {structure.className} {structure.stream ? `(${structure.stream})` : ''}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {structure.term}
                  </td>
                  <td className="py-3 px-4">
                    {structure.academicYear}
                  </td>
                  <td className="py-3 px-4 font-medium text-[var(--success)]">
                    {formatCurrency(structure.totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    {new Date(structure.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => onEdit(structure)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onDelete(structure.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

interface FeeStructureFormProps {
  structure: FeeStructure | null
  onSave: (structure: FeeStructure, termId: string, classId: string) => Promise<void>
  onCancel: () => void
  classes: ClassWithStreams[]
  terms: Term[]
  academicYears: AcademicYear[]
}

function FeeStructureForm({ structure, onSave, onCancel, classes, terms, academicYears }: FeeStructureFormProps) {
  const [formData, setFormData] = useState<FeeStructure>(structure || {
    id: '',
    classId: '',
    className: '',
    stream: null,
    term: '',
    academicYear: '',
    totalAmount: 0,
    breakdown: {
      tuition: 0,
      development: 0,
      meals: 0,
      boarding: 0,
      optional: []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [selectedTerms, setSelectedTerms] = useState<string[]>([])
  const [selectedAcademicYears, setSelectedAcademicYears] = useState<string[]>([])

  // Initialize form with existing structure data when editing
  React.useEffect(() => {
    if (structure) {
      // Find and set the class
      if (structure.classId) {
        setSelectedClasses([structure.classId])
      }

      // Find and set the term
      if (structure.term) {
        const termData = terms.find(t => t.name === structure.term)
        if (termData) {
          setSelectedTerms([termData.id])
          
          // Also set the academic year based on the term
          const academicYearData = academicYears.find(ay => ay.name === termData.academicYear)
          if (academicYearData) {
            setSelectedAcademicYears([academicYearData.id])
          }
        }
      }
    } else {
      // Reset form when creating new
      setSelectedClasses([])
      setSelectedTerms([])
      setSelectedAcademicYears([])
    }
  }, [structure, classes, terms, academicYears])

  // Filter terms based on selected academic years
  const availableTerms = React.useMemo(() => {
    if (selectedAcademicYears.length === 0) return terms
    
    const selectedAcademicYearNames = selectedAcademicYears.map(id => {
      const ay = academicYears.find(a => a.id === id)
      return ay?.name
    }).filter(Boolean)
    
    return terms.filter(term => selectedAcademicYearNames.includes(term.academicYear))
  }, [selectedAcademicYears, terms, academicYears])

  const classOptions: MultiSelectOption[] = classes.map(c => ({
    label: c.name,
    value: c.id
  }))

  const academicYearOptions: MultiSelectOption[] = academicYears.map(ay => ({
    label: ay.name,
    value: ay.id
  }))

  const termOptions: MultiSelectOption[] = availableTerms.map(t => ({
    label: `${t.name} (${t.academicYear})`,
    value: t.id
  }))

  const handleChange = (field: keyof FeeStructure, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleBreakdownChange = (field: keyof FeeStructure['breakdown'], value: number) => {
    setFormData(prev => ({
      ...prev,
      breakdown: {
        ...prev.breakdown,
        [field]: value
      }
    }))
  }

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    // If editing, just update the single structure
    if (structure) {
      // Validate selections
      if (selectedClasses.length === 0) {
        alert('Please select a class')
        return
      }

      if (selectedTerms.length === 0) {
        alert('Please select a term')
        return
      }

      // Calculate total amount
      const total = formData.breakdown.tuition + 
                    formData.breakdown.development + 
                    formData.breakdown.meals + 
                    formData.breakdown.boarding +
                    formData.breakdown.optional.reduce((sum, item) => sum + item.amount, 0)

      const classData = classes.find(c => c.id === selectedClasses[0])
      const termData = terms.find(t => t.id === selectedTerms[0])

      setIsSubmitting(true)
      try {
        await onSave({
          ...formData,
          classId: selectedClasses[0],
          className: classData?.name || '',
          stream: null,
          term: termData?.name || '',
          academicYear: termData?.academicYear || '',
          totalAmount: total
        }, selectedTerms[0], selectedClasses[0])
      } catch (error) {
        // Error is already handled in onSave
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    // Creating new structures - validate selections
    if (selectedClasses.length === 0) {
      alert('Please select at least one class')
      return
    }

    if (selectedTerms.length === 0) {
      alert('Please select at least one term')
      return
    }

    // Calculate total amount
    const total = formData.breakdown.tuition + 
                  formData.breakdown.development + 
                  formData.breakdown.meals + 
                  formData.breakdown.boarding +
                  formData.breakdown.optional.reduce((sum, item) => sum + item.amount, 0)
    
    // Create fee structures for each class/term combination
    const structures: Array<{ structure: FeeStructure; termId: string; classId: string }> = []
    
    selectedTerms.forEach(termId => {
      const termData = terms.find(t => t.id === termId)
      
      // Create for each class-term combination
      selectedClasses.forEach(classId => {
        const classData = classes.find(c => c.id === classId)
        structures.push({
          structure: {
            ...formData,
            classId,
            className: classData?.name || '',
            stream: null,
            term: termData?.name || '',
            academicYear: termData?.academicYear || '',
            totalAmount: total
          },
          termId,
          classId
        })
      })
    })
    
    // Create all fee structures
    setIsSubmitting(true)
    try {
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []
      
      for (const item of structures) {
        try {
          await onSave(item.structure, item.termId, item.classId)
          successCount++
        } catch (error) {
          errorCount++
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          errors.push(errorMsg)
          console.error('Error creating fee structure:', error)
        }
      }
      
      if (successCount > 0) {
        const message = `Successfully created ${successCount} fee structure(s)${errorCount > 0 ? `. ${errorCount} failed: ${errors[0]}` : ''}`
        alert(message)
        
        // Close form and reset if at least one succeeded
        onCancel()
      } else {
        alert(`Failed to create fee structures: ${errors[0] || 'Unknown error'}`)
      }
    } catch (error) {
      // Error is already handled in onSave
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {structure ? 'Edit Fee Structure' : 'Create Fee Structure'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!structure && (selectedClasses.length > 0 || selectedTerms.length > 0) && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {(() => {
                const classCount = selectedClasses.length || 1
                const termCount = selectedTerms.length || 1
                const totalStructures = classCount * termCount
                return `This will create ${totalStructures} fee structure(s) for the selected combinations.`
              })()}
            </p>
          </div>
        )}
        
        {structure && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Editing fee structure. You can only update one structure at a time.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Classes</label>
            <MultiSelect
              options={classOptions}
              selected={selectedClasses}
              onChange={setSelectedClasses}
              placeholder="Select classes..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Academic Years</label>
            <MultiSelect
              options={academicYearOptions}
              selected={selectedAcademicYears}
              onChange={setSelectedAcademicYears}
              placeholder="Select academic years..."
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Terms</label>
            <MultiSelect
              options={termOptions}
              selected={selectedTerms}
              onChange={setSelectedTerms}
              placeholder={selectedAcademicYears.length === 0 ? "All terms available..." : "Select terms..."}
            />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-md font-semibold mb-3">Fee Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tuition</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.breakdown.tuition}
                onChange={(e) => handleBreakdownChange('tuition', Number(e.target.value))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Development</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.breakdown.development}
                onChange={(e) => handleBreakdownChange('development', Number(e.target.value))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Meals</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.breakdown.meals}
                onChange={(e) => handleBreakdownChange('meals', Number(e.target.value))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Boarding</label>
              <Input
                type="number"
                placeholder="0"
                value={formData.breakdown.boarding}
                onChange={(e) => handleBreakdownChange('boarding', Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {structure ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                {structure ? 'Update' : 'Create'} Structure
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function FeeStructureManagementPage() {
  const [structures, setStructures] = useState<FeeStructure[]>([])
  const [classes, setClasses] = useState<ClassWithStreams[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null)
  const [showPrint, setShowPrint] = useState(false)
  const [schoolName, setSchoolName] = useState('School Name')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch fee structures, classes, terms, and academic years
        const [structuresRes, classesRes, termsRes, academicYearsRes, schoolRes] = await Promise.all([
          fetch('/api/bursar/fee-structures'),
          fetch('/api/classes'),
          fetch('/api/terms'),
          fetch('/api/settings/academic-years'),
          fetch('/api/settings/school')
        ])
        
        if (!structuresRes.ok || !classesRes.ok || !termsRes.ok || !academicYearsRes.ok) {
          throw new Error('Failed to fetch data')
        }

        const [structuresData, classesData, termsData, academicYearsData, schoolData] = await Promise.all([
          structuresRes.json(),
          classesRes.json(),
          termsRes.json(),
          academicYearsRes.json(),
          schoolRes.ok ? schoolRes.json() : { school: { name: 'School Name' } }
        ])
        
        setStructures(structuresData.structures)
        setClasses(classesData.classes)
        setTerms(termsData.terms || termsData)
        setAcademicYears(academicYearsData.academicYears)
        setSchoolName(schoolData.school?.name || 'School Name')
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleCreateNew = () => {
    setEditingStructure(null)
    setShowForm(true)
  }

  const handleEdit = (structure: FeeStructure) => {
    setEditingStructure(structure)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this fee structure?')) {
      try {
        const response = await fetch(`/api/bursar/fee-structures/${id}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to delete fee structure')
        }

        // Remove from local state after successful deletion
        setStructures(prev => prev.filter(s => s.id !== id))
        alert('Fee structure deleted successfully!')
      } catch (error) {
        console.error('Error deleting fee structure:', error)
        alert(error instanceof Error ? error.message : 'Failed to delete fee structure')
      }
    }
  }

  const handleSave = async (structure: FeeStructure, termId: string, classId: string) => {
    if (editingStructure) {
      // Update existing structure via API
      const response = await fetch(`/api/bursar/fee-structures/${structure.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(structure)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update fee structure')
      }

      const data = await response.json()
      
      // Update local state with the response from server
      setStructures(prev => prev.map(s => s.id === structure.id ? data.structure : s))
      alert('Fee structure updated successfully!')
      
      setShowForm(false)
      setEditingStructure(null)
    } else {
      // Create new structure via API
      const response = await fetch('/api/bursar/fee-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classId,
          termId: termId,
          totalAmount: structure.totalAmount,
          studentType: 'DAY', // Default to DAY, you can make this selectable
          breakdown: structure.breakdown
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create fee structure')
      }

      const data = await response.json()
      
      // Add the newly created structure from the API response to local state
      setStructures(prev => [...prev, data.structure])
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingStructure(null)
  }

  const handlePrint = () => {
    setShowPrint(true)
  }

  if (loading) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex items-center justify-between">
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Fee Structure Management
          </h1>
        </div>

        <SkeletonLoader variant="card" />
        <SkeletonLoader variant="table" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <div className="flex items-center justify-between">
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Fee Structure Management
          </h1>
        </div>

        <ErrorMessage
          title="Failed to load fee structures"
          message={error}
          suggestedActions={['Check your internet connection', 'Try refreshing the page', 'Contact support if the problem persists']}
        />
      </div>
    )
  }

  return (
    <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Fee Structure Management
          </h1>
          <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
            Define and manage fee structures for different classes and terms
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={structures.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Structure
          </Button>
        </div>
      </div>

      {showPrint && (
        <PrintFeeStructures
          structures={structures}
          schoolName={schoolName}
          onClose={() => setShowPrint(false)}
        />
      )}

      {showForm ? (
        <FeeStructureForm
          structure={editingStructure}
          onSave={handleSave}
          onCancel={handleCancel}
          classes={classes}
          terms={terms}
          academicYears={academicYears}
        />
      ) : (
        <FeeStructureTable
          structures={structures}
          onEdit={handleEdit}
          onDelete={handleDelete}
          classes={classes}
        />
      )}
    </div>
  )
}