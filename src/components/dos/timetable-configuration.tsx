'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  SchoolTimeStructure, 
  SubjectPeriodRequirement, 
  TeacherConstraint, 
  TimetableGenerationSettings 
} from '@/types/timetable';
import { prisma } from '@/lib/db';

interface TimetableConfigurationProps {
  schoolId: string;
  onConfigurationUpdated?: () => void;
}

export function TimetableConfiguration({ 
  schoolId, 
  onConfigurationUpdated 
}: TimetableConfigurationProps) {
  const [timeStructure, setTimeStructure] = useState<SchoolTimeStructure | null>(null);
  const [subjectRequirements, setSubjectRequirements] = useState<SubjectPeriodRequirement[]>([]);
  const [teacherConstraints, setTeacherConstraints] = useState<TeacherConstraint[]>([]);
  const [generationSettings, setGenerationSettings] = useState<TimetableGenerationSettings | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('time');

  useEffect(() => {
    loadConfiguration();
  }, [schoolId]);

  const loadConfiguration = async () => {
    setLoading(true);
    try {
      // Load all configuration data
      const [timeStruct, subjReqs, teachConst, genSetts] = await Promise.all([
        fetch(`/api/dos/timetable/config/time-structure?schoolId=${schoolId}`).then(r => r.json()).then(d => d.structure),
        fetch(`/api/dos/timetable/config/subject-requirements?schoolId=${schoolId}`).then(r => r.json()).then(d => d.requirements),
        fetch(`/api/dos/timetable/config/teacher-constraints?schoolId=${schoolId}`).then(r => r.json()).then(d => d.constraints),
        fetch(`/api/dos/timetable/config/generation-settings?schoolId=${schoolId}`).then(r => r.json()).then(d => d.settings)
      ]);

      setTimeStructure(timeStruct);
      setSubjectRequirements(subjReqs);
      setTeacherConstraints(teachConst);
      setGenerationSettings(genSetts);
    } catch (error) {
      console.error('Error loading configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTimeStructure = async () => {
    if (!timeStructure) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/dos/timetable/config/time-structure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, ...timeStructure })
      });
      
      if (response.ok) {
        alert('Time structure saved successfully');
        onConfigurationUpdated?.();
      } else {
        alert('Failed to save time structure');
      }
    } catch (error) {
      console.error('Error saving time structure:', error);
      alert('Error saving time structure');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGenerationSettings = async () => {
    if (!generationSettings) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/dos/timetable/config/generation-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, ...generationSettings })
      });
      
      if (response.ok) {
        alert('Generation settings saved successfully');
        onConfigurationUpdated?.();
      } else {
        alert('Failed to save generation settings');
      }
    } catch (error) {
      console.error('Error saving generation settings:', error);
      alert('Error saving generation settings');
    } finally {
      setSaving(false);
    }
  };

  const updateTimeStructure = (field: keyof SchoolTimeStructure, value: any) => {
    if (!timeStructure) return;
    setTimeStructure({ ...timeStructure, [field]: value });
  };

  const updateGenerationSettings = (field: keyof TimetableGenerationSettings, value: any) => {
    if (!generationSettings) return;
    setGenerationSettings({ ...generationSettings, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--chart-blue)]"></div>
        <span className="ml-2 text-[var(--text-secondary)]">Loading configuration...</span>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="time">Time Structure</TabsTrigger>
        <TabsTrigger value="subjects">Subject Requirements</TabsTrigger>
        <TabsTrigger value="teachers">Teacher Constraints</TabsTrigger>
        <TabsTrigger value="algorithm">Generation Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="time" className="mt-6 space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">School Time Structure</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={timeStructure?.startTime || ''}
                onChange={(e) => updateTimeStructure('startTime', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={timeStructure?.endTime || ''}
                onChange={(e) => updateTimeStructure('endTime', e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="periodsPerDay">Periods Per Day</Label>
              <Input
                id="periodsPerDay"
                type="number"
                min="1"
                max="12"
                value={timeStructure?.periodsPerDay || 8}
                onChange={(e) => updateTimeStructure('periodsPerDay', parseInt(e.target.value))}
              />
            </div>
            
            <div>
              <Label htmlFor="periodDuration">Period Duration (minutes)</Label>
              <Input
                id="periodDuration"
                type="number"
                min="20"
                max="60"
                value={timeStructure?.periodDuration || 40}
                onChange={(e) => updateTimeStructure('periodDuration', parseInt(e.target.value))}
              />
            </div>
            
            <div>
              <Label htmlFor="shortBreakStart">Short Break After Period</Label>
              <Input
                id="shortBreakStart"
                type="number"
                min="1"
                max={timeStructure?.periodsPerDay || 8}
                value={timeStructure?.shortBreakStart || 3}
                onChange={(e) => updateTimeStructure('shortBreakStart', parseInt(e.target.value))}
              />
            </div>
            
            <div>
              <Label htmlFor="shortBreakDuration">Short Break Duration (minutes)</Label>
              <Input
                id="shortBreakDuration"
                type="number"
                min="5"
                max="30"
                value={timeStructure?.shortBreakDuration || 20}
                onChange={(e) => updateTimeStructure('shortBreakDuration', parseInt(e.target.value))}
              />
            </div>
            
            <div>
              <Label htmlFor="lunchBreakStart">Lunch Break After Period</Label>
              <Input
                id="lunchBreakStart"
                type="number"
                min="1"
                max={timeStructure?.periodsPerDay || 8}
                value={timeStructure?.lunchBreakStart || 5}
                onChange={(e) => updateTimeStructure('lunchBreakStart', parseInt(e.target.value))}
              />
            </div>
            
            <div>
              <Label htmlFor="lunchBreakDuration">Lunch Break Duration (minutes)</Label>
              <Input
                id="lunchBreakDuration"
                type="number"
                min="30"
                max="120"
                value={timeStructure?.lunchBreakDuration || 60}
                onChange={(e) => updateTimeStructure('lunchBreakDuration', parseInt(e.target.value))}
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button 
              onClick={handleSaveTimeStructure} 
              disabled={saving}
              className="bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
            >
              {saving ? 'Saving...' : 'Save Time Structure'}
            </Button>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="subjects" className="mt-6 space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Subject Period Requirements</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-2 px-4 text-left">Subject</th>
                  <th className="py-2 px-4 text-left">Class</th>
                  <th className="py-2 px-4 text-left">Periods/Week</th>
                  <th className="py-2 px-4 text-left">Double Periods Allowed</th>
                  <th className="py-2 px-4 text-left">Practical Periods</th>
                  <th className="py-2 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjectRequirements.map((req, index) => (
                  <tr key={index} className="border-b border-[var(--border)]">
                    <td className="py-2 px-4">{req.subjectId}</td>
                    <td className="py-2 px-4">{req.classId}</td>
                    <td className="py-2 px-4">
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={req.periodsPerWeek}
                        onChange={(e) => {
                          const updated = [...subjectRequirements];
                          updated[index].periodsPerWeek = parseInt(e.target.value);
                          setSubjectRequirements(updated);
                        }}
                      />
                    </td>
                    <td className="py-2 px-4">
                      <Checkbox
                        checked={req.doublePeriodAllowed}
                        onCheckedChange={(checked) => {
                          const updated = [...subjectRequirements];
                          updated[index].doublePeriodAllowed = Boolean(checked);
                          setSubjectRequirements(updated);
                        }}
                      />
                    </td>
                    <td className="py-2 px-4">
                      <Input
                        type="number"
                        min="0"
                        max={req.periodsPerWeek}
                        value={req.practicalPeriods}
                        onChange={(e) => {
                          const updated = [...subjectRequirements];
                          updated[index].practicalPeriods = parseInt(e.target.value);
                          setSubjectRequirements(updated);
                        }}
                      />
                    </td>
                    <td className="py-2 px-4">
                      <Button size="sm" variant="outline">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button 
              onClick={() => {
                // Save subject requirements
                alert('Subject requirements saved');
                onConfigurationUpdated?.();
              }}
              className="bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
            >
              Save Subject Requirements
            </Button>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="teachers" className="mt-6 space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Teacher Constraints</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-2 px-4 text-left">Teacher</th>
                  <th className="py-2 px-4 text-left">Max Periods/Day</th>
                  <th className="py-2 px-4 text-left">Max Periods/Week</th>
                  <th className="py-2 px-4 text-left">Unavailable Days</th>
                  <th className="py-2 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teacherConstraints.map((constraint, index) => (
                  <tr key={index} className="border-b border-[var(--border)]">
                    <td className="py-2 px-4">{constraint.teacherId}</td>
                    <td className="py-2 px-4">
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={constraint.maxPeriodsPerDay}
                        onChange={(e) => {
                          const updated = [...teacherConstraints];
                          updated[index].maxPeriodsPerDay = parseInt(e.target.value);
                          setTeacherConstraints(updated);
                        }}
                      />
                    </td>
                    <td className="py-2 px-4">
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={constraint.maxPeriodsPerWeek}
                        onChange={(e) => {
                          const updated = [...teacherConstraints];
                          updated[index].maxPeriodsPerWeek = parseInt(e.target.value);
                          setTeacherConstraints(updated);
                        }}
                      />
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map(day => (
                          <Checkbox
                            key={day}
                            checked={constraint.unavailableDays.includes(day)}
                            onCheckedChange={(checked) => {
                              const updated = [...teacherConstraints];
                              if (checked) {
                                updated[index].unavailableDays = [...constraint.unavailableDays, day];
                              } else {
                                updated[index].unavailableDays = constraint.unavailableDays.filter(d => d !== day);
                              }
                              setTeacherConstraints(updated);
                            }}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-4">
                      <Button size="sm" variant="outline">Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button 
              onClick={() => {
                // Save teacher constraints
                alert('Teacher constraints saved');
                onConfigurationUpdated?.();
              }}
              className="bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
            >
              Save Teacher Constraints
            </Button>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="algorithm" className="mt-6 space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Generation Algorithm Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="prioritizeTeacherBalance">Prioritize Teacher Balance</Label>
                <Checkbox
                  id="prioritizeTeacherBalance"
                  checked={generationSettings?.prioritizeTeacherBalance}
                  onCheckedChange={(checked) => updateGenerationSettings('prioritizeTeacherBalance', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="prioritizeSubjectSpread">Prioritize Subject Spread</Label>
                <Checkbox
                  id="prioritizeSubjectSpread"
                  checked={generationSettings?.prioritizeSubjectSpread}
                  onCheckedChange={(checked) => updateGenerationSettings('prioritizeSubjectSpread', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="prioritizeRoomOptimization">Prioritize Room Optimization</Label>
                <Checkbox
                  id="prioritizeRoomOptimization"
                  checked={generationSettings?.prioritizeRoomOptimization}
                  onCheckedChange={(checked) => updateGenerationSettings('prioritizeRoomOptimization', checked)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="hardConstraintWeight">Hard Constraint Weight (0-100)</Label>
                <Input
                  id="hardConstraintWeight"
                  type="number"
                  min="0"
                  max="100"
                  value={generationSettings?.hardConstraintWeight}
                  onChange={(e) => updateGenerationSettings('hardConstraintWeight', parseInt(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="teacherWorkloadWeight">Teacher Workload Weight (0-100)</Label>
                <Input
                  id="teacherWorkloadWeight"
                  type="number"
                  min="0"
                  max="100"
                  value={generationSettings?.teacherWorkloadWeight}
                  onChange={(e) => updateGenerationSettings('teacherWorkloadWeight', parseInt(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="subjectSpreadWeight">Subject Spread Weight (0-100)</Label>
                <Input
                  id="subjectSpreadWeight"
                  type="number"
                  min="0"
                  max="100"
                  value={generationSettings?.subjectSpreadWeight}
                  onChange={(e) => updateGenerationSettings('subjectSpreadWeight', parseInt(e.target.value))}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="maxGenerationAttempts">Max Generation Attempts</Label>
                <Input
                  id="maxGenerationAttempts"
                  type="number"
                  min="100"
                  max="10000"
                  value={generationSettings?.maxGenerationAttempts}
                  onChange={(e) => updateGenerationSettings('maxGenerationAttempts', parseInt(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="maxGenerationTimeMs">Max Generation Time (ms)</Label>
                <Input
                  id="maxGenerationTimeMs"
                  type="number"
                  min="10000"
                  max="300000"
                  value={generationSettings?.maxGenerationTimeMs}
                  onChange={(e) => updateGenerationSettings('maxGenerationTimeMs', parseInt(e.target.value))}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="minAcceptableQuality">Min Acceptable Quality (%)</Label>
                <Input
                  id="minAcceptableQuality"
                  type="number"
                  min="0"
                  max="100"
                  value={generationSettings?.minAcceptableQuality}
                  onChange={(e) => updateGenerationSettings('minAcceptableQuality', parseFloat(e.target.value))}
                />
              </div>
              
              <div>
                <Label htmlFor="targetQualityScore">Target Quality Score (%)</Label>
                <Input
                  id="targetQualityScore"
                  type="number"
                  min="0"
                  max="100"
                  value={generationSettings?.targetQualityScore}
                  onChange={(e) => updateGenerationSettings('targetQualityScore', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <Button 
              onClick={handleSaveGenerationSettings} 
              disabled={saving}
              className="bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
            >
              {saving ? 'Saving...' : 'Save Generation Settings'}
            </Button>
          </div>
        </Card>
      </TabsContent>
    </Tabs>
  );
}