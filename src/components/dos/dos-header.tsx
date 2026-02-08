'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  School, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Bell,
  Settings,
  GraduationCap,
  Users
} from 'lucide-react';
import { useDoSContext } from './dos-context-provider';

interface DoSHeaderData {
  currentTerm: {
    name: string;
    academicYear: string;
    startDate: string;
    endDate: string;
    daysRemaining: number;
  };
  schoolStatus: 'OPEN' | 'EXAM_PERIOD' | 'REPORTING' | 'CLOSED';
  schoolInfo: {
    name: string;
    code: string;
  };
  criticalCount: number;
  pendingApprovals: number;
}

export function DoSHeader() {
  const [headerData, setHeaderData] = useState<DoSHeaderData | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentTerm, schoolStatus } = useDoSContext();

  useEffect(() => {
    fetchHeaderData();
  }, []);

  const fetchHeaderData = async () => {
    try {
      const response = await fetch('/api/dos/dashboard/header');
      const data = await response.json();
      setHeaderData(data);
    } catch (error) {
      console.error('Error fetching header data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'OPEN':
        return {
          label: 'Academic Period',
          color: 'bg-[var(--success-light)] text-[var(--success-dark)] border-[var(--success-light)]',
          icon: CheckCircle,
        };
      case 'EXAM_PERIOD':
        return {
          label: 'Examination Period',
          color: 'bg-[var(--warning-light)] text-[var(--warning-dark)] border-[var(--warning-light)]',
          icon: Clock,
        };
      case 'REPORTING':
        return {
          label: 'Reporting Period',
          color: 'bg-[var(--info-light)] text-[var(--info-dark)] border-[var(--info-light)]',
          icon: Calendar,
        };
      case 'CLOSED':
        return {
          label: 'Term Closed',
          color: 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)]',
          icon: School,
        };
      default:
        return {
          label: 'Unknown Status',
          color: 'bg-[var(--bg-surface)] text-[var(--text-primary)]',
          icon: AlertTriangle,
        };
    }
  };

  if (loading) {
    return (
      <header className="bg-[var(--bg-main)] shadow-sm border-b border-[var(--border-default)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="animate-pulse">
            <div className="h-6 bg-[var(--bg-surface)] rounded w-48 mb-2"></div>
            <div className="h-4 bg-[var(--bg-surface)] rounded w-32"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-8 bg-[var(--bg-surface)] rounded w-24"></div>
          </div>
        </div>
      </header>
    );
  }

  if (!headerData) {
    return (
      <header className="bg-[var(--bg-main)] shadow-sm border-b border-[var(--border-default)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">DoS Control Center</h1>
            <p className="text-sm text-[var(--text-secondary)]">Unable to load term information</p>
          </div>
        </div>
      </header>
    );
  }

  const statusConfig = getStatusConfig(headerData.schoolStatus);
  const StatusIcon = statusConfig.icon;

  return (
    <header className="bg-[var(--bg-main)] shadow-sm border-b border-[var(--border-default)] px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left Side - Term and School Info */}
        <div className="flex items-center space-x-6">
          <div>
            <div className="flex items-center gap-2">
              <School className="h-5 w-5 text-[var(--text-secondary)]" />
              <h1 className="text-xl font-semibold text-[var(--text-primary)]">
                {headerData.schoolInfo.name}
              </h1>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Calendar className="h-4 w-4" />
                <span>
                  {headerData.currentTerm.name} • {headerData.currentTerm.academicYear}
                </span>
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                {headerData.currentTerm.daysRemaining} days remaining
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Status and Alerts */}
        <div className="flex items-center space-x-4">
          {/* Critical Alerts */}
          {headerData.criticalCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--chart-red)]" />
              <span className="text-sm font-medium text-[var(--chart-red)]">
                {headerData.criticalCount} Critical Alert{headerData.criticalCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Pending Approvals */}
          {headerData.pendingApprovals > 0 && (
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-[var(--chart-yellow)]" />
              <span className="text-sm font-medium text-[var(--chart-yellow)]">
                {headerData.pendingApprovals} Pending Approval{headerData.pendingApprovals !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* School Status */}
          <Badge className={statusConfig.color}>
            <StatusIcon className="h-4 w-4 mr-1" />
            {statusConfig.label}
          </Badge>

          {/* Settings */}
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Context Bar - Shows current academic context */}
      <div className="mt-3 pt-3 border-t border-[var(--border-default)]">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center space-x-6">
            <span>Term: {headerData.currentTerm.startDate} - {headerData.currentTerm.endDate}</span>
            <span>School Code: {headerData.schoolInfo.code}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Last Updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </header>
  );
}