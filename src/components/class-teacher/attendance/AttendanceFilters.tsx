'use client'

import React from 'react'
import { Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AttendanceFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  rateFilter: string
  onRateFilterChange: (rate: string) => void
}

export function AttendanceFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  rateFilter,
  onRateFilterChange,
}: AttendanceFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name or admission number..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger>
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Students</SelectItem>
          <SelectItem value="present">Present Only</SelectItem>
          <SelectItem value="absent">Absent Only</SelectItem>
          <SelectItem value="late">Late Only</SelectItem>
          <SelectItem value="excused">Excused Only</SelectItem>
          <SelectItem value="not-marked">Not Marked</SelectItem>
        </SelectContent>
      </Select>

      {/* Rate Filter */}
      <Select value={rateFilter} onValueChange={onRateFilterChange}>
        <SelectTrigger>
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Filter by rate" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Rates</SelectItem>
          <SelectItem value="excellent">Excellent (≥90%)</SelectItem>
          <SelectItem value="good">Good (75-89%)</SelectItem>
          <SelectItem value="fair">Fair (50-74%)</SelectItem>
          <SelectItem value="poor">Poor (&lt;50%)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
