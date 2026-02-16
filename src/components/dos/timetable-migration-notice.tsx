'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Archive, Info } from 'lucide-react';

interface TimetableMigrationNoticeProps {
  hasOldTimetables: boolean;
  oldTimetableCount: number;
  onArchiveOldTimetables: () => void;
  isArchiving: boolean;
}

/**
 * Migration Notice Component
 * 
 * Displays information about old period-based timetables and provides
 * an option to archive them for backward compatibility.
 * 
 * Requirements: 13.1-13.7
 */
export function TimetableMigrationNotice({
  hasOldTimetables,
  oldTimetableCount,
  onArchiveOldTimetables,
  isArchiving,
}: TimetableMigrationNoticeProps) {
  if (!hasOldTimetables) {
    return null;
  }

  return (
    <Alert className="border-l-4 border-l-blue-500 bg-blue-50">
      <Info className="h-5 w-5 text-blue-600" />
      <AlertDescription className="ml-2">
        <div className="space-y-3">
          <div>
            <p className="font-medium text-blue-900">
              📋 Old Timetable Format Detected
            </p>
            <p className="text-sm text-blue-800 mt-1">
              You have {oldTimetableCount} timetable{oldTimetableCount !== 1 ? 's' : ''} using the old period-based format (Period 1, Period 2, etc.).
            </p>
          </div>

          <div className="p-3 bg-white rounded-md border border-blue-200">
            <p className="text-sm font-medium text-gray-900 mb-2">
              What's the difference?
            </p>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start gap-2">
                <span className="text-red-600 font-medium">Old Format:</span>
                <span>Uses numbered periods (Period 1, Period 2, Period 3...)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-600 font-medium">New Format:</span>
                <span>Uses actual times (08:00-08:40, 08:40-09:20...)</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
            <p className="text-sm font-medium text-yellow-900 mb-2">
              ⚠️ Important Notes:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
              <li>Old timetables cannot be edited (read-only)</li>
              <li>New timetables will use the time-based format</li>
              <li>You can archive old timetables to hide them from the main list</li>
              <li>Archived timetables can still be viewed but not modified</li>
            </ul>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={onArchiveOldTimetables}
              disabled={isArchiving}
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <Archive className="w-4 h-4 mr-2" />
              {isArchiving ? 'Archiving...' : 'Archive Old Timetables'}
            </Button>
            <p className="text-xs text-gray-600">
              This will move old timetables to the archived section
            </p>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
