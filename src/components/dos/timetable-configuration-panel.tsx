'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ChevronDown,
  ChevronUp,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface SpecialPeriod {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[]; // 1-7 (Mon-Sun)
}

interface TimetableConfig {
  id?: string;
  startTime: string;
  endTime: string;
  periodDurationMinutes: number;
  specialPeriods: SpecialPeriod[];
}

interface TimeSlot {
  slotNumber: number | string;
  startTime: string;
  endTime: string;
  isSpecialPeriod: boolean;
  specialPeriodName: string | null;
  isAssignable: boolean;
}

interface Props {
  onConfigSaved?: () => void;
}

const DAY_OPTIONS = [
  { value: '1,2,3,4,5', label: 'Mon-Fri' },
  { value: '1,2,3,4', label: 'Mon-Thu' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
];

export function TimetableConfigurationPanel({ onConfigSaved }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Configuration state
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [periodDuration, setPeriodDuration] = useState(40);
  const [specialPeriods, setSpecialPeriods] = useState<SpecialPeriod[]>([]);

  // Preview state
  const [previewSlots, setPreviewSlots] = useState<TimeSlot[]>([]);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  // Generate preview when configuration changes
  useEffect(() => {
    if (startTime && endTime && periodDuration >= 15) {
      generatePreview();
    }
  }, [startTime, endTime, periodDuration, specialPeriods]);

  // Auto-dismiss success messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadConfiguration = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/dos/timetable/config');
      const data = await response.json();

      console.log('📊 [Config Panel] Received configuration:', {
        ok: response.ok,
        exists: data.exists,
        hasConfig: !!data.config,
        config: data.config,
      });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load configuration');
      }

      if (data.exists && data.config) {
        console.log('✅ [Config Panel] Loading configuration (exists=true):', data.config);
        setStartTime(data.config.startTime);
        setEndTime(data.config.endTime);
        setPeriodDuration(data.config.periodDurationMinutes);
        setSpecialPeriods(data.config.specialPeriods || []);
      } else if (data.config) {
        console.log('✅ [Config Panel] Loading configuration (fallback):', data.config);
        // Handle case where API returns config without exists flag
        setStartTime(data.config.startTime);
        setEndTime(data.config.endTime);
        setPeriodDuration(data.config.periodDurationMinutes);
        setSpecialPeriods(data.config.specialPeriods || []);
      } else {
        console.log('⚠️ [Config Panel] No configuration found, using defaults');
      }
    } catch (err) {
      console.error('Error loading configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePreview = async () => {
    try {
      setIsGeneratingPreview(true);

      const response = await fetch('/api/dos/timetable/config/generate-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime,
          endTime,
          periodDurationMinutes: periodDuration,
          specialPeriods,
          dayOfWeek: 1, // Monday for preview
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPreviewSlots(data.slots || []);
      }
    } catch (err) {
      console.error('Error generating preview:', err);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch('/api/dos/timetable/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime,
          endTime,
          periodDurationMinutes: periodDuration,
          specialPeriods,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to save configuration');
      }

      setSuccessMessage('Configuration saved successfully!');
      if (onConfigSaved) {
        onConfigSaved();
      }
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const addSpecialPeriod = () => {
    setSpecialPeriods([
      ...specialPeriods,
      {
        name: '',
        startTime: '10:30',
        endTime: '10:45',
        daysOfWeek: [1, 2, 3, 4, 5],
      },
    ]);
  };

  const removeSpecialPeriod = (index: number) => {
    setSpecialPeriods(specialPeriods.filter((_, i) => i !== index));
  };

  const updateSpecialPeriod = (index: number, field: keyof SpecialPeriod, value: any) => {
    const updated = [...specialPeriods];
    updated[index] = { ...updated[index], [field]: value };
    setSpecialPeriods(updated);
  };

  const formatTimeRange = (start: string, end: string) => {
    return `${start}-${end}`;
  };

  return (
    <Card className="mb-6">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">School Timetable Rules</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {!isExpanded && previewSlots.length > 0 && (
              <span className="text-sm text-gray-600">
                {previewSlots.filter(s => !s.isSpecialPeriod).length} teaching periods
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Basic Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startTime">School Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="endTime">School End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="periodDuration">Period Duration (minutes) *</Label>
              <Input
                id="periodDuration"
                type="number"
                min="15"
                step="5"
                value={periodDuration}
                onChange={(e) => setPeriodDuration(parseInt(e.target.value) || 40)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum: 15 minutes</p>
            </div>
          </div>

          {/* Special Periods */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Special Periods (Break, Lunch, Assembly, etc.)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSpecialPeriod}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Special Period
              </Button>
            </div>

            {specialPeriods.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed">
                <p className="text-sm text-gray-500">
                  No special periods configured. Click "Add Special Period" to add breaks, lunch, etc.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {specialPeriods.map((sp, idx) => (
                  <div key={idx} className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-[150px]">
                      <Input
                        placeholder="Name (e.g., Break, Lunch)"
                        value={sp.name}
                        onChange={(e) => updateSpecialPeriod(idx, 'name', e.target.value)}
                      />
                    </div>

                    <div className="w-32">
                      <Input
                        type="time"
                        value={sp.startTime}
                        onChange={(e) => updateSpecialPeriod(idx, 'startTime', e.target.value)}
                      />
                    </div>

                    <div className="w-32">
                      <Input
                        type="time"
                        value={sp.endTime}
                        onChange={(e) => updateSpecialPeriod(idx, 'endTime', e.target.value)}
                      />
                    </div>

                    <div className="w-40">
                      <Select
                        value={sp.daysOfWeek.join(',')}
                        onValueChange={(value) =>
                          updateSpecialPeriod(idx, 'daysOfWeek', value.split(',').map(Number))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSpecialPeriod(idx)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {previewSlots.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Generated Time Slots Preview (Monday)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {previewSlots.map((slot, idx) => (
                  <div
                    key={idx}
                    className={`text-xs p-2 rounded ${
                      slot.isSpecialPeriod
                        ? 'bg-yellow-100 border border-yellow-300 text-yellow-900'
                        : 'bg-white border border-blue-300 text-blue-900'
                    }`}
                  >
                    <div className="font-bold">
                      {slot.isSpecialPeriod ? slot.specialPeriodName : `Period ${slot.slotNumber}`}
                    </div>
                    <div className="text-xs opacity-75">
                      {formatTimeRange(slot.startTime, slot.endTime)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-blue-700">
                <strong>{previewSlots.filter(s => !s.isSpecialPeriod).length}</strong> teaching periods,{' '}
                <strong>{previewSlots.filter(s => s.isSpecialPeriod).length}</strong> special periods
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSaveConfiguration}
              disabled={isSaving || !startTime || !endTime || periodDuration < 15}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Rules'}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
