'use client';

import { useState } from 'react';
import { Menu, X, Bell, Settings, User, LogOut, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { DoSNavigation } from './dos-navigation';
import { useDoSContext } from './dos-context-provider';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getDashboardPathForRole } from '@/components/dashboard/dashboard-router';

interface DoSStandaloneLayoutProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function DoSStandaloneLayout({ children, user }: DoSStandaloneLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentTerm, schoolStatus } = useDoSContext();
  const router = useRouter();
  const { data: session } = useSession();

  const getStatusStyles = (status: string | undefined) => {
    if (!status) return {
      backgroundColor: 'var(--bg-surface)',
      color: 'var(--text-secondary)',
    };
    
    switch (status) {
      case 'OPEN': 
        return {
          backgroundColor: 'var(--success-light)',
          color: 'var(--success-dark)',
        };
      case 'EXAM_PERIOD': 
        return {
          backgroundColor: 'var(--warning-light)',
          color: 'var(--warning-dark)',
        };
      case 'REPORTING': 
        return {
          backgroundColor: 'var(--info-light)',
          color: 'var(--info-dark)',
        };
      case 'CLOSED': 
        return {
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
        };
      default: 
        return {
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
        };
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  const handleBackToDashboard = () => {
    // Use the dashboard router logic to navigate to the correct role-specific dashboard
    // This prevents security issues by avoiding the generic /dashboard route
    if (session?.user) {
      const primaryRole = session.user.activeRole || session.user.role
      
      // Get the appropriate dashboard path for the user's role
      const dashboardPath = getDashboardPathForRole(primaryRole)
      router.push(dashboardPath)
    } else {
      // Fallback if no session
      router.push('/dashboard/school-admin')
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {/* Mobile Header */}
      <div 
        className="lg:hidden border-b sticky top-0 z-50"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Director of Studies
              </h1>
              {currentTerm && (
                <p 
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {currentTerm?.name || 'No Term'}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge 
              variant="secondary"
              style={getStatusStyles(schoolStatus)}
            >
              {schoolStatus ? schoolStatus.replace('_', ' ') : 'Unknown'}
            </Badge>
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="p-2">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div 
        className="hidden lg:block border-b sticky top-0 z-40 shadow-sm"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-default)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBackToDashboard}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div 
              className="h-6 w-px"
              style={{ backgroundColor: 'var(--border-default)' }}
            />
            <div>
              <h1 
                className="text-xl font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Director of Studies
              </h1>
              <p 
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Academic Management & Curriculum Oversight
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {currentTerm && (
              <Badge 
                variant="outline" 
                className="text-sm"
                style={{
                  borderColor: 'var(--info)',
                  color: 'var(--info-dark)',
                  backgroundColor: 'var(--info-light)',
                }}
              >
                {currentTerm?.name || 'No Term'}
              </Badge>
            )}
            <Badge 
              className="font-medium" 
              variant="secondary"
              style={getStatusStyles(schoolStatus)}
            >
              {schoolStatus ? schoolStatus.replace('_', ' ') : 'Unknown'}
            </Badge>
            <Button variant="ghost" size="sm" className="p-2">
              <Bell className="h-4 w-4" />
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="p-2">
              <Settings className="h-4 w-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <User 
                  className="h-4 w-4" 
                  style={{ color: 'var(--accent-contrast)' }}
                />
              </div>
              <div className="hidden md:block">
                <p 
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {user.name || 'User'}
                </p>
                <p 
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Director of Studies
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50" 
              onClick={() => setSidebarOpen(false)} 
            />
            <div 
              className="relative flex flex-col w-80 max-w-xs"
              style={{ backgroundColor: 'var(--bg-elevated)' }}
            >
              <div 
                className="flex items-center justify-between p-4 border-b"
                style={{ borderColor: 'var(--border-default)' }}
              >
                <h2 
                  className="text-lg font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Director of Studies
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(false)}
                  className="p-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <DoSNavigation onNavigate={() => setSidebarOpen(false)} />
              </div>
              
              {/* Mobile User Info */}
              <div 
                className="border-t p-4"
                style={{ borderColor: 'var(--border-default)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'var(--info-light)' }}
                    >
                      <User 
                        className="h-4 w-4" 
                        style={{ color: 'var(--info)' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p 
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {user.name || 'User'}
                      </p>
                      <p 
                        className="text-xs truncate"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Director of Studies
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="p-2"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <div 
          className="hidden lg:block w-64 border-r min-h-screen sticky top-16 shadow-sm"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-default)',
          }}
        >
          <div 
            className="p-4 border-b"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <h2 
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-primary)' }}
            >
              Academic Portal
            </h2>
          </div>
          <DoSNavigation />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <main className="p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}