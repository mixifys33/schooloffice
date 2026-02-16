'use client';

import React, { useState } from 'react';
import { Zap, AlertCircle, CheckCircle2, Loader2, AlertTriangle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GenerationConfig {
  periodsPerDay: number;
  startTime: string;
  daysPerWeek: number;
  conflictMode: {
    enabled: boolean;
    attemptRepair: boolean;
  };
  rules: {
    noTeacherDoubleBooking: boolean;
    noStreamDoubleSubject: boolean;
    weeklySubjectFrequency: boolean;
    teacherLoadLimits: boolean;
    subjectDistribution: boolean;
  };
  teacherLimits: {
    minPeriodsPerWeek: number;
    maxPeriodsPerWeek: number;
    maxPeriodsPerDay: number;
  };
  subjectLimits: {
    maxSameSubjectPerDay: number;
  };
}

interface GenerationResult {
  entriesGenerated: number;
  entriesSaved: number;
  score: number;
  conflicts: Array<{
    type: string;
    message: string;
    slot: { day: number; period: number };
  }>;
  suggestions: string[];
  stats: {
    totalSlots: number;
    filledSlots: number;
    emptySlots: number;
    teacherGaps: number;
    heavyAfternoon: number;
  };
}

interface TimetableGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timetableId: string;
  onSuccess: () => void;
}

interface SubjectPeriod {
  curriculumSubjectId: string;
  curriculumSubjectIds?: string[]; // For school-wide timetables (multiple IDs)
  subjectName: string;
  subjectCode: string;
  defaultPeriodsPerWeek: number;
  customPeriodsPerWeek: number;
  classCount?: number; // For school-wide timetables
  classes?: string[]; // For school-wide timetables
}

// Toggle Button Component
function ToggleButton({ 
  enabled, 
  onClick, 
  label 
}: { 
  enabled: boolean; 
  onClick: () => void; 
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors
        ${enabled 
          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
          : 'bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
        }
      `}
    >
      {enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      <span>{label}</span>
    </button>
  );
}

export function TimetableGenerationDialog({
  open,
  onOpenChange,
  timetableId,
  onSuccess,
}: TimetableGenerationDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [subjects, setSubjects] = useState<SubjectPeriod[]>([]);
  const [showSubjectCustomization, setShowSubjectCustomization] = useState(false);
  const [isSchoolWide, setIsSchoolWide] = useState(false);
  const [totalClasses, setTotalClasses] = useState(0);
  
  // Use the config values directly - they're set by the user in the generation settings
  // periodsPerDay from config (e.g., 13)
  // Assume 2 special periods (break + lunch) as default
  const periodsPerDay = 13; // This will be from config when generating
  const startTime = '08:00';
  const daysPerWeek = 5;
  const specialPeriodsCount = 2; // Breaks, lunch, etc.
  const assignableSlots = periodsPerDay - specialPeriodsCount; // e.g., 13 - 2 = 11
  
  // Conflict Detection & Repair Mode
  const [conflictDetection, setConflictDetection] = useState(true);
  const [attemptRepair, setAttemptRepair] = useState(true);
  
  // Constraint Rules
  const [rule1NoTeacherDouble, setRule1NoTeacherDouble] = useState(true);
  const [rule2NoStreamDouble, setRule2NoStreamDouble] = useState(true);
  const [rule3WeeklyFrequency, setRule3WeeklyFrequency] = useState(true);
  const [rule4TeacherLimits, setRule4TeacherLimits] = useState(true);
  const [rule5SubjectDistribution, setRule5SubjectDistribution] = useState(true);
  
  // Teacher Load Limits
  const [minPeriodsPerWeek, setMinPeriodsPerWeek] = useState(15);
  const [maxPeriodsPerWeek, setMaxPeriodsPerWeek] = useState(30);
  const [maxPeriodsPerDay, setMaxPeriodsPerDay] = useState(6);
  
  // Subject Distribution
  const [maxSameSubjectPerDay, setMaxSameSubjectPerDay] = useState(3);
  
  // Generation Options
  const [preserveExisting, setPreserveExisting] = useState(true);
  const [clearExisting, setClearExisting] = useState(false);

  // Warning for conflicting options
  const hasConflictingOptions = preserveExisting && clearExisting;

  // Load subjects when dialog opens
  React.useEffect(() => {
    if (open && subjects.length === 0) {
      loadSubjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadSubjects = async () => {
    try {
      setIsLoadingSubjects(true);
      
      const response = await fetch(`/api/dos/timetable/${timetableId}/subjects`);
      
      if (!response.ok) {
        throw new Error('Failed to load subjects');
      }

      const data = await response.json();
      
      setIsSchoolWide(data.isSchoolWide || false);
      setTotalClasses(data.totalClasses || 0);
      
      // Initialize subjects with default periods
      const subjectPeriods: SubjectPeriod[] = data.subjects.map((s: {
        curriculumSubjectId: string;
        curriculumSubjectIds?: string[];
        subjectName: string;
        subjectCode: string;
        periodsPerWeek: number;
        classCount?: number;
        classes?: string[];
      }) => ({
        curriculumSubjectId: s.curriculumSubjectId,
        curriculumSubjectIds: s.curriculumSubjectIds,
        subjectName: s.subjectName,
        subjectCode: s.subjectCode,
        defaultPeriodsPerWeek: s.periodsPerWeek,
        customPeriodsPerWeek: s.periodsPerWeek,
        classCount: s.classCount,
        classes: s.classes,
      }));
      
      setSubjects(subjectPeriods);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setError('Failed to load subjects. Using default periods.');
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const updateSubjectPeriods = (curriculumSubjectId: string, periods: number) => {
    setSubjects(prev => prev.map(s => 
      s.curriculumSubjectId === curriculumSubjectId 
        ? { ...s, customPeriodsPerWeek: Math.max(0, Math.min(10, periods)) }
        : s
    ));
  };

  const resetSubjectPeriods = () => {
    setSubjects(prev => prev.map(s => ({
      ...s,
      customPeriodsPerWeek: s.defaultPeriodsPerWeek,
    })));
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setResult(null);

      const config: GenerationConfig = {
        periodsPerDay,
        startTime,
        daysPerWeek,
        conflictMode: {
          enabled: conflictDetection,
          attemptRepair,
        },
        rules: {
          noTeacherDoubleBooking: rule1NoTeacherDouble,
          noStreamDoubleSubject: rule2NoStreamDouble,
          weeklySubjectFrequency: rule3WeeklyFrequency,
          teacherLoadLimits: rule4TeacherLimits,
          subjectDistribution: rule5SubjectDistribution,
        },
        teacherLimits: {
          minPeriodsPerWeek,
          maxPeriodsPerWeek,
          maxPeriodsPerDay,
        },
        subjectLimits: {
          maxSameSubjectPerDay,
        },
      };

      // Build custom periods map (only include subjects with custom periods different from default)
      const customPeriods: { [curriculumSubjectId: string]: number } = {};
      subjects.forEach(s => {
        if (s.customPeriodsPerWeek !== s.defaultPeriodsPerWeek) {
          // For school-wide timetables, apply custom periods to all curriculum subject IDs
          if (s.curriculumSubjectIds && s.curriculumSubjectIds.length > 0) {
            s.curriculumSubjectIds.forEach(id => {
              customPeriods[id] = s.customPeriodsPerWeek;
            });
          } else {
            customPeriods[s.curriculumSubjectId] = s.customPeriodsPerWeek;
          }
        }
      });

      const response = await fetch(`/api/dos/timetable/${timetableId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          preserveExisting: preserveExisting && !clearExisting,
          clearExisting,
          customPeriods: Object.keys(customPeriods).length > 0 ? customPeriods : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || 'Failed to generate timetable';
        throw new Error(errorMessage);
      }

      setResult(data.result);
      
      // Auto-close and refresh after 3 seconds if successful
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 3000);
    } catch (err) {
      console.error('Error generating timetable:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate timetable');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Auto-Generate Timetable
          </DialogTitle>
          <DialogDescription>
            Configure constraint rules and generation settings to create an optimized timetable automatically.
            Click the buttons to toggle rules on/off.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {hasConflictingOptions && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Warning: Both &ldquo;Preserve Existing&rdquo; and &ldquo;Clear Existing&rdquo; are enabled. Clear Existing will take precedence.
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-2">
                <p className="font-medium">Generation Successful!</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Entries Generated: {result.entriesGenerated}</div>
                  <div>Quality Score: {result.score.toFixed(1)}/100</div>
                  <div>Filled Slots: {result.stats.filledSlots}/{result.stats.totalSlots}</div>
                  <div>Conflicts: {result.conflicts.length}</div>
                </div>
                {result.suggestions.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-xs">Suggestions:</p>
                    <ul className="list-disc list-inside text-xs">
                      {result.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Conflict Detection & Repair Mode */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              9️⃣ Conflict Detection & Repair Mode
            </h3>
            <p className="text-sm text-gray-600">
              Even if generation fails, the system will detect conflicts, highlight exact conflict types, and attempt repair using swap logic.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <ToggleButton
                enabled={conflictDetection}
                onClick={() => setConflictDetection(!conflictDetection)}
                label="Conflict Detection"
              />
              <ToggleButton
                enabled={attemptRepair}
                onClick={() => setAttemptRepair(!attemptRepair)}
                label="Automatic Repair"
              />
            </div>
          </div>

          {/* Constraint Rules */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Constraint Rules</h3>
            <p className="text-sm text-gray-600">
              Click buttons to toggle rules on or off. Each rule enforces specific scheduling constraints.
            </p>
            
            <div className="space-y-4">
              {/* Rule 1: No Teacher Double Booking */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">1️⃣</span>
                      <Label className="font-medium">No Teacher Double Booking</Label>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      A teacher cannot exist in two streams at the same day + period. If T01 is teaching S1A Monday Period 1, 
                      he cannot appear anywhere else at that same slot.
                    </p>
                  </div>
                  <ToggleButton
                    enabled={rule1NoTeacherDouble}
                    onClick={() => setRule1NoTeacherDouble(!rule1NoTeacherDouble)}
                    label={rule1NoTeacherDouble ? "ON" : "OFF"}
                  />
                </div>
              </div>

              {/* Rule 2: No Stream Double Subject */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">2️⃣</span>
                      <Label className="font-medium">No Stream Double Subject</Label>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      A stream cannot have two subjects in one period. Each (Day + Period + Stream) must produce exactly one lesson. 
                      No empty. No duplicate.
                    </p>
                  </div>
                  <ToggleButton
                    enabled={rule2NoStreamDouble}
                    onClick={() => setRule2NoStreamDouble(!rule2NoStreamDouble)}
                    label={rule2NoStreamDouble ? "ON" : "OFF"}
                  />
                </div>
              </div>

              {/* Rule 3: Weekly Subject Frequency Control */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">3️⃣</span>
                      <Label className="font-medium">Weekly Subject Frequency Control</Label>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Each subject must meet its required number of periods per week per stream. 
                      Example: Math → 5 periods, English → 4 periods, Biology → 3 periods. 
                      Uses periodsPerWeek from DoS curriculum settings.
                    </p>
                  </div>
                  <ToggleButton
                    enabled={rule3WeeklyFrequency}
                    onClick={() => setRule3WeeklyFrequency(!rule3WeeklyFrequency)}
                    label={rule3WeeklyFrequency ? "ON" : "OFF"}
                  />
                </div>
              </div>

              {/* Rule 4: Teacher Load Limits */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">4️⃣</span>
                      <Label className="font-medium">Teacher Load Limits</Label>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      Each teacher must have minimum load, maximum load per week, and maximum periods per day. 
                      Without this, one teacher ends up with 32 periods while another has 6.
                    </p>
                  </div>
                  <ToggleButton
                    enabled={rule4TeacherLimits}
                    onClick={() => setRule4TeacherLimits(!rule4TeacherLimits)}
                    label={rule4TeacherLimits ? "ON" : "OFF"}
                  />
                </div>
                
                {rule4TeacherLimits && (
                  <div className="grid grid-cols-3 gap-3 pl-8">
                    <div>
                      <Label htmlFor="minPerWeek" className="text-xs">Min Per Week</Label>
                      <Input
                        id="minPerWeek"
                        type="number"
                        min="0"
                        max="40"
                        value={minPeriodsPerWeek}
                        onChange={(e) => setMinPeriodsPerWeek(parseInt(e.target.value) || 15)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxPerWeek" className="text-xs">Max Per Week</Label>
                      <Input
                        id="maxPerWeek"
                        type="number"
                        min="0"
                        max="40"
                        value={maxPeriodsPerWeek}
                        onChange={(e) => setMaxPeriodsPerWeek(parseInt(e.target.value) || 30)}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxPerDay" className="text-xs">Max Per Day</Label>
                      <Input
                        id="maxPerDay"
                        type="number"
                        min="0"
                        max="12"
                        value={maxPeriodsPerDay}
                        onChange={(e) => setMaxPeriodsPerDay(parseInt(e.target.value) || 6)}
                        className="h-8"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Rule 5: Subject Distribution Rule */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">5️⃣</span>
                      <Label className="font-medium">Subject Distribution Rule</Label>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                      Avoid clustering the same subject too many times in one day. 
                      Bad: Math Math Math Math. Your generator should spread subjects across the week and limit max same-subject per day.
                    </p>
                  </div>
                  <ToggleButton
                    enabled={rule5SubjectDistribution}
                    onClick={() => setRule5SubjectDistribution(!rule5SubjectDistribution)}
                    label={rule5SubjectDistribution ? "ON" : "OFF"}
                  />
                </div>
                
                {rule5SubjectDistribution && (
                  <div className="pl-8">
                    <Label htmlFor="maxSamePerDay" className="text-xs">Max Same Subject Per Day</Label>
                    <Input
                      id="maxSamePerDay"
                      type="number"
                      min="1"
                      max="8"
                      value={maxSameSubjectPerDay}
                      onChange={(e) => setMaxSameSubjectPerDay(parseInt(e.target.value) || 2)}
                      className="h-8 w-32"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subject-Specific Periods Customization */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  6️⃣ Subject-Specific Periods Per Week
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Customize periods per week for each subject. Prioritize important subjects (Math, English) with more periods, 
                  and reduce less critical ones (PE, Art) to fit your timetable capacity.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSubjectCustomization(!showSubjectCustomization)}
                disabled={isLoadingSubjects}
              >
                {showSubjectCustomization ? 'Hide' : 'Show'} Subjects
              </Button>
            </div>

            {showSubjectCustomization && (
              <div className="space-y-3">
                {isLoadingSubjects ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-600">Loading subjects...</span>
                  </div>
                ) : subjects.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No subjects found for this timetable. Make sure subjects are configured in the DoS Curriculum.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Capacity Indicator */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                            📊 Capacity Overview
                          </p>
                          {isSchoolWide ? (
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-blue-700 dark:text-blue-300">Total periods needed:</span>
                                <span className="font-semibold text-blue-900 dark:text-blue-100">
                                  {subjects.reduce((sum, s) => sum + s.customPeriodsPerWeek, 0)} periods (all classes)
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700 dark:text-blue-300">Average per class:</span>
                                <span className="font-semibold text-blue-900 dark:text-blue-100">
                                  ~{Math.round(subjects.reduce((sum, s) => sum + s.customPeriodsPerWeek, 0) / totalClasses)} periods
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700 dark:text-blue-300">Total classes:</span>
                                <span className="font-semibold text-blue-900 dark:text-blue-100">
                                  {totalClasses} classes
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700 dark:text-blue-300">Available slots per class:</span>
                                <span className="font-semibold text-blue-900 dark:text-blue-100">
                                  {assignableSlots * daysPerWeek} slots ({assignableSlots} periods × {daysPerWeek} days)
                                </span>
                              </div>
                              <div className="flex justify-between border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">
                                <span className="text-blue-700 dark:text-blue-300">Total available slots:</span>
                                <span className="font-semibold text-blue-900 dark:text-blue-100">
                                  {assignableSlots * daysPerWeek * totalClasses} slots (all classes)
                                </span>
                              </div>
                              <div className="flex justify-between items-center pt-1">
                                <span className="text-blue-700 dark:text-blue-300">Utilization:</span>
                                <span className={`font-semibold ${
                                  subjects.reduce((sum, s) => sum + s.customPeriodsPerWeek, 0) > assignableSlots * daysPerWeek * totalClasses
                                    ? 'text-red-600 dark:text-red-400'
                                    : subjects.reduce((sum, s) => sum + s.customPeriodsPerWeek, 0) > assignableSlots * daysPerWeek * totalClasses * 0.9
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-green-600 dark:text-green-400'
                                }`}>
                                  {Math.round((subjects.reduce((sum, s) => sum + s.customPeriodsPerWeek, 0) / (assignableSlots * daysPerWeek * totalClasses)) * 100)}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-blue-700 dark:text-blue-300">Total periods needed:</span>
                                <span className="font-semibold text-blue-900 dark:text-blue-100">
                                  {subjects.reduce((sum, s) => sum + s.customPeriodsPerWeek, 0)} periods
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-blue-700 dark:text-blue-300">Available slots:</span>
                                <span className="font-semibold text-blue-900 dark:text-blue-100">
                                  {assignableSlots * daysPerWeek} slots ({assignableSlots} periods × {daysPerWeek} days)
                                </span>
                              </div>
                              <div className="flex justify-between items-center border-t border-blue-200 dark:border-blue-700 pt-1 mt-1">
                                <span className="text-blue-700 dark:text-blue-300">Utilization:</span>
                                <span className={`font-semibold ${
                                  subjects.reduce((sum, s) => sum + s.customPeriodsPerWeek, 0) > assignableSlots * daysPerWeek
                                    ? 'text-red-600 dark:text-red-400'
                                    : subjects.reduce((sum, s) => sum + s.customPeriodsPerWeek, 0) > assignableSlots * daysPerWeek * 0.9
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-green-600 dark:text-green-400'
                                }`}>
                                  {Math.round((subjects.reduce((sum, s) => sum + s.customPeriodsPerWeek, 0) / (assignableSlots * daysPerWeek)) * 100)}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetSubjectPeriods}
                          className="text-xs shrink-0"
                        >
                          Reset All
                        </Button>
                      </div>
                      
                      {/* Capacity Warning */}
                      {subjects.reduce((sum, s) => sum + s.customPeriodsPerWeek, 0) > 
                        (isSchoolWide ? assignableSlots * daysPerWeek * totalClasses : assignableSlots * daysPerWeek) && (
                        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                          ⚠️ Warning: Total periods exceed available slots. Generation may fail or produce incomplete results.
                        </div>
                      )}
                      
                      {/* Capacity Info */}
                      {subjects.reduce((sum, s) => sum + s.customPeriodsPerWeek, 0) > 
                        (isSchoolWide ? assignableSlots * daysPerWeek * totalClasses * 0.9 : assignableSlots * daysPerWeek * 0.9) &&
                       subjects.reduce((sum, s) => sum + s.customPeriodsPerWeek, 0) <= 
                        (isSchoolWide ? assignableSlots * daysPerWeek * totalClasses : assignableSlots * daysPerWeek) && (
                        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-700 dark:text-yellow-300">
                          💡 Tip: You&apos;re using over 90% capacity. Consider reducing some subjects for better scheduling flexibility.
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      {subjects.map((subject) => (
                        <div 
                          key={subject.curriculumSubjectId}
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{subject.subjectName}</p>
                            <p className="text-xs text-gray-500">
                              {subject.subjectCode}
                              {subject.classCount && subject.classCount > 1 ? (
                                <>
                                  {' '}• {subject.customPeriodsPerWeek} total ({Math.round(subject.customPeriodsPerWeek / subject.classCount)} per class)
                                  {' '}• {subject.classCount} classes
                                </>
                              ) : (
                                <>
                                  {' '}• Default: {subject.defaultPeriodsPerWeek}
                                </>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateSubjectPeriods(subject.curriculumSubjectId, subject.customPeriodsPerWeek - 1)}
                              disabled={subject.customPeriodsPerWeek <= 0}
                              className="h-7 w-7 p-0"
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              value={subject.customPeriodsPerWeek}
                              onChange={(e) => updateSubjectPeriods(subject.curriculumSubjectId, parseInt(e.target.value) || 0)}
                              className="h-7 w-14 text-center"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateSubjectPeriods(subject.curriculumSubjectId, subject.customPeriodsPerWeek + 1)}
                              disabled={subject.customPeriodsPerWeek >= 10}
                              className="h-7 w-7 p-0"
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Generation Options */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium">Generation Options</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <ToggleButton
                enabled={preserveExisting}
                onClick={() => setPreserveExisting(!preserveExisting)}
                label="Preserve Existing"
              />
              <ToggleButton
                enabled={clearExisting}
                onClick={() => setClearExisting(!clearExisting)}
                label="Clear Existing"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Generate Timetable
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
