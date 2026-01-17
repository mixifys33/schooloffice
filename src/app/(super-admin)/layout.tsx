'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Building2, CreditCard, MessageSquare, FileText, Settings, Shield, LogOut, AlertTriangle, ChevronDown, Menu, X, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface NavItem {
  href: string
  label: string
  icon: ReactNode
  children?: { href: string; label: string }[]
}

const navItems: NavItem[] = [
  { href: '/super-admin', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
  { href: '/super-admin/schools', label: 'Schools', icon: <Building2 className="h-5 w-5" />,
    children: [
      { href: '/super-admin/schools', label: 'All Schools' },
      { href: '/super-admin/schools/new', label: 'Add School' },
      { href: '/super-admin/pilots', label: 'Pilot Programs' },
    ],
  },
  { href: '/super-admin/expected-revenue', label: 'Expected Revenue', icon: <DollarSign className="h-5 w-5" /> },
  { href: '/super-admin/subscriptions', label: 'Subscriptions', icon: <CreditCard className="h-5 w-5" /> },
  { href: '/super-admin/sms-monitoring', label: 'SMS Monitoring', icon: <MessageSquare className="h-5 w-5" /> },
  { href: '/super-admin/audit', label: 'Audit Logs', icon: <FileText className="h-5 w-5" /> },
  { href: '/super-admin/settings', label: 'System Settings', icon: <Settings className="h-5 w-5" /> },
]


export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>(['Schools'])

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user) { router.push('/admin/login'); return }
    if (session.user.role !== 'SUPER_ADMIN') { router.push('/dashboard') }
  }, [session, status, router])

  const handleLogout = () => signOut({ callbackUrl: '/admin/login' })
  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label])
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Access Denied</h1>
          <p className="text-slate-400 mb-4">Super Admin privileges required.</p>
          <Button onClick={() => router.push('/admin/login')} variant="outline">Go to Login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-800 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-300"><Menu className="h-6 w-6" /></button>
          <Shield className="h-5 w-5 text-purple-500" />
          <span className="font-semibold text-white">Super Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-5 w-5 text-slate-300" /></Button>
        </div>
      </header>

      {sidebarOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 z-50 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-500" />
            <div>
              <span className="font-semibold text-white">SchoolOffice</span>
              <span className="block text-xs text-purple-400">Super Admin</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400"><X className="h-5 w-5" /></button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-7.5rem)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            const hasChildren = item.children && item.children.length > 0
            const isExpanded = expandedItems.includes(item.label)

            if (hasChildren) {
              return (
                <div key={item.href}>
                  <button onClick={() => toggleExpanded(item.label)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                    <span className="flex items-center gap-3">{item.icon}{item.label}</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  {isExpanded && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children?.map((child) => (
                        <Link key={child.href} href={child.href} className="block px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white">{child.label}</Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            }
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}>
                {item.icon}{item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-medium">
              {session.user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Super Admin</p>
              <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64 pt-14 lg:pt-0">
        <header className="hidden lg:flex h-14 items-center justify-between px-6 border-b border-slate-800 bg-slate-900 sticky top-0 z-40">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-900/50 border border-purple-700 rounded-full">
            <Shield className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Super Admin Console</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign Out">
              <LogOut className="h-5 w-5 text-slate-400" />
            </Button>
          </div>
        </header>
        <main className="min-h-[calc(100vh-3.5rem)]">{children}</main>
      </div>
    </div>
  )
}
