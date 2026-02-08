'use client';

import { useState } from 'react';
import { Menu, X, Bell, Settings, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DoSNavigation } from './dos-navigation';
import { DoSHeader } from './dos-header';
import { useDoSContext } from './dos-context-provider';

interface DoSMobileLayoutProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function DoSMobileLayout({ children, user }: DoSMobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentTerm, schoolStatus } = useDoSContext();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-[var(--success-light)] text-[var(--success-dark)]';
      case 'EXAM_PERIOD': return 'bg-[var(--warning-light)] text-[var(--warning-dark)]';
      case 'REPORTING': return 'bg-[var(--info-light)] text-[var(--info-dark)]';
      case 'CLOSED': return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-surface)]">
      {/* Mobile Header */}
      <div className="lg:hidden bg-[var(--bg-main)] border-b border-[var(--border-default)] sticky top-0 z-50">
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
              <h1 className="text-lg font-semibold text-[var(--text-primary)]">DoS Portal</h1>
              {currentTerm && (
                <p className="text-xs text-[var(--text-muted)]">{currentTerm.name}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(schoolStatus)} variant="secondary">
              {schoolStatus.replace('_', ' ')}
            </Badge>
            <Button variant="ghost" size="sm" className="p-2">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <DoSHeader />
      </div>

      <div className="flex">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-[var(--text-primary)] bg-opacity-50" onClick={() => setSidebarOpen(false)} />
            <div className="relative flex flex-col w-80 max-w-xs bg-[var(--bg-main)]">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">Director of Studies</h2>
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
              <div className="border-t p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[var(--info-light)] rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-[var(--chart-blue)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">Director of Studies</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-64 bg-[var(--bg-main)] border-r border-[var(--border-default)] min-h-screen sticky top-0">
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