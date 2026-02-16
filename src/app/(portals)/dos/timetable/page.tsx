'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Zap,
  Download,
  FileText,
  Archive,
  School,
} from 'lucide-react';
import '@/styles/print-timetable.css';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TimetableGenerationDialog } from '@/components/dos/timetable-generation-dialog';
import { TimetableConfigurationPanel } from '@/components/dos/timetable-configuration-panel';
import { TimetableMigrationNotice } from '@/components/dos/timetable-migration-notice';
import { SchoolWideTimetableGrid } from '@/components/dos/school-wide-timetable-grid';
import { calculateTimeSlots, formatTimeRange, formatTimeRangeCompact, type TimeSlot, type SpecialPeriod } from '@/lib/time-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Types
type TimetableStatus = 'DRAFT' | 'APPROVED';

interface Timetable {
  id: string;
  timetableName: string;
  classId: string | null; // null for school-wide timetables
  className: string;
  termId: string;
  termName: string;
  termDates: { start: Date; end: Date };
  status: TimetableStatus;
  dosApproved: boolean;
  dosApprovedAt: Date | null;
  isLocked: boolean;
  isTimeBased: boolean; // NEW: true = time-based, false = period-based (legacy)
  isArchived: boolean; // NEW: true = archived (read-only)
  isSchoolWide: boolean; // NEW: true = school-wide (all classes)
  weekCount: number;
  entryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TimetableEntry {
  id: string;
  dayOfWeek: number; // 1-7
  period: number;
  startTime?: string; // NEW: "HH:MM" format
  endTime?: string; // NEW: "HH:MM" format
  isSpecialPeriod?: boolean; // NEW
  specialPeriodName?: string; // NEW
  classId: string; // For school-wide timetables (required for grid compatibility)
  className: string; // For school-wide timetables (required for grid compatibility)
  streamId?: string | null; // For school-wide timetables
  streamName?: string; // For school-wide timetables
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string;
  teacherName: string;
  teacherCode?: string; // NEW: Teacher code (e.g., "JD001")
  teacherEmployeeNumber: string;
  room: string | null;
  isDoubleLesson: boolean;
  notes: string | null;
}

interface ClassInfo {
  id: string;
  name: string;
  level: string;
}

interface TermInfo {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
}

interface SubjectInfo {
  id: string; // curriculumSubjectId
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  isCore: boolean;
  periodsPerWeek: number;
  usageCount?: number; // NEW: How many times already used
  isAtLimit?: boolean; // NEW: Whether limit reached
}

interface TeacherInfo {
  id: string;
  name: string;
  employeeNumber: string;
  role: string;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function DoSTimetablePage() {
  // State
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedTimetableId, setSelectedTimetableId] = useState<string | null>(null);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper data
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [terms, setTerms] = useState<TermInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [teachers, setTeachers] = useState<TeacherInfo[]>([]);
  const [streams, setStreams] = useState<{ id: string; name: string; classId: string }[]>([]); // NEW: Streams for school-wide

  // NEW: Classes with streams for school-wide grid
  const [classesWithStreams, setClassesWithStreams] = useState<Array<{
    id: string;
    name: string;
    level: number;
    streams: { id: string; name: string }[];
  }>>([]);

  // Create timetable dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTimetableClassId, setNewTimetableClassId] = useState('');
  const [newTimetableTermId, setNewTimetableTermId] = useState('');
  const [newTimetableName, setNewTimetableName] = useState('');
  const [isSchoolWide, setIsSchoolWide] = useState(false); // NEW: School-wide option
  const [isCreating, setIsCreating] = useState(false);

  // Add entry dialog
  const [showAddEntryDialog, setShowAddEntryDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState(''); // For school-wide timetables
  const [selectedStreamId, setSelectedStreamId] = useState(''); // For school-wide timetables
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [isDoubleLesson, setIsDoubleLesson] = useState(false);
  const [entryNotes, setEntryNotes] = useState('');
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [entryConflicts, setEntryConflicts] = useState<string[]>([]);

  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [timetableToDelete, setTimetableToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Generation dialog
  const [showGenerationDialog, setShowGenerationDialog] = useState(false);

  // Configuration and time slots (NEW)
  const [hasConfiguration, setHasConfiguration] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [configStartTime, setConfigStartTime] = useState('08:00');
  const [configEndTime, setConfigEndTime] = useState('16:00');
  const [configPeriodDuration, setConfigPeriodDuration] = useState(40);
  const [configSpecialPeriods, setConfigSpecialPeriods] = useState<SpecialPeriod[]>([]);

  // Migration notice (NEW)
  const [oldTimetablesCount, setOldTimetablesCount] = useState(0);
  const [isArchivingOld, setIsArchivingOld] = useState(false);

  // Get selected timetable
  const selectedTimetable = timetables.find((t) => t.id === selectedTimetableId);

  // Auto-dismiss success messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load timetables on mount
  useEffect(() => {
    loadTimetables();
    loadHelperData();
    loadConfiguration(); // Load configuration
  }, []);

  // Generate time slots when configuration changes
  useEffect(() => {
    if (hasConfiguration) {
      generateTimeSlots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasConfiguration, configStartTime, configEndTime, configPeriodDuration, configSpecialPeriods]);

  // Load entries when timetable selected
  useEffect(() => {
    if (selectedTimetableId) {
      loadTimetableEntries(selectedTimetableId);
      // Load classes with streams for school-wide timetables
      if (selectedTimetable?.isSchoolWide) {
        loadClassesWithStreams();
      }
    } else {
      setEntries([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTimetableId]);

  // Load subjects when class selected (for create dialog)
  useEffect(() => {
    if (newTimetableClassId) {
      loadSubjects(newTimetableClassId);
    }
  }, [newTimetableClassId]);

  // Load subjects when timetable selected (for add entry)
  useEffect(() => {
    if (selectedTimetable && selectedTimetable.classId) {
      loadSubjects(selectedTimetable.classId, selectedTimetable.id);
    }
  }, [selectedTimetable]);

  // API Functions
  const loadTimetables = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/dos/timetable');
      const data = await response.json();

      console.log('📊 [Frontend] Timetables response:', {
        ok: response.ok,
        status: response.status,
        dataKeys: Object.keys(data),
        timetablesCount: data.timetables?.length,
        timetables: data.timetables,
      });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load timetables');
      }

      setTimetables(data.timetables || []);
      setOldTimetablesCount(data.oldTimetablesCount || 0);
    } catch (err) {
      console.error('Error loading timetables:', err);
      setError(err instanceof Error ? err.message : 'Failed to load timetables');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTimetableEntries = async (timetableId: string) => {
    try {
      const response = await fetch(`/api/dos/timetable/${timetableId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load entries');
      }

      setEntries(data.entries || []);
    } catch (err) {
      console.error('Error loading entries:', err);
      setError(err instanceof Error ? err.message : 'Failed to load entries');
    }
  };

  const loadHelperData = async () => {
    try {
      console.log('🔍 Loading helper data (classes, terms, teachers)...');
      const [classesRes, termsRes, teachersRes] = await Promise.all([
        fetch('/api/dos/timetable/helpers?type=classes'),
        fetch('/api/dos/timetable/helpers?type=terms'),
        fetch('/api/dos/timetable/helpers?type=teachers'),
      ]);

      const [classesData, termsData, teachersData] = await Promise.all([
        classesRes.json(),
        termsRes.json(),
        teachersRes.json(),
      ]);

      console.log('📊 Helper data loaded:', {
        classes: classesData.classes?.length || 0,
        terms: termsData.terms?.length || 0,
        teachers: teachersData.teachers?.length || 0,
      });

      setClasses(classesData.classes || []);
      setTerms(termsData.terms || []);
      setTeachers(teachersData.teachers || []);
    } catch (err) {
      console.error('❌ Error loading helper data:', err);
    }
  };

  const loadSubjects = async (classId: string, timetableId?: string) => {
    try {
      console.log('🔍 Loading subjects for classId:', classId, 'timetableId:', timetableId);
      const url = new URL('/api/dos/timetable/helpers', window.location.origin);
      url.searchParams.set('type', 'subjects');
      url.searchParams.set('classId', classId);
      if (timetableId) {
        url.searchParams.set('timetableId', timetableId);
      }
      
      const response = await fetch(url.toString());
      const data = await response.json();

      console.log('📊 Subjects response:', { ok: response.ok, status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load subjects');
      }

      console.log('✅ Subjects loaded:', data.subjects?.length || 0);
      setSubjects(data.subjects || []);
    } catch (err) {
      console.error('❌ Error loading subjects:', err);
    }
  };

  // Load streams for a specific class (NEW)
  const loadStreams = async (classId: string) => {
    try {
      console.log('🔍 Loading streams for classId:', classId);
      const url = new URL('/api/dos/timetable/helpers', window.location.origin);
      url.searchParams.set('type', 'streams');
      url.searchParams.set('classId', classId);
      
      const response = await fetch(url.toString());
      const data = await response.json();

      console.log('📊 Streams response:', { ok: response.ok, status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load streams');
      }

      console.log('✅ Streams loaded:', data.streams?.length || 0);
      setStreams(data.streams || []);
    } catch (err) {
      console.error('❌ Error loading streams:', err);
      setStreams([]);
    }
  };

  // Load all classes with their streams for school-wide timetable (NEW)
  const loadClassesWithStreams = async () => {
    try {
      console.log('🔍 Loading all classes with streams for school-wide timetable...');
      
      // Fetch all classes
      const classesResponse = await fetch('/api/dos/timetable/helpers?type=classes');
      const classesData = await classesResponse.json();
      
      if (!classesResponse.ok) {
        throw new Error(classesData.error || 'Failed to load classes');
      }

      const allClasses = classesData.classes || [];
      console.log('📊 Loaded classes:', allClasses.length);

      // Fetch streams for each class
      const classesWithStreamsData = await Promise.all(
        allClasses.map(async (cls: ClassInfo) => {
          try {
            const streamsResponse = await fetch(
              `/api/dos/timetable/helpers?type=streams&classId=${cls.id}`
            );
            const streamsData = await streamsResponse.json();
            
            return {
              id: cls.id,
              name: cls.name,
              level: parseInt(cls.level) || 0,
              streams: streamsData.streams || [],
            };
          } catch (err) {
            console.error(`❌ Error loading streams for class ${cls.name}:`, err);
            return {
              id: cls.id,
              name: cls.name,
              level: parseInt(cls.level) || 0,
              streams: [],
            };
          }
        })
      );

      console.log('✅ Classes with streams loaded:', classesWithStreamsData.length);
      setClassesWithStreams(classesWithStreamsData);
    } catch (err) {
      console.error('❌ Error loading classes with streams:', err);
      setClassesWithStreams([]);
    }
  };

  // Load configuration (NEW)
  const loadConfiguration = async () => {
    try {
      console.log('🔍 [Timetable Page] Loading configuration...');
      const response = await fetch('/api/dos/timetable/config');
      const data = await response.json();

      console.log('📊 [Timetable Page] Configuration response:', {
        ok: response.ok,
        exists: data.exists,
        hasConfig: !!data.config,
      });

      if (response.ok && (data.exists || data.config)) {
        console.log('✅ [Timetable Page] Configuration loaded:', data.config);
        setHasConfiguration(true);
        setConfigStartTime(data.config.startTime);
        setConfigEndTime(data.config.endTime);
        setConfigPeriodDuration(data.config.periodDurationMinutes);
        setConfigSpecialPeriods(data.config.specialPeriods || []);
      } else {
        console.log('⚠️ [Timetable Page] No configuration found');
        setHasConfiguration(false);
      }
    } catch (err) {
      console.error('❌ [Timetable Page] Error loading configuration:', err);
      setHasConfiguration(false);
    }
  };

  // Generate time slots based on configuration (NEW)
  const generateTimeSlots = () => {
    try {
      console.log('🔧 [Timetable Page] Generating time slots...');
      const slots = calculateTimeSlots(
        configStartTime,
        configEndTime,
        configPeriodDuration,
        configSpecialPeriods,
        1 // Monday for default display
      );
      setTimeSlots(slots);
      console.log(`✅ [Timetable Page] Generated ${slots.length} time slots`);
    } catch (err) {
      console.error('❌ [Timetable Page] Error generating time slots:', err);
      setTimeSlots([]);
    }
  };

  // Handle configuration saved (NEW)
  const handleConfigurationSaved = () => {
    loadConfiguration();
    setSuccessMessage('Configuration saved! Time slots updated.');
  };

  const handleCreateTimetable = async () => {
    try {
      setIsCreating(true);
      setError(null);

      const response = await fetch('/api/dos/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: isSchoolWide ? undefined : newTimetableClassId,
          termId: newTimetableTermId,
          timetableName: newTimetableName || undefined,
          isSchoolWide, // NEW: Pass school-wide flag
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create timetable');
      }

      setSuccessMessage(data.message || 'Timetable created successfully');
      setShowCreateDialog(false);
      setNewTimetableClassId('');
      setNewTimetableTermId('');
      setNewTimetableName('');
      setIsSchoolWide(false);
      await loadTimetables();
      setSelectedTimetableId(data.timetable.id);
    } catch (err) {
      console.error('Error creating timetable:', err);
      setError(err instanceof Error ? err.message : 'Failed to create timetable');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTimetable = async () => {
    if (!timetableToDelete) return;

    try {
      setIsDeleting(true);
      setError(null);

      const response = await fetch(`/api/dos/timetable/${timetableToDelete}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete timetable');
      }

      setSuccessMessage(data.message || 'Timetable deleted successfully');
      setShowDeleteDialog(false);
      setTimetableToDelete(null);
      if (selectedTimetableId === timetableToDelete) {
        setSelectedTimetableId(null);
      }
      await loadTimetables();
    } catch (err) {
      console.error('Error deleting timetable:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete timetable');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApproveTimetable = async (timetableId: string) => {
    try {
      setError(null);

      const response = await fetch(`/api/dos/timetable/${timetableId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve timetable');
      }

      setSuccessMessage(data.message || 'Timetable approved successfully');
      await loadTimetables();
    } catch (err) {
      console.error('Error approving timetable:', err);
      setError(err instanceof Error ? err.message : 'Failed to approve timetable');
    }
  };

  const handleToggleLock = async (timetableId: string, currentLockStatus: boolean) => {
    try {
      setError(null);

      const response = await fetch(`/api/dos/timetable/${timetableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: !currentLockStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update timetable');
      }

      setSuccessMessage(data.message || 'Timetable updated successfully');
      await loadTimetables();
    } catch (err) {
      console.error('Error updating timetable:', err);
      setError(err instanceof Error ? err.message : 'Failed to update timetable');
    }
  };

  const handleAddEntry = async () => {
    if (!selectedTimetableId || selectedDay === null || selectedPeriod === null) return;

    // For school-wide timetables, class selection is required
    if (selectedTimetable?.isSchoolWide && !selectedClassId) {
      setError('Please select a class for this entry');
      return;
    }

    try {
      setIsAddingEntry(true);
      setError(null);
      setEntryConflicts([]);

      const response = await fetch(`/api/dos/timetable/${selectedTimetableId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          curriculumSubjectId: selectedSubjectId,
          teacherId: selectedTeacherId,
          dayOfWeek: selectedDay,
          period: selectedPeriod,
          classId: selectedTimetable?.isSchoolWide ? selectedClassId : undefined, // NEW
          streamId: selectedTimetable?.isSchoolWide && selectedStreamId ? selectedStreamId : undefined, // NEW
          room: selectedRoom || null,
          isDoubleLesson,
          notes: entryNotes || null,
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        // Conflicts detected
        setEntryConflicts(data.conflicts || []);
        return;
      }

      if (!response.ok) {
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || 'Failed to add entry';
        throw new Error(errorMessage);
      }

      setSuccessMessage(data.message || 'Entry added successfully');
      setShowAddEntryDialog(false);
      resetAddEntryForm();
      await loadTimetableEntries(selectedTimetableId);
      await loadTimetables(); // Refresh entry counts
    } catch (err) {
      console.error('Error adding entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to add entry');
    } finally {
      setIsAddingEntry(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!selectedTimetableId) return;

    try {
      setError(null);

      const response = await fetch(
        `/api/dos/timetable/${selectedTimetableId}/entries/${entryId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete entry');
      }

      setSuccessMessage(data.message || 'Entry deleted successfully');
      await loadTimetableEntries(selectedTimetableId);
      await loadTimetables(); // Refresh entry counts
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    }
  };

  const resetAddEntryForm = () => {
    setSelectedDay(null);
    setSelectedPeriod(null);
    setSelectedClassId('');
    setSelectedStreamId('');
    setSelectedSubjectId('');
    setSelectedTeacherId('');
    setSelectedRoom('');
    setIsDoubleLesson(false);
    setEntryNotes('');
    setEntryConflicts([]);
  };

  // Download timetable as CSV
  const handleDownloadTimetable = () => {
    if (!selectedTimetable || !entries.length) {
      setError('No timetable data to download');
      return;
    }

    try {
      // Prepare CSV data
      const csvRows: string[] = [];
      
      // Header
      csvRows.push(`Timetable: ${selectedTimetable.timetableName}`);
      csvRows.push(`Class: ${selectedTimetable.className}`);
      csvRows.push(`Term: ${selectedTimetable.termName}`);
      csvRows.push(`Status: ${selectedTimetable.status}`);
      csvRows.push(''); // Empty line
      
      // Column headers
      if (selectedTimetable.isSchoolWide) {
        csvRows.push('Day,Period,Time,Class,Stream,Subject,Teacher,Room');
      } else {
        csvRows.push('Day,Period,Time,Subject,Teacher,Room');
      }
      
      // Sort entries by day and period
      const sortedEntries = [...entries].sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.period - b.period;
      });
      
      // Data rows
      const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      
      sortedEntries.forEach(entry => {
        const dayName = dayNames[entry.dayOfWeek] || `Day ${entry.dayOfWeek}`;
        const time = entry.startTime && entry.endTime 
          ? `${entry.startTime}-${entry.endTime}` 
          : `Period ${entry.period}`;
        const subject = entry.subjectName || '';
        const teacher = entry.teacherName || '';
        const room = entry.room || '';
        
        if (selectedTimetable.isSchoolWide) {
          const className = entry.className || '';
          const streamName = entry.streamName || '';
          csvRows.push(`"${dayName}","${entry.period}","${time}","${className}","${streamName}","${subject}","${teacher}","${room}"`);
        } else {
          csvRows.push(`"${dayName}","${entry.period}","${time}","${subject}","${teacher}","${room}"`);
        }
      });
      
      // Create CSV content
      const csvContent = csvRows.join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `timetable-${selectedTimetable.timetableName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccessMessage('Timetable downloaded successfully');
    } catch (err) {
      console.error('Error downloading timetable:', err);
      setError('Failed to download timetable');
    }
  };

  // Archive old timetables handler (NEW)
  const handleArchiveOldTimetables = async () => {
    try {
      setIsArchivingOld(true);
      setError(null);

      console.log('🔧 [Timetable Page] Archiving old timetables...');

      const response = await fetch('/api/dos/timetable/archive-old', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive old timetables');
      }

      console.log('✅ [Timetable Page] Archived:', data.archivedCount, 'timetables');

      setSuccessMessage(data.message || 'Old timetables archived successfully');
      await loadTimetables(); // Refresh list
    } catch (err) {
      console.error('❌ [Timetable Page] Error archiving old timetables:', err);
      setError(err instanceof Error ? err.message : 'Failed to archive old timetables');
    } finally {
      setIsArchivingOld(false);
    }
  };

  const openAddEntryDialog = (day: number, period: number, classId?: string, streamId?: string) => {
    if (!selectedTimetable || selectedTimetable.isLocked || selectedTimetable.isArchived) return;
    
    setSelectedDay(day);
    setSelectedPeriod(period);
    
    // For school-wide timetables, set the class and stream
    if (selectedTimetable.isSchoolWide && classId) {
      setSelectedClassId(classId);
      setSelectedStreamId(streamId || '');
      // Load subjects for this specific class
      loadSubjects(classId, selectedTimetable.id);
    }
    
    setShowAddEntryDialog(true);
  };

  const getEntryForSlot = (day: number, period: number): TimetableEntry | undefined => {
    return entries.find((e) => e.dayOfWeek === day && e.period === period);
  };

  const getStatusColor = (status: TimetableStatus) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Timetable Management</h1>
            <p className="text-gray-600 mt-1">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Print-only header */}
      <div className="print-only print-header">
        <h1 className="text-2xl font-bold mb-2">
          {selectedTimetable?.timetableName || 'Timetable'}
        </h1>
        <p className="text-lg">
          {selectedTimetable?.className} • {selectedTimetable?.termName}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Printed on: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between print-hide">
        <div>
          <h1 className="text-2xl font-bold">Timetable Management</h1>
          <p className="text-gray-600 mt-1">
            Create and manage class timetables with conflict detection
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {selectedTimetableId && !selectedTimetable?.isLocked && !selectedTimetable?.isArchived && (
            <Button 
              onClick={() => setShowGenerationDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Zap className="w-4 h-4 mr-2" />
              Auto-Generate
            </Button>
          )}
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Timetable
          </Button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive" className="print-hide">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="bg-green-50 border-green-200 print-hide">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Migration Notice (NEW) */}
      <div className="print-hide">
        <TimetableMigrationNotice
          hasOldTimetables={oldTimetablesCount > 0}
          oldTimetableCount={oldTimetablesCount}
          onArchiveOldTimetables={handleArchiveOldTimetables}
          isArchiving={isArchivingOld}
        />
      </div>

      {/* Configuration Panel */}
      <div className="print-hide">
        <TimetableConfigurationPanel onConfigSaved={handleConfigurationSaved} />
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Timetables List */}
        <div className="lg:col-span-1 print-hide">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timetables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {timetables.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No timetables yet. Create one to get started.
                </p>
              ) : (
                timetables.map((tt) => (
                  <div
                    key={tt.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedTimetableId === tt.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTimetableId(tt.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{tt.className}</p>
                        <p className="text-xs text-gray-600 truncate">{tt.termName}</p>
                      </div>
                      {tt.isLocked && <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <Badge className={getStatusColor(tt.status)} variant="secondary">
                        {tt.status}
                      </Badge>
                      {tt.isSchoolWide && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                          <School className="w-3 h-3 mr-1" />
                          School-Wide
                        </Badge>
                      )}
                      {tt.isArchived && (
                        <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                          <Archive className="w-3 h-3 mr-1" />
                          Archived
                        </Badge>
                      )}
                      {!tt.isTimeBased && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                          Legacy
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {tt.entryCount} slots
                      </span>
                    </div>
                    {selectedTimetableId === tt.id && (
                      <div className="mt-2 flex gap-1">
                        {!tt.dosApproved && !tt.isLocked && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveTimetable(tt.id);
                            }}
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLock(tt.id, tt.isLocked);
                          }}
                        >
                          {tt.isLocked ? (
                            <>
                              <Unlock className="w-3 h-3 mr-1" />
                              Unlock
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 mr-1" />
                              Lock
                            </>
                          )}
                        </Button>
                        {!tt.isLocked && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 text-red-600 hover:text-red-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTimetableToDelete(tt.id);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Timetable Grid */}
        <div className="lg:col-span-3 print:col-span-4">
          {selectedTimetable ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {selectedTimetable.timetableName}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedTimetable.className} • {selectedTimetable.termName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 print-hide">
                    {!selectedTimetable.isLocked && !selectedTimetable.isArchived && (
                      <Button 
                        onClick={() => setShowGenerationDialog(true)}
                        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Auto-Generate 
                      </Button>
                    )}
                    
                    {/* Print Button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.print()}
                            className="border-gray-300"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Print Timetable</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Download Button */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadTimetable()}
                            className="border-gray-300"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download as CSV</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {selectedTimetable.dosApproved && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Approved
                      </Badge>
                    )}
                    {selectedTimetable.isLocked && (
                      <Badge variant="secondary">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                    {selectedTimetable.isArchived && (
                      <Badge variant="secondary" className="bg-gray-200 text-gray-700">
                        <Archive className="w-3 h-3 mr-1" />
                        Archived
                      </Badge>
                    )}
                    {!selectedTimetable.isTimeBased && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                        Legacy Format
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Warning for archived/legacy timetables (NEW) */}
                {(selectedTimetable.isArchived || !selectedTimetable.isTimeBased) && (
                  <Alert className="mt-4 border-l-4 border-l-orange-500 bg-orange-50 print-hide">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                      {selectedTimetable.isArchived && (
                        <p className="font-medium">
                          📦 This timetable is archived and cannot be edited.
                        </p>
                      )}
                      {!selectedTimetable.isTimeBased && (
                        <p className={selectedTimetable.isArchived ? 'mt-1' : 'font-medium'}>
                          ⚠️ This timetable uses the old period-based format (Period 1, 2, 3...). 
                          New timetables use time-based format (08:00-08:40, 08:40-09:20...).
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </CardHeader>
              <CardContent>
                {/* Conditional Grid Rendering */}
                {selectedTimetable.isSchoolWide ? (
                  /* School-Wide Timetable Grid */
                  <SchoolWideTimetableGrid
                    classes={classesWithStreams}
                    timeSlots={timeSlots.length > 0 ? timeSlots : PERIODS.map(p => ({
                      slotNumber: p,
                      startTime: '',
                      endTime: '',
                      isSpecialPeriod: false,
                      specialPeriodName: null,
                      isAssignable: true,
                    }))}
                    entries={entries}
                    isLocked={selectedTimetable.isLocked || selectedTimetable.isArchived}
                    onAddEntry={(day, period, classId, streamId) => {
                      openAddEntryDialog(day, period, classId, streamId);
                    }}
                    onDeleteEntry={handleDeleteEntry}
                  />
                ) : (
                  /* Regular Single-Class Timetable Grid */
                  <>
                    <div className="overflow-x-auto">
                      <TooltipProvider>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="sticky top-0 bg-white z-10">
                              <th className="border border-gray-300 bg-gray-50 p-2 text-sm font-medium min-w-[120px]">
                                {hasConfiguration ? 'Time' : 'Period'}
                              </th>
                              {DAY_NAMES.map((day, idx) => (
                                <th
                                  key={idx}
                                  className="border border-gray-300 bg-gray-50 p-2 text-sm font-medium"
                                >
                                  <div className="hidden md:block">{day}</div>
                                  <div className="md:hidden">{day.substring(0, 3)}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(hasConfiguration && timeSlots.length > 0 ? timeSlots : PERIODS.map(p => ({ 
                              slotNumber: p, 
                              startTime: '',
                              endTime: '',
                              isSpecialPeriod: false, 
                              isAssignable: true,
                              specialPeriodName: undefined
                            }))).map((slot, idx) => {
                              const period = typeof slot.slotNumber === 'number' ? slot.slotNumber : idx + 1;
                              const isSpecialPeriod = slot.isSpecialPeriod || false;
                              
                              return (
                                <tr key={idx}>
                                  <td
                                    className={`border border-gray-300 p-2 text-center text-sm font-medium ${
                                      isSpecialPeriod ? 'bg-yellow-50' : 'bg-gray-50'
                                    }`}
                                  >
                                    {isSpecialPeriod ? (
                                      <div>
                                        <div className="font-bold text-yellow-900">{slot.specialPeriodName}</div>
                                        {hasConfiguration && slot.startTime && slot.endTime && (
                                          <div className="text-xs text-yellow-700 mt-1">
                                            <div className="hidden md:block">
                                              {formatTimeRange(slot.startTime, slot.endTime)}
                                            </div>
                                            <div className="md:hidden">
                                              {formatTimeRangeCompact(slot.startTime, slot.endTime)}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ) : hasConfiguration && slot.startTime && slot.endTime ? (
                                      <div>
                                        <div className="hidden md:block">
                                          {formatTimeRange(slot.startTime, slot.endTime)}
                                        </div>
                                        <div className="md:hidden">
                                          {formatTimeRangeCompact(slot.startTime, slot.endTime)}
                                        </div>
                                      </div>
                                    ) : (
                                      period
                                    )}
                                  </td>
                                  {DAY_NAMES.map((_, dayIdx) => {
                                    const day = dayIdx + 1; // 1-5 (Mon-Fri)
                                    const entry = getEntryForSlot(day, period);

                                    return (
                                      <td
                                        key={dayIdx}
                                        className={`border border-gray-300 p-2 text-sm ${
                                          isSpecialPeriod
                                            ? 'bg-yellow-50 cursor-not-allowed'
                                            : !selectedTimetable.isLocked
                                              ? 'cursor-pointer hover:bg-gray-50'
                                              : ''
                                        }`}
                                        onClick={() => {
                                          if (!entry && !selectedTimetable.isLocked && !isSpecialPeriod) {
                                            openAddEntryDialog(day, period);
                                          }
                                        }}
                                      >
                                        {entry ? (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="space-y-1">
                                                <div className="font-bold text-blue-600 text-center">
                                                  {entry.subjectCode}
                                                </div>
                                                <div className="text-xs text-gray-600 text-center">
                                                  {entry.teacherCode || entry.teacherEmployeeNumber}
                                                </div>
                                                {entry.room && (
                                                  <div className="text-xs text-gray-500 text-center">
                                                    {entry.room}
                                                  </div>
                                                )}
                                                {!selectedTimetable.isLocked && (
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 w-full text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteEntry(entry.id);
                                                    }}
                                                  >
                                                    <Trash2 className="w-3 h-3 mr-1" />
                                                    Remove
                                                  </Button>
                                                )}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs">
                                              <div className="space-y-1">
                                                <p className="font-medium">{entry.subjectName}</p>
                                                <p className="text-sm">Teacher: {entry.teacherName}</p>
                                                {entry.room && <p className="text-sm">Room: {entry.room}</p>}
                                                {entry.notes && <p className="text-sm text-gray-500">{entry.notes}</p>}
                                              </div>
                                            </TooltipContent>
                                          </Tooltip>
                                        ) : isSpecialPeriod ? (
                                          <div className="text-center text-gray-400 text-xs py-4">—</div>
                                        ) : (
                                          <div className="text-center text-gray-400 text-xs py-4">
                                            {!selectedTimetable.isLocked && '+'}
                                          </div>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </TooltipProvider>
                    </div>

                    {/* Legend */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium mb-2">Legend:</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-blue-600 rounded"></div>
                          <span>Subject Code</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gray-600 rounded"></div>
                          <span>Teacher Code</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                          <span>Special Period</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-gray-400 rounded"></div>
                          <span>Empty Slot</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        💡 Hover over entries to see full subject and teacher names
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No Timetable Selected</p>
                  <p className="text-sm mt-2">
                    Select a timetable from the list or create a new one
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Timetable Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Timetable</DialogTitle>
            <DialogDescription>
              Create a timetable for a single class or a school-wide timetable for all classes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* School-Wide Toggle */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="schoolWide"
                checked={isSchoolWide}
                onChange={(e) => {
                  setIsSchoolWide(e.target.checked);
                  if (e.target.checked) {
                    setNewTimetableClassId(''); // Clear class selection for school-wide
                  }
                }}
                className="w-4 h-4"
              />
              <Label htmlFor="schoolWide" className="cursor-pointer flex-1">
                <div className="font-medium text-blue-900">School-Wide Timetable</div>
                <div className="text-xs text-blue-700 mt-0.5">
                  Create a master timetable that includes all classes and streams
                </div>
              </Label>
            </div>

            {/* Class Selection (hidden for school-wide) */}
            {!isSchoolWide && (
              <div>
                <Label htmlFor="class">Class *</Label>
                <Select value={newTimetableClassId} onValueChange={setNewTimetableClassId}>
                  <SelectTrigger id="class">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="term">Term *</Label>
              <Select value={newTimetableTermId} onValueChange={setNewTimetableTermId}>
                <SelectTrigger id="term">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Timetable Name (Optional)</Label>
              <Input
                id="name"
                value={newTimetableName}
                onChange={(e) => setNewTimetableName(e.target.value)}
                placeholder={isSchoolWide ? "e.g., School Master Timetable" : "Auto-generated if left empty"}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTimetable}
              disabled={(isSchoolWide ? false : !newTimetableClassId) || !newTimetableTermId || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Timetable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Entry Dialog */}
      <Dialog open={showAddEntryDialog} onOpenChange={setShowAddEntryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Timetable Entry</DialogTitle>
            <DialogDescription>
              {selectedDay && selectedPeriod && (
                <>
                  Adding entry for {DAY_NAMES[selectedDay - 1]}, Period {selectedPeriod}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {entryConflicts.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Conflicts Detected:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {entryConflicts.map((conflict, idx) => (
                      <li key={idx} className="text-sm">{conflict}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Class and Stream Selection (for school-wide timetables) */}
            {selectedTimetable?.isSchoolWide && (
              <>
                <div>
                  <Label htmlFor="entryClass">Class *</Label>
                  <Select 
                    value={selectedClassId} 
                    onValueChange={(value) => {
                      setSelectedClassId(value);
                      setSelectedStreamId('');
                      setSelectedSubjectId('');
                      // Load subjects for selected class
                      if (value && selectedTimetable?.id) {
                        loadSubjects(value, selectedTimetable.id);
                      }
                      // Load streams for selected class
                      if (value) {
                        loadStreams(value);
                      }
                    }}
                  >
                    <SelectTrigger id="entryClass">
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classesWithStreams.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedClassId && streams.length > 0 && (
                  <div>
                    <Label htmlFor="entryStream">Stream (Optional)</Label>
                    <Select value={selectedStreamId} onValueChange={setSelectedStreamId}>
                      <SelectTrigger id="entryStream">
                        <SelectValue placeholder="Select stream (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No specific stream</SelectItem>
                        {streams.map((stream) => (
                          <SelectItem key={stream.id} value={stream.id}>
                            {stream.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      No subjects found for this class
                    </div>
                  ) : (
                    subjects.map((subj) => (
                      <SelectItem 
                        key={subj.id} 
                        value={subj.id}
                        disabled={subj.isAtLimit}
                      >
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>
                            {subj.subjectName} ({subj.subjectCode})
                          </span>
                          <span className={`text-xs ${
                            subj.isAtLimit 
                              ? 'text-red-600 font-medium' 
                              : subj.usageCount && subj.usageCount > 0
                                ? 'text-orange-600'
                                : 'text-gray-500'
                          }`}>
                            {subj.usageCount || 0}/{subj.periodsPerWeek}
                            {subj.isAtLimit && ' (Limit reached)'}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {subjects.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  ⚠️ No subjects configured for this class. Please add subjects in DoS Subjects.
                </p>
              )}
              {subjects.some(s => s.isAtLimit) && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Some subjects have reached their weekly period limit and are disabled.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="teacher">Teacher *</Label>
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger id="teacher">
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500 text-center">
                      No teachers found
                    </div>
                  ) : (
                    teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.employeeNumber})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {teachers.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  ⚠️ No active teachers found. Please add staff members.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="room">Room (Optional)</Label>
              <Input
                id="room"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                placeholder="e.g., Lab-1, Room 203"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="doubleLesson"
                checked={isDoubleLesson}
                onChange={(e) => setIsDoubleLesson(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="doubleLesson" className="cursor-pointer">
                Double Lesson (2 consecutive periods)
              </Label>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={entryNotes}
                onChange={(e) => setEntryNotes(e.target.value)}
                placeholder="Any additional notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddEntryDialog(false);
                resetAddEntryForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddEntry}
              disabled={!selectedSubjectId || !selectedTeacherId || isAddingEntry}
            >
              {isAddingEntry ? 'Adding...' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Timetable</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this timetable? This will remove all entries and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTimetable}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Timetable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generation Dialog */}
      {selectedTimetableId && (
        <TimetableGenerationDialog
          open={showGenerationDialog}
          onOpenChange={setShowGenerationDialog}
          timetableId={selectedTimetableId}
          onSuccess={async () => {
            setSuccessMessage('Timetable generated successfully!');
            await loadTimetableEntries(selectedTimetableId);
            await loadTimetables();
          }}
        />
      )}
    </div>
  );
}
