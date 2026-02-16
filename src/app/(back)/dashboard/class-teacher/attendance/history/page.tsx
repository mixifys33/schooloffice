'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, Calendar, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  typography, 
  cardStyles, 
  teacherColors
} from '@/lib/teacher-ui-standards'
import { cn } from '@/lib/utils'

export default function ClassTeacherAttendanceHistoryPage() {
  return (
    <div className="p-4 sm:p-6">
      {/* Back Navigation */}
      <Link
        href="/class-teacher/attendance"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Attendance
      </Link>

      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact, 'mt-4')}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg', teacherColors.info.bg)}>
            <Calendar className={cn('h-6 w-6', teacherColors.info.text)} />
          </div>
          <div>
            <h1 className={typography.pageTitle}>
              Attendance History
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              View past attendance records
            </p>
          </div>
        </div>
      </div>

      <Card className={cn(cardStyles.base, cardStyles.normal, 'mt-6')}>
        <CardHeader>
          <CardTitle className={cn(typography.sectionTitle)}>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className={cn(typography.h3, 'text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2')}>
              Attendance History Coming Soon
            </h3>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4')}>
              This section will display historical attendance data for your class.
            </p>
            <Link href="/class-teacher/attendance">
              <Button>
                <ClipboardList className="h-4 w-4 mr-2" />
                Back to Current Attendance
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}