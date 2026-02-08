'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TimetableDraft, 
  TimetableConflict, 
  ConflictSeverity, 
  ConflictType,
  TimetableSlot
} from '@/types/timetable';

interface TimetableConflictResolverProps {
  timetable: TimetableDraft;
  onTimetableUpdated?: (updatedTimetable: TimetableDraft) => void;
}

interface ConflictResolution {
  conflictId: string;
  action: 'resolve' | 'dismiss' | 'postpone';
  reason?: string;
  newSlot?: TimetableSlot;
}

export function TimetableConflictResolver({ 
  timetable, 
  onTimetableUpdated 
}: TimetableConflictResolverProps) {
  const [conflicts, setConflicts] = useState<TimetableConflict[]>([]);
  const [resolving, setResolving] = useState(false);
  const [resolutionMap, setResolutionMap] = useState<Record<string, ConflictResolution>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load conflicts from the timetable
    setConflicts(timetable.conflicts || []);
  }, [timetable]);

  const handleResolveConflict = async (conflictId: string, action: 'resolve' | 'dismiss' | 'postpone', reason?: string) => {
    setResolving(true);
    setError(null);
    
    try {
      // Update local resolution map
      const newResolution: ConflictResolution = {
        conflictId,
        action,
        reason
      };
      
      setResolutionMap(prev => ({
        ...prev,
        [conflictId]: newResolution
      }));

      // Update conflict status in the backend
      const response = await fetch(`/api/dos/timetable/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reason,
          resolvedBy: 'current_user_id' // This would come from auth context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to resolve conflict');
      }

      // Update local conflicts list
      setConflicts(prev => prev.filter(c => c.id !== conflictId));

      // Optionally refresh the timetable
      if (onTimetableUpdated) {
        // Fetch updated timetable
        const updatedResponse = await fetch(`/api/dos/timetables?action=list&termId=${timetable.termId}`);
        const updatedData = await updatedResponse.json();
        
        const updatedTimetable = updatedData.timetables.find((t: any) => t.id === timetable.id);
        if (updatedTimetable) {
          onTimetableUpdated(updatedTimetable);
        }
      }
    } catch (err) {
      console.error('Error resolving conflict:', err);
      setError('Failed to resolve conflict. Please try again.');
    } finally {
      setResolving(false);
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

  const getConflictTypeIcon = (type: ConflictType) => {
    switch (type) {
      case ConflictType.TEACHER_CLASH: return '👨‍🏫';
      case ConflictType.ROOM_CLASH: return '🏫';
      case ConflictType.CLASS_CLASH: return '📚';
      case ConflictType.MISSING_PERIODS: return '⏰';
      case ConflictType.TEACHER_OVERLOAD: return '⚠️';
      default: return '❓';
    }
  };

  const getAffectedEntities = (conflict: TimetableConflict) => {
    // This would normally fetch the actual entities from the backend
    // For now, we'll return a simplified representation
    return conflict.affectedSlots.join(', ') || 'Multiple slots affected';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Conflict Resolution</h3>
        <Badge variant="outline">
          {conflicts.length} {conflicts.length === 1 ? 'conflict' : 'conflicts'}
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {conflicts.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-[var(--success)] text-4xl mb-4">✓</div>
          <h4 className="text-lg font-medium mb-2">No Conflicts Found</h4>
          <p className="text-[var(--text-secondary)]">
            The timetable has been validated and no conflicts were detected.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {conflicts.map((conflict) => (
            <Card key={conflict.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getConflictTypeIcon(conflict.conflictType)}</span>
                    <h4 className="font-medium">{conflict.title}</h4>
                    <Badge className={getConflictSeverityColor(conflict.severity)}>
                      {conflict.severity}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-[var(--text-secondary)] mb-3">{conflict.description}</p>
                  
                  <div className="text-xs text-[var(--text-muted)] mb-4">
                    Affected: {getAffectedEntities(conflict)}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveConflict(conflict.id, 'resolve')}
                      disabled={resolving}
                    >
                      Resolve
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveConflict(conflict.id, 'dismiss', 'Reviewed and acknowledged')}
                      disabled={resolving}
                    >
                      Dismiss
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveConflict(conflict.id, 'postpone', 'Will address later')}
                      disabled={resolving}
                    >
                      Postpone
                    </Button>
                  </div>
                </div>
                
                <div className="text-right text-xs text-[var(--text-muted)]">
                  Detected: {new Date(conflict.createdAt).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {conflicts.length > 0 && (
        <Card className="p-6">
          <h4 className="font-medium mb-3">Bulk Actions</h4>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                // Resolve all non-critical conflicts
                conflicts
                  .filter(c => c.severity !== ConflictSeverity.CRITICAL)
                  .forEach(c => handleResolveConflict(c.id, 'resolve'));
              }}
              disabled={resolving}
            >
              Resolve Non-Critical ({conflicts.filter(c => c.severity !== ConflictSeverity.CRITICAL).length})
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                // Dismiss all info-level conflicts
                conflicts
                  .filter(c => c.severity === ConflictSeverity.INFO)
                  .forEach(c => handleResolveConflict(c.id, 'dismiss', 'Acknowledged'));
              }}
              disabled={resolving}
            >
              Dismiss Info ({conflicts.filter(c => c.severity === ConflictSeverity.INFO).length})
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}