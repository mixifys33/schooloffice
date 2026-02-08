'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TimetableDraft, 
  TimetableSlot,
  TimetableStatus,
  DayOfWeek
} from '@/types/timetable';

interface TimetableGridProps {
  timetable: TimetableDraft;
  classId?: string;
  editable?: boolean;
  onTimetableUpdated?: (updatedTimetable: TimetableDraft) => void;
}

interface GridData {
  [day: number]: {
    [period: number]: TimetableSlot | null;
  };
}

export function TimetableGrid({ 
  timetable, 
  classId,
  editable = false,
  onTimetableUpdated
}: TimetableGridProps) {
  const [gridData, setGridData] = useState<GridData>({});
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Days of the week (1 = Monday, 7 = Sunday)
  const daysOfWeek = [
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' },
    { id: 7, name: 'Sunday' }
  ];

  // Generate periods (assuming 8 periods per day)
  const periods = Array.from({ length: 8 }, (_, i) => i + 1);

  useEffect(() => {
    if (timetable?.slots) {
      processData();
    }
  }, [timetable]);

  const processData = () => {
    const data: GridData = {};

    // Initialize grid
    daysOfWeek.forEach(day => {
      data[day.id] = {};
      periods.forEach(period => {
        data[day.id][period] = null;
      });
    });

    // Populate with slots
    timetable.slots.forEach(slot => {
      if (!classId || slot.classId === classId) {
        if (!data[slot.dayOfWeek]) {
          data[slot.dayOfWeek] = {};
        }
        if (!data[slot.dayOfWeek][slot.period]) {
          data[slot.dayOfWeek][slot.period] = slot;
        }
      }
    });

    setGridData(data);
  };

  const handleSlotClick = (slot: TimetableSlot | null, day: number, period: number) => {
    if (editable && slot) {
      setSelectedSlot(slot);
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

  const getSlotColor = (slot: TimetableSlot | null) => {
    if (!slot) return 'bg-[var(--bg-surface)] border-dashed';
    if (slot.isDoubleSlot) return 'bg-[var(--primary-light)] border-solid';
    return 'bg-[var(--bg-surface)] border-solid';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">
            {classId ? `Class Timetable` : 'Master Timetable'}
          </h3>
          <p className="text-[var(--text-secondary)]">
            {timetable.name} • Version {timetable.version}
          </p>
        </div>
        <Badge className={getStatusColor(timetable.status)}>
          {timetable.status}
        </Badge>
      </div>

      {error && (
        <div className="bg-[var(--danger-light)] border border-[var(--danger-light)] rounded-lg p-4">
          <h4 className="font-medium text-[var(--danger-dark)] mb-2">Error</h4>
          <p className="text-sm text-[var(--chart-red)]">{error}</p>
        </div>
      )}

      <Card className="p-4 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-2 border border-[var(--border)] bg-[var(--bg-surface)] sticky left-0 z-10 min-w-[100px]">
                Period
              </th>
              {daysOfWeek.map(day => (
                <th 
                  key={day.id} 
                  className="p-2 border border-[var(--border)] bg-[var(--bg-surface)] min-w-[140px]"
                >
                  {day.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map(period => (
              <tr key={period}>
                <td className="p-2 border border-[var(--border)] bg-[var(--bg-surface)] sticky left-0 z-10 min-w-[100px] text-center font-medium">
                  {period}
                </td>
                {daysOfWeek.map(day => {
                  const slot = gridData[day.id]?.[period] || null;
                  return (
                    <td 
                      key={`${day.id}-${period}`} 
                      className={`p-1 border border-[var(--border)] min-h-[80px] cursor-pointer hover:bg-[var(--bg-hover)] ${getSlotColor(slot)}`}
                      onClick={() => handleSlotClick(slot, day.id, period)}
                    >
                      {slot ? (
                        <div className="p-2 h-full flex flex-col justify-between">
                          <div>
                            <div className="font-medium text-sm truncate">
                              {slot.subject?.name || slot.subjectId}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] truncate">
                              {slot.teacher?.firstName} {slot.teacher?.lastName}
                            </div>
                          </div>
                          {slot.roomName && (
                            <div className="text-xs text-[var(--text-muted)] mt-1">
                              {slot.roomName}
                            </div>
                          )}
                          {slot.isDoubleSlot && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Double
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                          —
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {selectedSlot && editable && (
        <Card className="p-6">
          <h4 className="text-lg font-medium mb-4">Slot Details</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Subject</div>
              <div className="font-medium">
                {selectedSlot.subject?.name || selectedSlot.subjectId}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Teacher</div>
              <div className="font-medium">
                {selectedSlot.teacher?.firstName} {selectedSlot.teacher?.lastName}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Day</div>
              <div className="font-medium">
                {daysOfWeek.find(d => d.id === selectedSlot.dayOfWeek)?.name}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Period</div>
              <div className="font-medium">Period {selectedSlot.period}</div>
            </div>
            
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Room</div>
              <div className="font-medium">{selectedSlot.roomName || 'Unassigned'}</div>
            </div>
            
            <div>
              <div className="text-sm text-[var(--text-secondary)]">Class</div>
              <div className="font-medium">{selectedSlot.class?.name || selectedSlot.classId}</div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedSlot(null)}
            >
              Close
            </Button>
            <Button>Modify Slot</Button>
          </div>
        </Card>
      )}

      <div className="flex justify-between items-center text-sm text-[var(--text-secondary)]">
        <div>
          {timetable.slots.length} total slots •{' '}
          {timetable.conflicts?.length || 0} conflicts
        </div>
        <div>
          Generated: {new Date(timetable.generatedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}