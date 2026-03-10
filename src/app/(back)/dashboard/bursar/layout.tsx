'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { 
  BarChart3, 
  CreditCard, 
  DollarSign, 
  FileText, 
  Calculator,
  TrendingUp,
  Users,
  Settings,
  AlertTriangle,
  Menu,
  X,
  ChevronRight,
  MessageSquare,
  Send,
  Bell,
  History,
  Mail,
  Building2,
  Moon,
  Sun
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/providers/theme-provider'

interface BursarLayoutProps {
  children: React.ReactNode
}

const navigationItems = [
  {
    section: 'Overview',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard/bursar',
        icon: BarChart3,
        description: 'Financial overview and metrics'
      }
    ]
  },
  {
    section: 'Fee Management',
    items: [
      {
        name: 'Fee Structures',
        href: '/dashboard/bursar/fee-structures',
        icon: Calculator,
        description: 'Create and manage fee structures'
      },
      {
        name: 'Student Fees',
        href: '/dashboard/bursar/student-fees',
        icon: Users,
        description: 'View individual student fees'
      }
    ]
  },
  {
    section: 'Payments',
    items: [
      {
        name: 'Payment Tracking',
        href: '/dashboard/bursar/payment-tracking',
        icon: CreditCard,
        description: 'Track and reconcile payments'
      },
      {
        name: 'Credit Balances',
        href: '/dashboard/bursar/credits',
        icon: TrendingUp,
        description: 'Students with overpayment credits'
      },
      {
        name: 'Refund Requests',
        href: '/dashboard/bursar/refunds',
        icon: History,
        description: 'Manage refund requests'
      }
    ]
  },
  {
    section: 'Collections',
    items: [
      {
        name: 'Defaulter List',
        href: '/dashboard/bursar/defaulters',
        icon: AlertTriangle,
        description: 'Students with outstanding balances'
      },
      {
        name: 'Communications',
        href: '/dashboard/bursar/communications/reminders',
        icon: Send,
        description: 'Fee reminders and notifications'
      }
    ]
  },
  {
    section: 'Reports',
    items: [
      {
        name: 'Financial Reports',
        href: '/dashboard/bursar/reports',
        icon: FileText,
        description: 'Generate comprehensive reports'
      }
    ]
  }
]

export default function BursarLayout({ children }: BursarLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { data: session } = useSession()
  
  const schoolName = (session?.user as any)?.schoolName || 'School Name'
  const bursarEmail = (session?.user as any)?.email || 'bursar@school.com'

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="p-4 lg:p-6 border-b border-[var(--border-default)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[var(--success-light)]">
              <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-[var(--success)]" />
            </div>
            <div>
              <h2 className="text-base lg:text-lg font-semibold text-[var(--text-primary)]">
                Bursar Module
              </h2>
              <p className="text-xs lg:text-sm text-[var(--text-secondary)]">
                Financial Management
              </p>
            </div>
          </div>
          
          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
              setTheme(newTheme)
            }}
            className="h-9 w-9 p-0"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          
          {/* Mobile Close Button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden ml-2"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 lg:p-4 space-y-4 lg:space-y-5 overflow-y-auto">
        {navigationItems.map((section) => (
          <div key={section.section}>
            {/* Section Header */}
            <div className="px-2 mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                {section.section}
              </h3>
            </div>
            
            {/* Section Items */}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link key={item.name} href={item.href} onClick={() => setSidebarOpen(false)}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start h-auto p-2 lg:p-3 text-left transition-all",
                        isActive && "shadow-sm"
                      )}
                    >
                      <div className="flex items-start space-x-2 lg:space-x-3 w-full">
                        <Icon className="h-4 w-4 lg:h-5 lg:w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm lg:text-base">{item.name}</p>
                          <p className="text-xs opacity-75 truncate hidden lg:block">
                            {item.description}
                          </p>
                        </div>
                        {isActive && <ChevronRight className="h-4 w-4 opacity-50" />}
                      </div>
                    </Button>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer with School Info */}
      <div className="p-3 lg:p-4 border-t border-[var(--border-default)] bg-[var(--bg-surface)]">
        {/* School Info */}
        <div className="mb-3 p-3 rounded-lg bg-[var(--bg-main)] border border-[var(--border-default)]">
          <div className="flex items-center space-x-2 mb-2">
            <Building2 className="h-4 w-4 text-[var(--text-secondary)]" />
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {schoolName}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-[var(--text-secondary)]" />
            <p className="text-xs text-[var(--text-secondary)] truncate">
              {bursarEmail}
            </p>
          </div>
        </div>
        
        {/* Settings Button */}
        <Button variant="ghost" className="w-full justify-start text-sm lg:text-base">
          <Settings className="h-4 w-4 mr-2" />
          Bursar Settings
        </Button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div 
            className="absolute left-0 top-0 h-full w-80 max-w-[85vw] flex flex-col bg-[var(--bg-elevated)] border-r border-[var(--border-default)]"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar - Fixed/Sticky */}
      <div className="hidden lg:flex w-64 xl:w-72 border-r border-[var(--border-default)] flex-col bg-[var(--bg-elevated)] h-screen sticky top-0">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-[var(--border-default)] bg-[var(--bg-main)]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-[var(--text-primary)]">
            Bursar Module
          </h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-[var(--bg-main)]">
          {children}
        </div>
      </div>
    </div>
  )
}