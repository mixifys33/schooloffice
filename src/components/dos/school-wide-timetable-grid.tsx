'use client';

import React, { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

// Types
interface ClassWithStreams {
  id: string;
  name: string;
  level: number;
  streams: {
    id: string;
    name: string;
  }[];
}

interface TimeSlot {
  slotNumber: number;
  startTime: string;
  endTime: string;
  isSpecialPeriod: boolean;
  specialPeriodName?: string;
  isAssignable: boolean;
}

interface TimetableEntry {
  id: string;
  dayOfWeek: number;
  period: number;
  classId: string;
  className: string;
  streamId?: string | null;
  streamName?: string;
  subjectCode: string;
  subjectName: string;
  teacherCode?: string;
  teacherEmployeeNumber: string;
  room?: string | null;
}

interface SchoolWideTimetableGridProps {
  classes: ClassWithStreams[];
  timeSlots: TimeSlot[];
  entries: TimetableEntry[];
  isLocked: boolean;
  onAddEntry: (day: number, period: number, classId: string, streamId?: string) => void;
  onDeleteEntry: (entryId: string) => void;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function SchoolWideTimetableGrid({
  classes,
  timeSlots,
  entries,
  isLocked,
  onAddEntry,
  onDeleteEntry,
}: SchoolWideTimetableGridProps) {
  // Sort classes by level (P1, P2... S1, S2... etc.)
  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => a.level - b.level);
  }, [classes]);

  // Build column structure: each class-stream combination gets a column
  const columns = useMemo(() => {
    const cols: Array<{ classId: string; className: string; streamId: string | null; streamName: string; displayName: string }> = [];
    
    sortedClasses.forEach((cls) => {
      if (cls.streams.length === 0) {
        // Class with no streams - single column
        cols.push({
          classId: cls.id,
          className: cls.name,
          streamId: null,
          streamName: 'No Stream',
          displayName: cls.name, // Just show class name
        });
      } else {
        // Class with streams - one column per stream
        cls.streams.forEach((stream) => {
          cols.push({
            classId: cls.id,
            className: cls.name,
            streamId: stream.id,
            streamName: stream.name,
            displayName: `${cls.name}${stream.name}`, // e.g., "S1A", "S1B"
          });
        });
      }
    });
    
    return cols;
  }, [sortedClasses]);

  // Get entry for a specific cell
  const getEntry = (day: number, period: number, classId: string, streamId: string | null): TimetableEntry | undefined => {
    return entries.find(
      (e) =>
        e.dayOfWeek === day &&
        e.period === period &&
        e.classId === classId &&
        // Handle "No Stream" case: both should be null/undefined
        (streamId === null || streamId === 'No Stream' 
          ? (!e.streamId || e.streamId === null)
          : e.streamId === streamId)
    );
  };

  // Include ALL time slots (both assignable and special periods)
  const allSlots = timeSlots;

  return (
    <div className="overflow-x-auto border rounded-lg">
      <TooltipProvider>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-blue-50 to-purple-50">
              {/* Day Column Header */}
              <th className="border border-gray-300 p-2 font-bold text-gray-700 sticky left-0 bg-white z-20 min-w-[100px]">
                Day
              </th>
              {/* Time Column Header */}
              <th className="border border-gray-300 p-2 font-bold text-blue-900 sticky left-[100px] bg-white z-20 min-w-[120px]">
                Time
              </th>
              {/* Class-Stream Column Headers */}
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="border border-gray-300 p-2 font-bold text-white bg-blue-600 min-w-[100px]"
                >
                  <div className="text-center">
                    <div>{col.displayName}</div>
                    {col.streamName === 'No Stream' && (
                      <div className="text-[10px] text-blue-100 italic">(No Stream)</div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {DAY_NAMES.map((dayName, dayIdx) => {
              const day = dayIdx + 1; // 1-5 for Mon-Fri
              
              return (
                <React.Fragment key={day}>
                  {allSlots.map((slot, slotIdx) => (
                    <tr key={`${day}-${slot.slotNumber}`} className="hover:bg-gray-50">
                      {/* Day Column - Only show on first time slot of the day */}
                      {slotIdx === 0 && (
                        <td
                          rowSpan={allSlots.length}
                          className="border border-gray-300 p-2 font-bold text-gray-700 bg-gray-50 sticky left-0 z-10 align-top"
                        >
                          {dayName}
                        </td>
                      )}
                      
                      {/* Time Column */}
                      <td className={`border border-gray-300 p-2 text-center sticky left-[100px] z-10 ${
                        slot.isSpecialPeriod ? 'bg-yellow-50' : 'bg-blue-50'
                      }`}>
                        <div className={`font-medium ${
                          slot.isSpecialPeriod ? 'text-yellow-900' : 'text-blue-900'
                        }`}>
                          {slot.isSpecialPeriod ? (
                            <>
                              <div className="font-bold">{slot.specialPeriodName}</div>
                              <div className="text-[10px]">{slot.startTime} - {slot.endTime}</div>
                            </>
                          ) : (
                            <>
                              <div>{slot.startTime} - {slot.endTime}</div>
                              <div className="text-[10px] text-gray-600">Period {slot.slotNumber}</div>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Entry Cells - One for each class-stream */}
                      {slot.isSpecialPeriod ? (
                        // Special period - show dash across all classes
                        <td
                          colSpan={columns.length}
                          className="border border-gray-300 p-2 text-center bg-yellow-50 text-yellow-700 italic"
                        >
                          {slot.specialPeriodName}
                        </td>
                      ) : (
                        // Regular period - show entries for each class
                        columns.map((col, colIdx) => {
                        const entry = getEntry(day, slot.slotNumber, col.classId, col.streamId);
                        const isNoStream = col.streamName === 'No Stream';
                        
                        return (
                          <td
                            key={colIdx}
                            className={`border border-gray-300 p-1 text-center ${
                              !isLocked && !entry ? 'cursor-pointer hover:bg-blue-50' : ''
                            }`}
                            onClick={() => {
                              if (!isLocked && !entry) {
                                onAddEntry(day, slot.slotNumber, col.classId, isNoStream ? undefined : col.streamId || undefined);
                              }
                            }}
                          >
                            {entry ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="space-y-0.5">
                                    <div className="font-bold text-blue-600">
                                      {entry.subjectCode}
                                    </div>
                                    <div className="text-[10px] text-gray-600">
                                      ({entry.teacherCode || entry.teacherEmployeeNumber})
                                    </div>
                                    {entry.room && (
                                      <div className="text-[10px] text-gray-500">
                                        {entry.room}
                                      </div>
                                    )}
                                    {!isLocked && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-5 w-full text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteEntry(entry.id);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1">
                                    <p className="font-medium">{entry.subjectName}</p>
                                    <p className="text-sm">Teacher: {entry.teacherEmployeeNumber}</p>
                                    {entry.room && <p className="text-sm">Room: {entry.room}</p>}
                                    <p className="text-xs text-gray-500">
                                      {entry.className} {entry.streamName ? `- ${entry.streamName}` : '(No Stream)'}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {dayName}, {slot.startTime}-{slot.endTime}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="text-gray-400 text-xs py-2">
                                {!isLocked && '+'}
                              </div>
                            )}
                          </td>
                        );
                      })
                      )}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </TooltipProvider>

      {/* Legend */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
        <p className="font-medium mb-2">Legend:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span>Subject Code</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-600 rounded"></div>
            <span>Teacher Code</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span>Empty Slot</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-50 border border-blue-300 rounded"></div>
            <span>Clickable (Add)</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Click empty slots to add entries. Hover over entries for details.
        </p>
      </div>
    </div>
  );
}
