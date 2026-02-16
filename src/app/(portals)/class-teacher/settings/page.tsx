'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Settings, User, Shield, Key } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  typography, 
  cardStyles, 
  teacherColors
} from '@/lib/teacher-ui-standards'
import { cn } from '@/lib/utils'

export default function ClassTeacherSettingsPage() {
  return (
    <div className="p-4 sm:p-6">
      {/* Back Navigation */}
      <Link
        href="/class-teacher"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Page Header */}
      <div className={cn(cardStyles.base, cardStyles.compact, 'mt-4')}>
        <div className="flex items-center gap-4">
          <div className={cn('p-3 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-lg', teacherColors.info.bg)}>
            <Settings className={cn('h-6 w-6', teacherColors.info.text)} />
          </div>
          <div>
            <h1 className={typography.pageTitle}>
              Settings
            </h1>
            <p className={cn(typography.body, 'text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1')}>
              Manage your account preferences
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className={cn(cardStyles.base, cardStyles.normal)}>
          <CardHeader>
            <CardTitle className={cn(typography.sectionTitle)}>Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Link href="/class-teacher/profile" className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] hover:bg-[var(--bg-main)] dark:hover:bg-[var(--border-strong)] transition-colors">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-[var(--text-muted)]" />
                  <div>
                    <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">My Profile</div>
                    <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">View and edit your profile</div>
                  </div>
                </div>
                <Button size="sm" variant="outline">View</Button>
              </Link>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-[var(--text-muted)]" />
                  <div>
                    <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Profile Information</div>
                    <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Update personal details</div>
                  </div>
                </div>
                <Button size="sm" variant="outline">Edit</Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-[var(--text-muted)]" />
                  <div>
                    <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Security</div>
                    <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Password and access</div>
                  </div>
                </div>
                <Button size="sm" variant="outline">Manage</Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-[var(--text-muted)]" />
                  <div>
                    <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Permissions</div>
                    <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">View your access rights</div>
                  </div>
                </div>
                <Button size="sm" variant="outline">View</Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      <Card className={cn(cardStyles.base, cardStyles.normal, 'mt-6')}>
        <CardHeader>
          <CardTitle className={cn(typography.sectionTitle)}>Help & Support</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Link href="#" className="block p-3 rounded-lg bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] hover:bg-[var(--bg-main)] dark:hover:bg-[var(--border-strong)]">
              <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">User Guide</div>
              <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Learn how to use the system</div>
            </Link>
            <Link href="#" className="block p-3 rounded-lg bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] hover:bg-[var(--bg-main)] dark:hover:bg-[var(--border-strong)]">
              <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Contact Support</div>
              <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Get help with issues</div>
            </Link>
            <Link href="#" className="block p-3 rounded-lg bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] hover:bg-[var(--bg-main)] dark:hover:bg-[var(--border-strong)]">
              <div className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">System Updates</div>
              <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">View release notes</div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}