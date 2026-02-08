'use client'

import React, { useState, useEffect } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  Users,
  DollarSign,
  Calendar,
  BookOpen,
  Bus,
  Utensils,
  Shirt,
  Activity,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, Column } from '@/components/ui/data-table'
import { SearchInput } from '@/components/ui/search-input'
import { MultiFilter, FilterConfig, ActiveFilter } from '@/components/ui/multi-filter'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  getResponsiveSpacingClasses,
  getResponsiveTypographyClasses,
  getTouchFriendlyClasses,
} from '@/lib/responsive'

// ============================================
// TYPES & INTERFACES
// ============================================

interface FeeStructure {
  id: string
  name: string
  description: string
  amount: number
  type: 'TUITION' | 'TRANSPORT' | 'MEALS' | 'UNIFORM' | 'BOOKS' | 'ACTIVITIES' | 'OTHER'
  frequency: 'TERMLY' | 'MONTHLY' | 'ANNUALLY' | 'ONE_TIME'
  mandatory: boolean
  classes: string[]
  dueDate?: string
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT'
  studentsAssigned: number
  totalCollected: number
  outstandingAmount: number
  createdAt: string
  updatedAt: string
}

interface FeeFormData {
  name: string
  description: string
  amount: string
  type: string
  frequency: string
  mandatory: boolean
  classes: string[]
  dueDate: string
}

interface FeeSummary {
  totalFeeStructures: number
  activeFeeStructures: number
  totalStudentsAssigned: number
  totalAmountDue: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number
}

// ============================================
// FORM COMPONENT
// ============================================

interface FeeFormProps {
  fee?: FeeStructure
  onSubmit: (data: FeeFormData) => void
  onCancel: () => void
  loading?: boolean
}

function FeeForm({ fee, onSubmit, onCancel, loading = false }: FeeFormProps) {
  const [formData, setFormData] = useState<FeeFormData>({
    name: fee?.name || '',
    description: fee?.description || '',
    amount: fee?.amount?.toString() || '',
    type: fee?.type || 'TUITION',
    frequency: fee?.frequency || 'TERMLY',
    mandatory: fee?.mandatory || true,
    classes: fee?.classes || [],
    dueDate: fee?.dueDate || '',
  })

  const feeTypes = [
    { value: 'TUITION', label: 'Tuition Fees', icon: <BookOpen className="h-4 w-4" /> },
    { value: 'TRANSPORT', label: 'Transport', icon: <Bus className="h-4 w-4" /> },
    { value: 'MEALS', label: 'Meals', icon: <Utensils className="h-4 w-4" /> },
    { value: 'UNIFORM', label: 'Uniform', icon: <Shirt className="h-4 w-4" /> },
    { value: 'BOOKS', label: 'Books & Materials', icon: <BookOpen className="h-4 w-4" /> },
    { value: 'ACTIVITIES', label: 'Activities', icon: <Activity className="h-4 w-4" /> },
    { value: 'OTHER', label: 'Other', icon: <MoreHorizontal className="h-4 w-4" /> },
  ]

  const frequencies = [
    { value: 'TERMLY', label: 'Termly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'ANNUALLY', label: 'Annually' },
    { value: 'ONE_TIME', label: 'One Time' },
  ]

  const availableClasses = [
    'Nursery', 'Baby Class', 'Middle Class', 'Top Class',
    'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'Primary 7',
    'Senior 1', 'Senior 2', 'Senior 3', 'Senior 4', 'Senior 5', 'Senior 6'
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleClassToggle = (className: string) => {
    setFormData(prev => ({
      ...prev,
      classes: prev.classes.includes(className)
        ? prev.classes.filter(c => c !== className)
        : [...prev.classes, className]
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Fee Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Tuition Fee Term 1"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (UGX) *</Label>
          <Input
            id="amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of the fee"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Fee Type *</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {feeTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    {type.icon}
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Frequency *</Label>
          <Select value={formData.frequency} onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {frequencies.map((freq) => (
                <SelectItem key={freq.value} value={freq.value}>
                  {freq.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Applicable Classes *</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {availableClasses.map((className) => (
            <Button
              key={className}
              type="button"
              variant={formData.classes.includes(className) ? "default" : "outline"}
              size="sm"
              onClick={() => handleClassToggle(className)}
              className="justify-start"
            >
              {className}
            </Button>
          ))}
        </div>
        {formData.classes.length === 0 && (
          <p className="text-sm text-[var(--chart-red)]">Please select at least one class</p>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="mandatory"
          checked={formData.mandatory}
          onChange={(e) => setFormData(prev => ({ ...prev, mandatory: e.target.checked }))}
          className="rounded border-[var(--border-default)]"
        />
        <Label htmlFor="mandatory">This is a mandatory fee</Label>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || formData.classes.length === 0}>
          {loading ? 'Saving...' : fee ? 'Update Fee' : 'Create Fee'}
        </Button>
      </div>
    </form>
  )
}

// ============================================
// MAIN COMPONENT
// ============================================

export function FeeManagement() {
  const [fees, setFees] = useState<FeeStructure[]>([])
  const [summary, setSummary] = useState<FeeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])
  const [showFeeForm, setShowFeeForm] = useState(false)
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const filterConfigs: FilterConfig[] = [
    {
      key: 'type',
      label: 'Type',
      placeholder: 'Fee Type',
      options: [
        { value: 'TUITION', label: 'Tuition' },
        { value: 'TRANSPORT', label: 'Transport' },
        { value: 'MEALS', label: 'Meals' },
        { value: 'UNIFORM', label: 'Uniform' },
        { value: 'BOOKS', label: 'Books' },
        { value: 'ACTIVITIES', label: 'Activities' },
        { value: 'OTHER', label: 'Other' }
      ]
    },
    {
      key: 'frequency',
      label: 'Frequency',
      placeholder: 'Payment Frequency',
      options: [
        { value: 'TERMLY', label: 'Termly' },
        { value: 'MONTHLY', label: 'Monthly' },
        { value: 'ANNUALLY', label: 'Annually' },
        { value: 'ONE_TIME', label: 'One Time' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      placeholder: 'Fee Status',
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
        { value: 'DRAFT', label: 'Draft' }
      ]
    }
  ]

  useEffect(() => {
    fetchFeeData()
  }, [activeFilters])

  const fetchFeeData = async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API call
      const mockSummary: FeeSummary = {
        totalFeeStructures: 12,
        activeFeeStructures: 10,
        totalStudentsAssigned: 450,
        totalAmountDue: 67500000,
        totalCollected: 52000000,
        totalOutstanding: 15500000,
        collectionRate: 77.0
      }
      setSummary(mockSummary)

      const mockFees: FeeStructure[] = [
        {
          id: '1',
          name: 'Tuition Fee Term 1',
          description: 'Academic fees for first term',
          amount: 150000,
          type: 'TUITION',
          frequency: 'TERMLY',
          mandatory: true,
          classes: ['Primary 1', 'Primary 2', 'Primary 3'],
          dueDate: '2024-02-15',
          status: 'ACTIVE',
          studentsAssigned: 120,
          totalCollected: 15600000,
          outstandingAmount: 2400000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Transport Fee',
          description: 'School bus transportation',
          amount: 50000,
          type: 'TRANSPORT',
          frequency: 'TERMLY',
          mandatory: false,
          classes: ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4'],
          status: 'ACTIVE',
          studentsAssigned: 80,
          totalCollected: 3200000,
          outstandingAmount: 800000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
      setFees(mockFees)
    } catch (error) {
      console.error('Error fetching fee data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    const filterConfig = filterConfigs.find(f => f.key === key)
    const option = filterConfig?.options.find(o => o.value === value)
    
    if (filterConfig && option) {
      const newFilter: ActiveFilter = {
        key,
        value,
        label: filterConfig.label,
        displayValue: option.label
      }
      
      setActiveFilters(prev => [
        ...prev.filter(f => f.key !== key),
        newFilter
      ])
    }
  }

  const handleFilterRemove = (key: string) => {
    setActiveFilters(prev => prev.filter(f => f.key !== key))
  }

  const handleClearAllFilters = () => {
    setActiveFilters([])
  }

  const handleCreateFee = () => {
    setEditingFee(null)
    setShowFeeForm(true)
  }

  const handleEditFee = (fee: FeeStructure) => {
    setEditingFee(fee)
    setShowFeeForm(true)
  }

  const handleFormSubmit = async (data: FeeFormData) => {
    try {
      setFormLoading(true)
      
      // Mock API call - replace with actual implementation
      console.log('Submitting fee data:', data)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setShowFeeForm(false)
      setEditingFee(null)
      fetchFeeData() // Refresh data
    } catch (error) {
      console.error('Error saving fee:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleFormCancel = () => {
    setShowFeeForm(false)
    setEditingFee(null)
  }

  const getFeeTypeIcon = (type: string) => {
    switch (type) {
      case 'TUITION': return <BookOpen className="h-4 w-4" />
      case 'TRANSPORT': return <Bus className="h-4 w-4" />
      case 'MEALS': return <Utensils className="h-4 w-4" />
      case 'UNIFORM': return <Shirt className="h-4 w-4" />
      case 'BOOKS': return <BookOpen className="h-4 w-4" />
      case 'ACTIVITIES': return <Activity className="h-4 w-4" />
      default: return <MoreHorizontal className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-[var(--success-light)] text-[var(--success-dark)]"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
      case 'INACTIVE':
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Inactive</Badge>
      case 'DRAFT':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Draft</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
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

  const feeColumns: Column<FeeStructure>[] = [
    {
      key: 'name',
      header: 'Fee Structure',
      primary: true,
      render: (_, row) => (
        <div className="flex items-start gap-3">
          <div className="p-2 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg">
            {getFeeTypeIcon(row.type)}
          </div>
          <div>
            <p className="font-medium">{row.name}</p>
            <p className="text-sm text-[var(--text-muted)]">{row.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {row.frequency}
              </Badge>
              {row.mandatory && (
                <Badge variant="outline" className="text-xs bg-[var(--danger-light)] text-[var(--chart-red)]">
                  Mandatory
                </Badge>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (_, row) => (
        <div className="text-right">
          <p className="font-bold text-lg">{formatCurrency(row.amount)}</p>
          <p className="text-sm text-[var(--text-muted)]">per {row.frequency.toLowerCase()}</p>
        </div>
      )
    },
    {
      key: 'studentsAssigned',
      header: 'Students',
      align: 'center',
      render: (_, row) => (
        <div className="text-center">
          <p className="font-medium">{row.studentsAssigned}</p>
          <p className="text-sm text-[var(--text-muted)]">assigned</p>
        </div>
      )
    },
    {
      key: 'collection',
      header: 'Collection',
      align: 'right',
      render: (_, row) => {
        const collectionRate = row.totalCollected / (row.totalCollected + row.outstandingAmount) * 100
        return (
          <div className="text-right">
            <p className="font-medium">{formatCurrency(row.totalCollected)}</p>
            <p className="text-sm text-[var(--text-muted)]">{collectionRate.toFixed(1)}% collected</p>
            {row.outstandingAmount > 0 && (
              <p className="text-sm text-[var(--chart-red)]">{formatCurrency(row.outstandingAmount)} outstanding</p>
            )}
          </div>
        )
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => getStatusBadge(row.status)
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditFee(row)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--chart-red)] hover:text-[var(--chart-red)]"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)] dark:text-[var(--text-primary)]')}>
            Fee Management
          </h2>
          <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)] dark:text-[var(--text-muted)]')}>
            Create and manage school fee structures
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className={getTouchFriendlyClasses('button')}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleCreateFee} className={getTouchFriendlyClasses('button')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Fee
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8 text-[var(--chart-green)]" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Total Due</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalAmountDue)}</p>
                <p className="text-sm text-[var(--chart-green)]">{summary.totalStudentsAssigned} students</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-[var(--chart-blue)]" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Collected</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalCollected)}</p>
                <p className="text-sm text-[var(--chart-blue)]">{summary.collectionRate.toFixed(1)}% rate</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-8 w-8 text-[var(--chart-red)]" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Outstanding</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalOutstanding)}</p>
                <p className="text-sm text-[var(--chart-red)]">Needs collection</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Users className="h-8 w-8 text-[var(--chart-purple)]" />
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Fee Structures</p>
                <p className="text-xl font-bold">{summary.activeFeeStructures}</p>
                <p className="text-sm text-[var(--chart-purple)]">of {summary.totalFeeStructures} total</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Fee Structures Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Fee Structures</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <SearchInput
                placeholder="Search fees..."
                value={searchTerm}
                onChange={setSearchTerm}
                className="w-full sm:w-64"
              />
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MultiFilter
            filters={filterConfigs}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onFilterRemove={handleFilterRemove}
            onClearAll={handleClearAllFilters}
            className="mb-4"
          />
          
          <DataTable
            columns={feeColumns}
            data={fees}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyMessage="No fee structures found"
          />
        </CardContent>
      </Card>

      {/* Fee Form Dialog */}
      <Dialog open={showFeeForm} onOpenChange={setShowFeeForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFee ? 'Edit Fee Structure' : 'Create New Fee Structure'}
            </DialogTitle>
          </DialogHeader>
          <FeeForm
            fee={editingFee || undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleFormCancel}
            loading={formLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}