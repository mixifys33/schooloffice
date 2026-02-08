'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard,
  BookOpen,
  FileText,
  TrendingUp,
  Shield,
  Users,
  Calendar,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Overview',
    href: '/dashboard/dos',
    icon: LayoutDashboard,
  },
  {
    name: 'Assignments',
    href: '/dashboard/dos/assignments',
    icon: Users,
  },
  {
    name: 'Subjects',
    href: '/dashboard/dos/subjects',
    icon: BookOpen,
    children: [
      { name: 'Control Center', href: '/dashboard/dos/subjects', icon: BarChart3 },
      { name: 'Performance', href: '/dashboard/dos/subjects/performance', icon: TrendingUp },
      { name: 'Interventions', href: '/dashboard/dos/subjects/interventions', icon: Shield },
      { name: 'Subject Management', href: '/dashboard/dos/subjects/management', icon: Settings },
    ],
  },
  {
    name: 'Curriculum',
    href: '/dashboard/dos/curriculum',
    icon: GraduationCap,
    children: [
      { name: 'Timetable', href: '/dashboard/dos/curriculum/timetable', icon: Calendar },
      { name: 'Approvals', href: '/dashboard/dos/curriculum/approvals', icon: Shield },
    ],
  },
  {
    name: 'Assessments',
    href: '/dashboard/dos/assessments',
    icon: FileText,
    children: [
      { name: 'CA Monitoring', href: '/dashboard/dos/assessments/monitoring', icon: FileText },
      { name: 'Plans', href: '/dashboard/dos/assessments/plans', icon: Calendar },
      { name: 'Performance', href: '/dashboard/dos/assessments/performance', icon: BarChart3 },
    ],
  },

  {
    name: 'Reports',
    href: '/dashboard/dos/reports',
    icon: GraduationCap,
    children: [
      { name: 'Generate', href: '/dashboard/dos/reports/generate', icon: FileText },
      { name: 'Review', href: '/dashboard/dos/reports/review', icon: Shield },
      { name: 'Templates', href: '/dashboard/dos/reports/templates', icon: Settings },
    ],
  },

];

interface DoSNavigationProps {
  onNavigate?: () => void;
}

export function DoSNavigation({ onNavigate }: DoSNavigationProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const isExpanded = (itemName: string) => {
    return expandedItems.includes(itemName) || 
           navigationItems.find(item => item.name === itemName)?.children?.some(child => isActive(child.href));
  };

  const handleNavigation = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Navigation Header */}
      <div 
        className="p-4 border-b"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div className="flex items-center space-x-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <GraduationCap 
              className="h-5 w-5" 
              style={{ color: 'var(--accent-contrast)' }}
            />
          </div>
          <div>
            <h2 
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              DoS Portal
            </h2>
            <p 
              className="text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              Academic Management
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => (
          <div key={item.name}>
            {item.children ? (
              <div>
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 border',
                    'hover:opacity-80'
                  )}
                  style={{
                    backgroundColor: isActive(item.href) ? 'var(--accent-primary)' : 'transparent',
                    color: isActive(item.href) ? 'var(--accent-contrast)' : 'var(--text-primary)',
                    borderColor: isActive(item.href) ? 'var(--accent-primary)' : 'transparent',
                  }}
                >
                  <div className="flex items-center">
                    <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  {isExpanded(item.name) ? (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
                
                {isExpanded(item.name) && (
                  <div 
                    className="mt-1 ml-4 space-y-1 border-l pl-4"
                    style={{ borderColor: 'var(--border-default)' }}
                  >
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        onClick={handleNavigation}
                        className={cn(
                          'flex items-center px-3 py-2 text-sm rounded-md transition-all duration-200',
                          'hover:opacity-80',
                          isActive(child.href) && 'border-l-2 font-medium'
                        )}
                        style={{
                          backgroundColor: isActive(child.href) ? 'var(--bg-surface)' : 'transparent',
                          color: isActive(child.href) ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          borderLeftColor: isActive(child.href) ? 'var(--accent-primary)' : 'transparent',
                        }}
                      >
                        <child.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                        <span className="truncate">{child.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={item.href}
                onClick={handleNavigation}
                className={cn(
                  'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 border',
                  'hover:opacity-80'
                )}
                style={{
                  backgroundColor: isActive(item.href) ? 'var(--accent-primary)' : 'transparent',
                  color: isActive(item.href) ? 'var(--accent-contrast)' : 'var(--text-primary)',
                  borderColor: isActive(item.href) ? 'var(--accent-primary)' : 'transparent',
                }}
              >
                <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
                {item.badge && (
                  <Badge variant="destructive" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div 
        className="p-4 border-t"
        style={{ borderColor: 'var(--border-default)' }}
      >
        <div 
          className="text-xs text-center"
          style={{ color: 'var(--text-secondary)' }}
        >
          DoS Academic Portal
        </div>
      </div>
    </div>
  );
}