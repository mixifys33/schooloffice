'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { TimetableGrid } from './timetable-grid';
import { TimetableGenerator } from './timetable-generator';
import { TimetableConflictResolver } from './timetable-conflict-resolver';
import { TimetableAnalytics } from './timetable-analytics';
import { TimetableConfiguration } from './timetable-configuration';
import { 
  TimetableDraft, 
  TimetableStatus, 
  ConflictSeverity,
  TimetableAnalytics as TimetableAnalyticsType 
} from '@/types/timetable';

interface Class {
  id: string;
  name: string;
  level: number;
}

interface Term {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
}

interface TimetableEntry {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;
  period: number;
  startTime: string;
  endTime: string;
}

export function TimetableManager() {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [viewMode, setViewMode] = useState<'view' | 'edit' | 'generate' | 'conflicts' | 'analytics' | 'config'>('view');
  const [currentTimetable, setCurrentTimetable] = useState<TimetableDraft | null>(null);
  const [timetables, setTimetables] = useState<TimetableDraft[]>([]);
  const [analytics, setAnalytics] = useState<TimetableAnalyticsType | null>(null);
  const [loading, setLoading] = useState(false);

  // Load timetables when term/year changes
  useEffect(() => {
    if (selectedAcademicYear && selectedTerm) {
      loadTimetables();
    }
  }, [selectedAcademicYear, selectedTerm]);

  const loadTimetables = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dos/timetables?termId=${selectedTerm}&action=list`);
      const data = await response.json();
      
      if (data.timetables) {
        setTimetables(data.timetables);
        // Set current timetable to the latest published or approved one
        const current = data.timetables.find((t: TimetableDraft) => 
          t.status === TimetableStatus.PUBLISHED
        ) || data.timetables.find((t: TimetableDraft) => 
          t.status === TimetableStatus.APPROVED
        ) || data.timetables[0];
        
        setCurrentTimetable(current || null);
        
        // Load analytics if we have a current timetable
        if (current) {
          loadAnalytics(current.id);
        }
      }
    } catch (error) {
      console.error('Failed to load timetables:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async (timetableId: string) => {
    try {
      const response = await fetch(`/api/dos/timetables?timetableId=${timetableId}&action=analytics`);
      const data = await response.json();
      
      if (data.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleTimetableGenerated = (newTimetable: TimetableDraft) => {
    setCurrentTimetable(newTimetable);
    setTimetables(prev => [newTimetable, ...prev]);
    setViewMode('view');
    loadAnalytics(newTimetable.id);
  };

  const handleTimetableUpdated = (updatedTimetable: TimetableDraft) => {
    setCurrentTimetable(updatedTimetable);
    setTimetables(prev => prev.map(t => t.id === updatedTimetable.id ? updatedTimetable : t));
    loadAnalytics(updatedTimetable.id);
  };

  const getStatusColor = (status: TimetableStatus) => {
    switch (status) {
      case TimetableStatus.DRAFT: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
      case TimetableStatus.REVIEWED: return 'bg-[var(--info-light)] text-[var(--info-dark)]';
      case TimetableStatus.APPROVED: return 'bg-[var(--success-light)] text-[var(--success-dark)]';
      case TimetableStatus.PUBLISHED: return 'bg-[var(--info-light)] text-[var(--info-dark)]';
      case TimetableStatus.ARCHIVED: return 'bg-[var(--danger-light)] text-[var(--danger-dark)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    }
  };

  const getConflictSeverityColor = (severity: ConflictSeverity) => {
    switch (severity) {
      case ConflictSeverity.CRITICAL: return 'bg-[var(--danger-light)] text-[var(--danger-dark)]';
      case ConflictSeverity.WARNING: return 'bg-[var(--warning-light)] text-[var(--warning-dark)]';
      case ConflictSeverity.INFO: return 'bg-[var(--info-light)] text-[var(--info-dark)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    }
  };

  // Mock data - replace with actual API calls
  const classes: Class[] = [
    { id: '1', name: 'S1', level: 1 },
    { id: '2', name: 'S2', level: 2 },
    { id: '3', name: 'S3', level: 3 },
  ];

  const terms: Term[] = [
    { id: '1', name: 'Term 1', startDate: '2024-02-01', endDate: '2024-05-15' },
    { id: '2', name: 'Term 2', startDate: '2024-06-01', endDate: '2024-09-15' },
    { id: '3', name: 'Term 3', startDate: '2024-10-01', endDate: '2024-12-15' },
  ];

  const academicYears: AcademicYear[] = [
    { id: '1', name: '2024', startDate: '2024-02-01', endDate: '2024-12-15' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Status and Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Timetable Management</h1>
          <p className="text-[var(--text-secondary)]">
            DoS Authority - Complete timetable lifecycle management
          </p>
          {currentTimetable && (
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getStatusColor(currentTimetable.status)}>
                {currentTimetable.status}
              </Badge>
              <span className="text-sm text-[var(--text-muted)]">
                Version {currentTimetable.version}
              </span>
              {currentTimetable.conflicts && currentTimetable.conflicts.length > 0 && (
                <Badge className={getConflictSeverityColor(ConflictSeverity.WARNING)}>
                  {currentTimetable.conflicts.length} conflicts
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'config' ? 'default' : 'outline'}
            onClick={() => setViewMode('config')}
          >
            Configure
          </Button>
          <Button
            variant={viewMode === 'view' ? 'default' : 'outline'}
            onClick={() => setViewMode('view')}
          >
            View
          </Button>
          <Button
            variant={viewMode === 'edit' ? 'default' : 'outline'}
            onClick={() => setViewMode('edit')}
            disabled={!currentTimetable || currentTimetable.status === TimetableStatus.PUBLISHED}
          >
            Edit
          </Button>
          <Button
            variant={viewMode === 'generate' ? 'default' : 'outline'}
            onClick={() => setViewMode('generate')}
          >
            Generate
          </Button>
          <Button
            variant={viewMode === 'conflicts' ? 'default' : 'outline'}
            onClick={() => setViewMode('conflicts')}
            disabled={!currentTimetable}
          >
            Conflicts
          </Button>
          <Button
            variant={viewMode === 'analytics' ? 'default' : 'outline'}
            onClick={() => setViewMode('analytics')}
            disabled={!currentTimetable}
          >
            Analytics
          </Button>
        </div>
      </div>

      {/* Selection Controls */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Academic Year</label>
            <Select
              value={selectedAcademicYear}
              onValueChange={setSelectedAcademicYear}
            >
              <option value="">Select Academic Year</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Term</label>
            <Select
              value={selectedTerm}
              onValueChange={setSelectedTerm}
            >
              <option value="">Select Term</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Class (for view)</label>
            <Select
              value={selectedClass}
              onValueChange={setSelectedClass}
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Timetable Selection */}
        {timetables.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Timetable</label>
            <div className="flex gap-2 flex-wrap">
              {timetables.map((timetable) => (
                <Button
                  key={timetable.id}
                  variant={currentTimetable?.id === timetable.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setCurrentTimetable(timetable);
                    loadAnalytics(timetable.id);
                  }}
                  className="flex items-center gap-2"
                >
                  <Badge className={`${getStatusColor(timetable.status)} text-xs`}>
                    {timetable.status}
                  </Badge>
                  Version {timetable.version}
                  {timetable.conflicts && timetable.conflicts.length > 0 && (
                    <span className="text-xs text-[var(--chart-red)]">
                      ({timetable.conflicts.length})
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--chart-blue)] mx-auto"></div>
            <p className="text-sm text-[var(--text-secondary)] mt-2">Loading timetables...</p>
          </div>
        )}

        {/* Main Content Area */}
        {selectedTerm && selectedAcademicYear && (
          <div className="mt-6">
            {viewMode === 'config' && (
              <TimetableConfiguration
                onConfigurationUpdated={() => {
                  // Refresh timetables after configuration changes
                  loadTimetables();
                }}
              />
            )}
            
            {viewMode === 'generate' && (
              <TimetableGenerator
                termId={selectedTerm}
                academicYearId={selectedAcademicYear}
                onTimetableGenerated={handleTimetableGenerated}
              />
            )}
            
            {viewMode === 'conflicts' && currentTimetable && (
              <TimetableConflictResolver
                timetable={currentTimetable}
                onTimetableUpdated={handleTimetableUpdated}
              />
            )}
            
            {viewMode === 'analytics' && currentTimetable && analytics && (
              <TimetableAnalytics
                timetable={currentTimetable}
                analytics={analytics}
              />
            )}
            
            {(viewMode === 'view' || viewMode === 'edit') && currentTimetable && (
              <TimetableGrid
                timetable={currentTimetable}
                classId={selectedClass}
                editable={viewMode === 'edit'}
                onTimetableUpdated={handleTimetableUpdated}
              />
            )}
          </div>
        )}

        {(!selectedClass || !selectedTerm || !selectedAcademicYear) && !loading && (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <p>Please select Academic Year and Term to manage timetables</p>
          </div>
        )}
      </Card>
    </div>
  );
}