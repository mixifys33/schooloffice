'use client'

import React from 'react'
import { AlertTriangle, TrendingDown, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StudentAlert {
  studentId: string
  studentName: string
  admissionNumber: string
  attendanceRate: number
  daysAbsent: number
  consecutiveAbsences?: number
}

interface LowAttendanceAlertsProps {
  alerts: StudentAlert[]
  onStudentClick?: (studentId: string) => void
}

export function LowAttendanceAlerts({
  alerts,
  onStudentClick,
}: LowAttendanceAlertsProps) {
  if (alerts.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-green-600" />
          </div>
          <p className="font-medium">No Low Attendance Alerts</p>
          <p className="text-sm text-muted-foreground">
            All students have good attendance rates
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <h3 className="font-semibold">Low Attendance Alerts ({alerts.length})</h3>
      </div>

      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.studentId}
            onClick={() => onStudentClick?.(alert.studentId)}
            className={cn(
              'bg-card rounded-lg border p-4 transition-colors',
              onStudentClick && 'cursor-pointer hover:bg-accent'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  alert.attendanceRate < 50 ? 'bg-red-100' :
                  alert.attendanceRate < 75 ? 'bg-yellow-100' : 'bg-orange-100'
                )}>
                  <User className={cn(
                    'h-5 w-5',
                    alert.attendanceRate < 50 ? 'text-red-600' :
                    alert.attendanceRate < 75 ? 'text-yellow-600' : 'text-orange-600'
                  )} />
                </div>
                <div>
                  <p className="font-medium">{alert.studentName}</p>
                  <p className="text-sm text-muted-foreground">{alert.admissionNumber}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-600">{alert.attendanceRate}%</span>
                    </div>
                    <span className="text-muted-foreground">
                      {alert.daysAbsent} days absent
                    </span>
                    {alert.consecutiveAbsences && alert.consecutiveAbsences >= 3 && (
                      <span className="text-red-600 font-medium">
                        {alert.consecutiveAbsences} consecutive absences
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                alert.attendanceRate < 50 ? 'bg-red-100 text-red-700' :
                alert.attendanceRate < 75 ? 'bg-yellow-100 text-yellow-700' :
                'bg-orange-100 text-orange-700'
              )}>
                {alert.attendanceRate < 50 ? 'Critical' :
                 alert.attendanceRate < 75 ? 'Warning' : 'Monitor'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
