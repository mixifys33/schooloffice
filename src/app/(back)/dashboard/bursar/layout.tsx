'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  History
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Skeleton } from '@/components/ui/skeleton-loader'

interface BursarLayoutProps {
  children: React.ReactNode
}

interface TodayStats {
  collections: number
  transactions: number
  pendingAmount: number
  loading: boolean
  error: string | null
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard/bursar',
    icon: BarChart3,
    description: 'Financial overview and metrics'
  },
  {
    name: 'Fee Structures',
    href: '/dashboard/bursar/fee-structures',
    icon: DollarSign,
    description: 'Create and manage fee structures'
  },
  {
    name: 'Payment Tracking',
    href: '/dashboard/bursar/payment-tracking',
    icon: CreditCard,
    description: 'Track and reconcile payments'
  },
  {
    name: 'Student Fees',
    href: '/dashboard/bursar/student-fees',
    icon: Users,
    description: 'View individual student fees'
  },
  {
    name: 'Credit Balances',
    href: '/dashboard/bursar/credits',
    icon: DollarSign,
    description: 'Students with overpayment credits'
  },
  {
    name: 'Refund Requests',
    href: '/dashboard/bursar/refunds',
    icon: FileText,
    description: 'Manage refund requests'
  },
  {
    name: 'Defaulter List',
    href: '/dashboard/bursar/defaulters',
    icon: AlertTriangle,
    description: 'Students with outstanding balances'
  },
  {
    name: 'Communications',
    href: '/dashboard/bursar/communications/reminders',
    icon: MessageSquare,
    description: 'Fee-related communications'
  },
  {
    name: 'Financial Reports',
    href: '/dashboard/bursar/reports',
    icon: FileText,
    description: 'Generate comprehensive reports'
  }
]

export default function BursarLayout({ children }: BursarLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [todayStats, setTodayStats] = useState<TodayStats>({
    collections: 0,
    transactions: 0,
    pendingAmount: 0,
    loading: true,
    error: null
  })

  // Fetch real-time today's statistics
  useEffect(() => {
    const fetchTodayStats = async () => {
      try {
        setTodayStats(prev => ({ ...prev, loading: true, error: null }))
        
        const response = await fetch('/api/bursar/today-stats')
        if (!response.ok) {
          throw new Error('Failed to fetch today\'s statistics')
        }
        
        const data = await response.json()
        if (data.success) {
          setTodayStats({
            collections: data.stats.collections || 0,
            transactions: data.stats.transactions || 0,
            pendingAmount: data.stats.pendingAmount || 0,
            loading: false,
            error: null
          })
        } else {
          throw new Error(data.error || 'Failed to load statistics')
        }
      } catch (error) {
        setTodayStats(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load statistics'
        }))
      }
    }

    fetchTodayStats()
    
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchTodayStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const SidebarContent = () => (
    <>
      <div 
        className="p-4 lg:p-6 border-b"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="p-2 rounded-lg"
              style={{
                backgroundColor: 'var(--success-light)',
              }}
            >
              <TrendingUp 
                className="h-5 w-5 lg:h-6 lg:w-6" 
                style={{ color: 'var(--success)' }}
              />
            </div>
            <div>
              <h2 
                className="text-base lg:text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Bursar Module
              </h2>
              <p 
                className="text-xs lg:text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Financial Management
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 lg:p-4 space-y-1 lg:space-y-2">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link key={item.name} href={item.href} onClick={() => setSidebarOpen(false)}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start h-auto p-2 lg:p-3 text-left"
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
                  <ChevronRight className="h-4 w-4 opacity-50 lg:hidden" />
                </div>
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* Real-time Today's Stats */}
      <div 
        className="p-3 lg:p-4 border-t"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <Card className="p-3 lg:p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span 
                className="text-xs lg:text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                Today's Collections
              </span>
              <TrendingUp 
                className="h-3 w-3 lg:h-4 lg:w-4" 
                style={{ color: 'var(--success)' }}
              />
            </div>
            
            {todayStats.loading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ) : todayStats.error ? (
              <div>
                <p 
                  className="text-sm font-medium"
                  style={{ color: 'var(--danger)' }}
                >
                  Unable to load
                </p>
                <p 
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Check connection
                </p>
              </div>
            ) : (
              <div>
                <p 
                  className="text-base lg:text-lg font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {formatCurrency(todayStats.collections)}
                </p>
                <p 
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {todayStats.transactions} transactions
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Settings */}
      <div 
        className="p-3 lg:p-4 border-t"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <Button variant="ghost" className="w-full justify-start text-sm lg:text-base">
          <Settings className="h-4 w-4 mr-2" />
          Bursar Settings
        </Button>
      </div>
    </>
  )

  return (
    <div className="flex h-full">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div 
            className="absolute left-0 top-0 h-full w-80 max-w-[85vw] flex flex-col"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-default)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div 
        className="hidden lg:flex w-64 xl:w-72 border-r flex-col"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-default)',
        }}
      >
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div 
          className="lg:hidden flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 
            className="font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Bursar Module
          </h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}