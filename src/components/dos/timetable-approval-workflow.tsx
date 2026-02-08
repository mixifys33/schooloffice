'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  TimetableDraft, 
  TimetableStatus,
  TimetableConflict,
  ConflictSeverity
} from '@/types/timetable';

interface TimetableApprovalWorkflowProps {
  timetable: TimetableDraft;
  onTimetableUpdated?: (updatedTimetable: TimetableDraft) => void;
}

export function TimetableApprovalWorkflow({ 
  timetable, 
  onTimetableUpdated 
}: TimetableApprovalWorkflowProps) {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canApprove, setCanApprove] = useState(false);

  useEffect(() => {
    // Check if timetable can be approved (no critical conflicts)
    const criticalConflicts = timetable.conflicts?.filter(
      (c: TimetableConflict) => c.severity === ConflictSeverity.CRITICAL
    ).length || 0;
    
    setCanApprove(criticalConflicts === 0);
  }, [timetable]);

  const handleApprove = async () => {
    setApproving(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/dos/timetable/${timetable.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalNotes,
          overrideCriticalConflicts: !canApprove // Allow override if needed
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve timetable');
      }

      const result = await response.json();
      
      if (result.success && onTimetableUpdated) {
        // Fetch updated timetable
        const updatedResponse = await fetch(`/api/dos/timetables?action=list&termId=${timetable.termId}`);
        const updatedData = await updatedResponse.json();
        
        const updatedTimetable = updatedData.timetables.find((t: any) => t.id === timetable.id);
        if (updatedTimetable) {
          onTimetableUpdated(updatedTimetable);
        }
      }
    } catch (err) {
      console.error('Approval error:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve timetable');
    } finally {
      setApproving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/dos/timetable/${timetable.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notifyTeachers: true,
          notifyStudents: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to publish timetable');
      }

      const result = await response.json();
      
      if (result.success && onTimetableUpdated) {
        // Fetch updated timetable
        const updatedResponse = await fetch(`/api/dos/timetables?action=list&termId=${timetable.termId}`);
        const updatedData = await updatedResponse.json();
        
        const updatedTimetable = updatedData.timetables.find((t: any) => t.id === timetable.id);
        if (updatedTimetable) {
          onTimetableUpdated(updatedTimetable);
        }
      }
    } catch (err) {
      console.error('Publish error:', err);
      setError(err instanceof Error ? err.message : 'Failed to publish timetable');
    } finally {
      setPublishing(false);
    }
  };

  const getStatusColor = (status: TimetableStatus) => {
    switch (status) {
      case TimetableStatus.DRAFT: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
      case TimetableStatus.REVIEWED: return 'bg-[var(--info-light)] text-[var(--info-dark)]';
      case TimetableStatus.APPROVED: return 'bg-[var(--success-light)] text-[var(--success-dark)]';
      case TimetableStatus.PUBLISHED: return 'bg-[var(--primary)] text-white';
      case TimetableStatus.ARCHIVED: return 'bg-[var(--danger-light)] text-[var(--danger-dark)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    }
  };

  const criticalConflicts = timetable.conflicts?.filter(
    (c: TimetableConflict) => c.severity === ConflictSeverity.CRITICAL
  ).length || 0;

  const warningConflicts = timetable.conflicts?.filter(
    (c: TimetableConflict) => c.severity === ConflictSeverity.WARNING
  ).length || 0;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold">Approval Workflow</h3>
            <p className="text-[var(--text-secondary)]">
              Manage the approval and publishing process for this timetable
            </p>
          </div>
          <Badge className={getStatusColor(timetable.status)}>
            {timetable.status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-[var(--bg-surface)] p-4 rounded-lg">
            <h4 className="font-medium mb-2">Quality Score</h4>
            <div className="text-2xl font-bold text-[var(--primary)]">
              {timetable.qualityScore?.toFixed(1) || 'N/A'}%
            </div>
          </div>
          
          <div className="bg-[var(--bg-surface)] p-4 rounded-lg">
            <h4 className="font-medium mb-2">Critical Conflicts</h4>
            <div className={`text-2xl font-bold ${criticalConflicts > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
              {criticalConflicts}
            </div>
          </div>
          
          <div className="bg-[var(--bg-surface)] p-4 rounded-lg">
            <h4 className="font-medium mb-2">Warning Conflicts</h4>
            <div className={`text-2xl font-bold ${warningConflicts > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
              {warningConflicts}
            </div>
          </div>
        </div>

        {!canApprove && (
          <div className="bg-[var(--danger-light)] border border-[var(--danger-light)] rounded-lg p-4 mb-6">
            <h4 className="font-medium text-[var(--danger-dark)] mb-2">Cannot Approve</h4>
            <p className="text-sm text-[var(--chart-red)]">
              This timetable has critical conflicts that must be resolved before approval.
              Please resolve all critical conflicts first.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-[var(--danger-light)] border border-[var(--danger-light)] rounded-lg p-4 mb-6">
            <h4 className="font-medium text-[var(--danger-dark)] mb-2">Error</h4>
            <p className="text-sm text-[var(--chart-red)]">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="approval-notes" className="block text-sm font-medium mb-2">
              Approval Notes (Optional)
            </label>
            <Textarea
              id="approval-notes"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Add any notes about this approval..."
              rows={3}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleApprove}
              disabled={approving || !canApprove}
              className="bg-[var(--success)] hover:bg-[var(--success-hover)]"
            >
              {approving ? 'Approving...' : 'Approve Timetable'}
            </Button>
            
            <Button
              onClick={handlePublish}
              disabled={publishing || timetable.status !== TimetableStatus.APPROVED}
              variant="outline"
            >
              {publishing ? 'Publishing...' : 'Publish Timetable'}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Approval History</h3>
        
        <div className="space-y-3">
          {timetable.approvedAt ? (
            <div className="flex items-center gap-3 p-3 bg-[var(--success-light)] rounded-lg">
              <div className="w-2 h-2 bg-[var(--success)] rounded-full"></div>
              <div>
                <div className="font-medium">Approved by DoS</div>
                <div className="text-sm text-[var(--text-secondary)]">
                  {new Date(timetable.approvedAt).toLocaleString()} 
                  {timetable.approvalNotes && ` - ${timetable.approvalNotes}`}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 text-[var(--text-secondary)] italic">
              Not approved yet
            </div>
          )}
          
          {timetable.publishedAt ? (
            <div className="flex items-center gap-3 p-3 bg-[var(--primary-light)] rounded-lg">
              <div className="w-2 h-2 bg-[var(--primary)] rounded-full"></div>
              <div>
                <div className="font-medium">Published</div>
                <div className="text-sm text-[var(--text-secondary)]">
                  {new Date(timetable.publishedAt).toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 text-[var(--text-secondary)] italic">
              Not published yet
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}