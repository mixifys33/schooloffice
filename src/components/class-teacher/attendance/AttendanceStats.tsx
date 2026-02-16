'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Users, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AttendanceStatsProps {
  totalStudents: number
  presentCount: number
  absentCount: number
  lateCount: number
  excusedCount: number
  notMarkedCount: number
  classRate: number
  trend?: 'up' | 'down' | 'stable'
}

export function AttendanceStats({
  totalStudents,
  presentCount,
  absentCount,
  lateCount,
  excusedCount,
  notMarkedCount,
  classRate,
  trend = 'stable',
}: AttendanceStatsProps) {
  const stats = [
    {
      label: 'Total Students',
      value: totalStudents,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Present',
      value: presentCount,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Absent',
      value: absentCount,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Late',
      value: lateCount,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      label: 'Excused',
      value: excusedCount,
      icon: AlertTriangle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Overall Rate */}
      <div className="bg-card rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Class Attendance Rate</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-3xl font-bold">{classRate}%</p>
              {trend === 'up' && <TrendingUp className="h-5 w-5 text-green-600" />}
              {trend === 'down' && <TrendingDown className="h-5 w-5 text-red-600" />}
            </div>
          </div>
          <div className="w-24 h-24">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={classRate >= 90 ? '#10b981' : classRate >= 75 ? '#3b82f6' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={`${classRate * 2.51} 251`}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card rounded-lg border p-4">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', stat.bgColor)}>
              <stat.icon className={cn('h-5 w-5', stat.color)} />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Not Marked Warning */}
      {notMarkedCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-800">
              {notMarkedCount} student{notMarkedCount > 1 ? 's' : ''} not marked yet
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
