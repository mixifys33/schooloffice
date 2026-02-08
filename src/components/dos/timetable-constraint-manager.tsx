/**
 * TIMETABLE CONSTRAINT MANAGER
 * 
 * DoS-only component for managing the complete timetable workflow:
 * 1. Configuration & Constraints
 * 2. Generation with Constraint Engine
 * 3. Conflict Detection & Resolution
 * 4. Approval Workflow
 * 5. Publication & Distribution
 * 
 * This is the main interface for the brutal timetable architecture.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Settings,
  Play,
  Pause,
  RotateCcw,
  Send,
  Globe,
  BarChart3,
  Users,
  Calendar,
  MapPin
} from 'lucide-react';

interface TimetableDraft {
  id: string;
  name: string;
  status: 'DRAFT' | 'REVIEWED' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';
  generationStatus: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  qualityScore?: number;
  conflictCount: number;
  totalSlots: number;
  filledSlots: number;
  createdAt: string;
  updatedAt: string;
}

interface ConflictSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface TimetableAnalytics {
  totalSlots: number;
  filledSlots: number;
  conflictCount: number;
  qualityScore: number;
  teacherWorkload: {
    avgPeriodsPerTeacher: number;
    overloadedTeachers: number;
    underloadedTeachers: number;
  };
  roomUtilization: {
    avgUtilization: number;
    underutilizedRooms: number;
  };
  subjectDistribution: {
    balanceScore: number;
    unevenClasses: number;
  };
}

interface TimetableConstraintManagerProps {
  schoolId: string;
  termId: string;
  onTimetableChange?: (timetableId: string) => void;
}

export function TimetableConstraintManager({ 
  schoolId, 
  termId, 
  onTimetableChange 
}: TimetableConstraintManagerProps) {
  const [drafts, setDrafts] = useState<TimetableDraft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<TimetableDraft | null>(null);
  const [conflicts, setConflicts] = useState<ConflictSummary | null>(null);
  const [analytics, setAnalytics] = useState<TimetableAnalytics | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generation settings
  const [generationSettings, setGenerationSettings] = useState({
    populationSize: 100,
    maxGenerations: 1000,
    mutationRate: 0.1,
    crossoverRate: 0.8
  });

  useEffect(() => {
    loadDrafts();
  }, [schoolId, termId]);

  useEffect(() => {
    if (selectedDraft) {
      loadConflicts(selectedDraft.id);
      loadAnalytics(selectedDraft.id);
    }
  }, [selectedDraft]);

  const loadDrafts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/dos/timetable/generate?schoolId=${schoolId}&termId=${termId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load timetables');
      }

      const data = await response.json();
      setDrafts(data.drafts || []);
      
      if (data.drafts?.length > 0 && !selectedDraft) {
        setSelectedDraft(data.drafts[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timetables');
    } finally {
      setIsLoading(false);
    }
  };

  const loadConflicts = async (draftId: string) => {
    try {
      const response = await fetch(`/api/dos/timetable/conflicts?draftId=${draftId}`);
      
      if (response.ok) {
        const data = await response.json();
        setConflicts(data.summary);
      }
    } catch (err) {
      console.error('Failed to load conflicts:', err);
    }
  };

  const loadAnalytics = async (draftId: string) => {
    try {
      const response = await fetch(`/api/dos/timetable/analytics?draftId=${draftId}`);
      
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  const generateTimetable = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('/api/dos/timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          termId,
          name: `Term Timetable ${new Date().toLocaleDateString()}`,
          settings: generationSettings
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();
      
      // Reload drafts to show new generation
      await loadDrafts();
      
      // Select the new draft
      const newDraft = drafts.find(d => d.id === data.draft.id);
      if (newDraft) {
        setSelectedDraft(newDraft);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const approveTimetable = async (action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES', notes?: string) => {
    if (!selectedDraft) return;

    try {
      const response = await fetch('/api/dos/timetable/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: selectedDraft.id,
          action,
          reviewNotes: notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Approval failed');
      }

      // Reload drafts to update status
      await loadDrafts();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  const publishTimetable = async (notifyTeachers = true, notifyStudents = false) => {
    if (!selectedDraft) return;

    try {
      const response = await fetch('/api/dos/timetable/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: selectedDraft.id,
          notifyTeachers,
          notifyStudents
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Publication failed');
      }

      // Reload drafts to update status
      await loadDrafts();

      if (onTimetableChange) {
        onTimetableChange(selectedDraft.id);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publication failed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-[var(--warning-light)] text-[var(--warning-dark)]';
      case 'REVIEWED': return 'bg-[var(--info-light)] text-[var(--info-dark)]';
      case 'APPROVED': return 'bg-[var(--success-light)] text-[var(--success-dark)]';
      case 'PUBLISHED': return 'bg-[var(--info-light)] text-[var(--info-dark)]';
      case 'ARCHIVED': return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    }
  };

  const getGenerationStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-[var(--info-light)] text-[var(--info-dark)]';
      case 'COMPLETED': return 'bg-[var(--success-light)] text-[var(--success-dark)]';
      case 'FAILED': return 'bg-[var(--danger-light)] text-[var(--danger-dark)]';
      case 'CANCELLED': return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    }
  };

  const getQualityScoreColor = (score?: number) => {
    if (!score) return 'text-[var(--text-muted)]';
    if (score >= 90) return 'text-[var(--chart-green)]';
    if (score >= 75) return 'text-[var(--chart-yellow)]';
    if (score >= 60) return 'text-[var(--chart-yellow)]';
    return 'text-[var(--chart-red)]';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--chart-blue)]"></div>
        <span className="ml-2">Loading timetable system...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Timetable Constraint Manager</h2>
          <p className="text-[var(--text-secondary)]">Generate, review, and publish timetables using constraint algorithms</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={generateTimetable}
            disabled={isGenerating}
            className="bg-[var(--chart-blue)] hover:bg-[var(--accent-hover)]"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate New
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-[var(--danger-light)] bg-[var(--danger-light)]">
          <AlertTriangle className="h-4 w-4 text-[var(--chart-red)]" />
          <AlertDescription className="text-[var(--danger-dark)]">{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timetable List */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Timetable Drafts</h3>
                
                {drafts.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-muted)]">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-[var(--text-muted)]" />
                    <p>No timetables found. Generate your first timetable to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {drafts.map((draft) => (
                      <div
                        key={draft.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedDraft?.id === draft.id 
                            ? 'border-[var(--accent-primary)] bg-[var(--info-light)]' 
                            : 'border-[var(--border-default)] hover:border-[var(--border-default)]'
                        }`}
                        onClick={() => setSelectedDraft(draft)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{draft.name}</h4>
                          <div className="flex gap-2">
                            <Badge className={getStatusColor(draft.status)}>
                              {draft.status}
                            </Badge>
                            <Badge className={getGenerationStatusColor(draft.generationStatus)}>
                              {draft.generationStatus}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm text-[var(--text-secondary)]">
                          <div>
                            <span className="font-medium">Quality:</span>
                            <span className={`ml-1 ${getQualityScoreColor(draft.qualityScore)}`}>
                              {draft.qualityScore?.toFixed(1) || 'N/A'}%
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Conflicts:</span>
                            <span className={`ml-1 ${draft.conflictCount > 0 ? 'text-[var(--chart-red)]' : 'text-[var(--chart-green)]'}`}>
                              {draft.conflictCount}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Slots:</span>
                            <span className="ml-1">{draft.filledSlots}/{draft.totalSlots}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              {selectedDraft && (
                <>
                  <Card className="p-4">
                    <h4 className="font-semibold mb-3">Quick Stats</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text-secondary)]">Quality Score</span>
                        <span className={`font-semibold ${getQualityScoreColor(selectedDraft.qualityScore)}`}>
                          {selectedDraft.qualityScore?.toFixed(1) || 'N/A'}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text-secondary)]">Conflicts</span>
                        <span className={`font-semibold ${selectedDraft.conflictCount > 0 ? 'text-[var(--chart-red)]' : 'text-[var(--chart-green)]'}`}>
                          {selectedDraft.conflictCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text-secondary)]">Completion</span>
                        <span className="font-semibold">
                          {selectedDraft.totalSlots > 0 
                            ? Math.round((selectedDraft.filledSlots / selectedDraft.totalSlots) * 100)
                            : 0
                          }%
                        </span>
                      </div>
                    </div>
                  </Card>

                  {conflicts && (
                    <Card className="p-4">
                      <h4 className="font-semibold mb-3">Conflict Summary</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--chart-red)]">Critical</span>
                          <span className="font-semibold text-[var(--chart-red)]">{conflicts.critical}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--chart-yellow)]">High</span>
                          <span className="font-semibold text-[var(--chart-yellow)]">{conflicts.high}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--chart-yellow)]">Medium</span>
                          <span className="font-semibold text-[var(--chart-yellow)]">{conflicts.medium}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[var(--chart-blue)]">Low</span>
                          <span className="font-semibold text-[var(--chart-blue)]">{conflicts.low}</span>
                        </div>
                      </div>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Conflict Detection & Resolution</h3>
            {selectedDraft ? (
              <div>
                <p className="text-[var(--text-secondary)] mb-4">
                  Intelligent conflict detection with resolution suggestions for {selectedDraft.name}
                </p>
                {/* Conflict details would be implemented here */}
                <div className="text-center py-8 text-[var(--text-muted)]">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-[var(--text-muted)]" />
                  <p>Conflict resolution interface coming soon</p>
                </div>
              </div>
            ) : (
              <p className="text-[var(--text-muted)]">Select a timetable to view conflicts</p>
            )}
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Timetable Analytics</h3>
            {selectedDraft && analytics ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-[var(--text-primary)]">Teacher Workload</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Average Periods</span>
                      <span className="font-medium">{analytics.teacherWorkload.avgPeriodsPerTeacher.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Overloaded</span>
                      <span className="font-medium text-[var(--chart-red)]">{analytics.teacherWorkload.overloadedTeachers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Underloaded</span>
                      <span className="font-medium text-[var(--chart-yellow)]">{analytics.teacherWorkload.underloadedTeachers}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-[var(--text-primary)]">Room Utilization</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Average Usage</span>
                      <span className="font-medium">{analytics.roomUtilization.avgUtilization.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Underutilized</span>
                      <span className="font-medium text-[var(--chart-yellow)]">{analytics.roomUtilization.underutilizedRooms}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-[var(--text-primary)]">Subject Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Balance Score</span>
                      <span className="font-medium">{analytics.subjectDistribution.balanceScore.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--text-secondary)]">Uneven Classes</span>
                      <span className="font-medium text-[var(--chart-yellow)]">{analytics.subjectDistribution.unevenClasses}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[var(--text-muted)]">Select a timetable to view analytics</p>
            )}
          </Card>
        </TabsContent>

        {/* Workflow Tab */}
        <TabsContent value="workflow">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Approval Workflow</h3>
            {selectedDraft ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <Badge className={`${getStatusColor(selectedDraft.status)} text-sm px-3 py-1`}>
                    {selectedDraft.status}
                  </Badge>
                  <span className="text-[var(--text-secondary)]">Current Status</span>
                </div>

                <div className="flex gap-3">
                  {selectedDraft.status === 'DRAFT' && (
                    <>
                      <Button
                        onClick={() => approveTimetable('APPROVE')}
                        className="bg-[var(--chart-green)] hover:bg-[var(--chart-green)]"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => approveTimetable('REQUEST_CHANGES')}
                        variant="outline"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Request Changes
                      </Button>
                    </>
                  )}

                  {selectedDraft.status === 'APPROVED' && (
                    <Button
                      onClick={() => publishTimetable(true, false)}
                      className="bg-[var(--chart-purple)] hover:bg-[var(--chart-purple)]"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Publish
                    </Button>
                  )}

                  {selectedDraft.status === 'PUBLISHED' && (
                    <Badge className="bg-[var(--success-light)] text-[var(--success-dark)]">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Published & Active
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[var(--text-muted)]">Select a timetable to manage workflow</p>
            )}
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Generation Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Population Size
                  </label>
                  <input
                    type="number"
                    value={generationSettings.populationSize}
                    onChange={(e) => setGenerationSettings(prev => ({
                      ...prev,
                      populationSize: parseInt(e.target.value) || 100
                    }))}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded-md"
                    min="50"
                    max="500"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Larger populations find better solutions but take longer
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Max Generations
                  </label>
                  <input
                    type="number"
                    value={generationSettings.maxGenerations}
                    onChange={(e) => setGenerationSettings(prev => ({
                      ...prev,
                      maxGenerations: parseInt(e.target.value) || 1000
                    }))}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded-md"
                    min="100"
                    max="5000"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Mutation Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={generationSettings.mutationRate}
                    onChange={(e) => setGenerationSettings(prev => ({
                      ...prev,
                      mutationRate: parseFloat(e.target.value) || 0.1
                    }))}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded-md"
                    min="0.01"
                    max="0.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Crossover Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={generationSettings.crossoverRate}
                    onChange={(e) => setGenerationSettings(prev => ({
                      ...prev,
                      crossoverRate: parseFloat(e.target.value) || 0.8
                    }))}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded-md"
                    min="0.1"
                    max="1.0"
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default TimetableConstraintManager;