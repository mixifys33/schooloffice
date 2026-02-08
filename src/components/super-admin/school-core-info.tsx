'use client'

import React from 'react'
import { User, Mail, Phone, Calendar, CreditCard } from 'lucide-react'

/**
 * School Core Information Component
 * Requirement 6.4: Display core information including admin name, admin email, phone, registration date, and current plan details
 */

interface SchoolCoreInfoProps {
  coreInfo: {
    adminName: string | null
    adminEmail: string | null
    phone: string | null
    registrationDate: Date
    currentPlan: string
    planDetails: {
      tier: string | null
      billingCycle: string | null
    }
  }
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function SchoolCoreInfo({ coreInfo }: SchoolCoreInfoProps) {
  return (
    <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">
        Core Information
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[var(--info-light)] dark:bg-[var(--info-dark)]/20">
            <User className="h-5 w-5 text-[var(--chart-blue)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Admin Name</p>
            <p className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {coreInfo.adminName || 'Not available'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[var(--success-light)] dark:bg-[var(--success-dark)]/20">
            <Mail className="h-5 w-5 text-[var(--chart-green)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Admin Email</p>
            <p className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)] break-all">
              {coreInfo.adminEmail || 'Not available'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[var(--info-light)] dark:bg-[var(--info-dark)]/20">
            <Phone className="h-5 w-5 text-[var(--chart-purple)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Phone</p>
            <p className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {coreInfo.phone || 'Not available'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/20">
            <Calendar className="h-5 w-5 text-[var(--chart-yellow)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Registration Date</p>
            <p className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {formatDate(coreInfo.registrationDate)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/20">
            <CreditCard className="h-5 w-5 text-[var(--chart-purple)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Current Plan</p>
            <p className="text-base font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
              {coreInfo.currentPlan}
            </p>
            {coreInfo.planDetails.billingCycle && (
              <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1">
                Billing: {coreInfo.planDetails.billingCycle}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
