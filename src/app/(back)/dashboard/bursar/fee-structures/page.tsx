'use client'

import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  Users,
  AlertTriangle,
  Calendar,
  CreditCard,
  PieChart,
  BarChart3,
  RefreshCw,
  Download,
  Filter,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Plus,
  Receipt,
  Send,
  Edit,
  Trash2,
  Copy
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessage } from '@/components/ui/error-message'
import { cn } from '@/lib/utils'
import {
  getResponsiveGridClasses,
  getResponsiveSpacingClasses,
  getResponsiveTypographyClasses,
  getTouchFriendlyClasses,
} from '@/lib/responsive'

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

interface Class {
  id: string
  name: string
  streams: string[]
}

// ============================================
// COMPONENTS
// ============================================

interface FeeStructureTableProps {
  structures: FeeStructure[]
  onEdit: (structure: FeeStructure) => void
  onDelete: (id: string) => void
}

function FeeStructureTable({ structures, onEdit, onDelete }: FeeStructureTableProps) {
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg font-semibold">Fee Structures</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search structures..."
              className="max-w-xs"
            />
            <Button size="sm" variant="outline">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
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
              {structures.map((structure) => (
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
  onSave: (structure: FeeStructure) => void
  onCancel: () => void
}

function FeeStructureForm({ structure, onSave, onCancel }: FeeStructureFormProps) {
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

  const handleChange = (field: keyof FeeStructure, value: any) => {
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

  const handleSubmit = () => {
    // Calculate total amount
    const total = formData.breakdown.tuition + 
                  formData.breakdown.development + 
                  formData.breakdown.meals + 
                  formData.breakdown.boarding +
                  formData.breakdown.optional.reduce((sum, item) => sum + item.amount, 0)
    
    onSave({
      ...formData,
      totalAmount: total
    })
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Class</label>
            <select 
              className="w-full p-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md bg-[var(--bg-main)] dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)]"
              value={formData.className}
              onChange={(e) => handleChange('className', e.target.value)}
            >
              <option value="">Select Class</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
              <option value="P5">P5</option>
              <option value="P6">P6</option>
              <option value="S1">S1</option>
              <option value="S2">S2</option>
              <option value="S3">S3</option>
              <option value="S4">S4</option>
              <option value="S5">S5</option>
              <option value="S6">S6</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Stream</label>
            <select 
              className="w-full p-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md bg-[var(--bg-main)] dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)]"
              value={formData.stream || ''}
              onChange={(e) => handleChange('stream', e.target.value || null)}
            >
              <option value="">No Stream</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="Science">Science</option>
              <option value="Arts">Arts</option>
              <option value="Commerce">Commerce</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Term</label>
            <select 
              className="w-full p-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md bg-[var(--bg-main)] dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)]"
              value={formData.term}
              onChange={(e) => handleChange('term', e.target.value)}
            >
              <option value="">Select Term</option>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Academic Year</label>
            <Input
              type="text"
              placeholder="e.g., 2024/2025"
              value={formData.academicYear}
              onChange={(e) => handleChange('academicYear', e.target.value)}
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
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {structure ? 'Update' : 'Create'} Structure
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null)

  useEffect(() => {
    const fetchFeeStructures = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/bursar/fee-structures')
        
        if (!response.ok) {
          throw new Error('Failed to fetch fee structures')
        }

        const data = await response.json()
        
        setStructures(data.structures)
      } catch (err) {
        console.error('Error fetching fee structures:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch fee structures')
      } finally {
        setLoading(false)
      }
    }

    fetchFeeStructures()
  }, [])

  const handleCreateNew = () => {
    setEditingStructure(null)
    setShowForm(true)
  }

  const handleEdit = (structure: FeeStructure) => {
    setEditingStructure(structure)
    setShowForm(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this fee structure?')) {
      setStructures(prev => prev.filter(s => s.id !== id))
    }
  }

  const handleSave = (structure: FeeStructure) => {
    if (editingStructure) {
      // Update existing structure
      setStructures(prev => prev.map(s => s.id === structure.id ? structure : s))
    } else {
      // Add new structure
      setStructures(prev => [...prev, { ...structure, id: Date.now().toString() }])
    }
    setShowForm(false)
    setEditingStructure(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingStructure(null)
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
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Structure
        </Button>
      </div>

      {showForm ? (
        <FeeStructureForm
          structure={editingStructure}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <FeeStructureTable
          structures={structures}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}