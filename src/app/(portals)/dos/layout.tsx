'use client'

import React, { ReactNode } from 'react'
import {
  Home,
  BookOpen,
  ClipboardCheck,
  Calculator,
  FileText,
  Users,
  Calendar,
  Settings,
} from 'lucide-react'
import {
  DashboardLayout,
  type NavItem,
} from '@/components/layout'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { DoSContextBar } from '@/components/dashboard/dos-context-bar'

/**
 * DoS Portal Layout - Academic Command Center
 * 
 * This is the home of academic authority. The DoS portal provides:
 * - Situational awareness across all academic operations
 * - Control over curriculum, assessments, exams, and reporting
 * - Academic integrity enforcement and audit trails
 * - New curriculum compliance monitoring
 * 
 * Navigation is organized by control zones, not CRUD operations.
 */

interface DoSLayoutProps {
  children: ReactNode
}

// DoS Navigation - Organized by Control Zones
const navItems: NavItem[] = [
  { 
    href: '/dos', 
    label: 'Command Center', 
    icon: <Home className="h-5 w-5" />,
    description: 'Academic situational awareness'
  },
  { 
    href: '/dashboard/dos/curriculum/subjects', 
    label: 'Subject Management', 
    icon: <BookOpen className="h-5 w-5" />,
    description: 'Subject approval & structure'
  },
  { 
    href: '/dos/curriculum', 
    label: 'Curriculum Control', 
    icon: <BookOpen className="h-5 w-5" />,
    description: 'Curriculum oversight'
  },
  { 
    href: '/dos/assessments', 
    label: 'Assessment Control', 
    icon: <ClipboardCheck className="h-5 w-5" />,
    description: 'CA monitoring (20%)'
  },

  { 
    href: '/dos/scores', 
    label: 'Score Control', 
    icon: <Calculator className="h-5 w-5" />,
    description: '20/80 merge & approval'
  },
  { 
    href: '/dos/reports', 
    label: 'Report Control', 
    icon: <FileText className="h-5 w-5" />,
    description: 'Official document release'
  },
  { 
    href: '/dos/promotion', 
    label: 'Promotion Control', 
    icon: <Users className="h-5 w-5" />,
    description: 'Academic progression'
  },
  { 
    href: '/dos/timetable', 
    label: 'Timetable Control', 
    icon: <Calendar className="h-5 w-5" />,
    description: 'Academic logistics'
  },

  { 
    href: '/dos/settings', 
    label: 'DoS Settings', 
    icon: <Settings className="h-5 w-5" />,
    description: 'Academic configuration'
  },
]

export default function DoSLayout({ children }: DoSLayoutProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-surface)] dark:bg-[var(--text-primary)]">
      {/* DoS Context Bar - Shows term, academic year, school status */}
      <DoSContextBar className="sticky top-0 z-30" />
      
      <DashboardLayout
        navItems={navItems}
        brandText="SchoolOffice"
        subtitle="Director of Studies"
        useBottomNav={true}
        headerContent={
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-2 px-2 sm:px-3 py-1 bg-[var(--info-light)] dark:bg-[var(--info-dark)] rounded-full">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[var(--chart-blue)] rounded-full animate-pulse"></div>
              <span className="text-xs sm:text-sm font-medium text-[var(--info-dark)] dark:text-[var(--info)]">
                Academic Authority
              </span>
            </div>
            <ThemeToggle />
          </div>
        }
        sidebarFooter={
          <div className="text-sm text-[var(--text-muted)] space-y-1 px-2">
            <p className="font-medium text-xs sm:text-sm">DoS Portal</p>
            <p className="text-xs">Academic Command Center</p>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-1.5 h-1.5 bg-[var(--success)] rounded-full"></div>
              <span>System Operational</span>
            </div>
          </div>
        }
      >
        <div className="p-3 sm:p-4 lg:p-6">
          {children}
        </div>
      </DashboardLayout>
    </div>
  )
}