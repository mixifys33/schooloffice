'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  TimetableDraft,
  TimetableSlot,
  TimetableConflict,
  GenerateTimetableRequest,
  OptimizationTarget,
  TimetableStatus
} from '@/types/timetable';

interface TimetableGeneratorProps {
  schoolId: string;
  termId: string;
  academicYearId: string;
  onTimetableGenerated?: (newTimetable: TimetableDraft) => void;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  periodsPerWeek: number;
  teacherId: string;
  teacherName: string;
}

interface GenerationSettings {
  populationSize: number;
  maxGenerations: number;
  mutationRate: number;
  crossoverRate: number;
  optimizationTarget: OptimizationTarget;
  allowPartialSolutions: boolean;
  prioritizeHardConstraints: boolean;
}

export function TimetableGenerator({ 
  schoolId, 
  termId, 
  academicYearId, 
  onTimetableGenerated 
}: TimetableGeneratorProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [settings, setSettings] = useState<GenerationSettings>({
    populationSize: 100,
    maxGenerations: 1000,
    mutationRate: 0.1,
    crossoverRate: 0.8,
    optimizationTarget: OptimizationTarget.MINIMIZE_CONFLICTS,
    allowPartialSolutions: false,
    prioritizeHardConstraints: true
  });
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubjects();
  }, [schoolId, termId]);

  const loadSubjects = async () => {
    try {
      const response = await fetch(`/api/dos/timetable/config/subject-requirements?schoolId=${schoolId}&termId=${termId}`);
      const data = await response.json();
      
      // Transform the data to match our Subject interface
      const transformedSubjects = data.requirements.map((req: any) => ({
        id: req.subjectId,
        name: req.subject.name || 'Unknown Subject',
        code: req.subject.code || 'N/A',
        periodsPerWeek: req.periodsPerWeek,
        teacherId: req.teacherId || 'unknown',
        teacherName: req.teacher?.firstName + ' ' + req.teacher?.lastName || 'Unknown Teacher'
      }));
      
      setSubjects(transformedSubjects);
    } catch (err) {
      console.error('Error loading subjects:', err);
      setError('Failed to load subject requirements');
    }
  };

  const updateSubjectPeriods = (subjectId: string, periods: number) => {
    setSubjects(prev =>
      prev.map(subject =>
        subject.id === subjectId
          ? { ...subject, periodsPerWeek: periods }
          : subject
      )
    );
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(0);
    setError(null);
    setGenerationResult(null);
    
    try {
      // Prepare the generation request
      const generateRequest: GenerateTimetableRequest = {
        schoolId,
        termId,
        settings: {
          ...settings,
          populationSize: settings.populationSize,
          maxGenerations: settings.maxGenerations,
          mutationRate: settings.mutationRate,
          crossoverRate: settings.crossoverRate
        }
      };

      // Call the API to start generation
      const response = await fetch('/api/dos/timetable/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...generateRequest,
          name: `Auto-generated - ${new Date().toISOString().split('T')[0]}`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate timetable');
      }

      const result = await response.json();
      
      if (result.success) {
        setProgress(100);
        setCurrentStep('Generation Complete');
        setGenerationResult(result.draft);
        
        // Notify parent component
        if (onTimetableGenerated && result.draft) {
          // Fetch the complete timetable with slots and conflicts
          const fullTimetableResponse = await fetch(`/api/dos/timetables?action=list&termId=${termId}`);
          const fullTimetableData = await fullTimetableResponse.json();
          
          const fullTimetable = fullTimetableData.timetables.find((t: any) => t.id === result.draft.id);
          if (fullTimetable) {
            onTimetableGenerated(fullTimetable);
          }
        }
      } else {
        setError(result.message || 'Generation failed');
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setGenerating(false);
    }
  };

  const handleSettingChange = (field: keyof GenerationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Generation Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="populationSize">Population Size</Label>
            <Input
              id="populationSize"
              type="number"
              min="10"
              max="1000"
              value={settings.populationSize}
              onChange={(e) => handleSettingChange('populationSize', parseInt(e.target.value))}
              disabled={generating}
            />
          </div>
          
          <div>
            <Label htmlFor="maxGenerations">Max Generations</Label>
            <Input
              id="maxGenerations"
              type="number"
              min="100"
              max="10000"
              value={settings.maxGenerations}
              onChange={(e) => handleSettingChange('maxGenerations', parseInt(e.target.value))}
              disabled={generating}
            />
          </div>
          
          <div>
            <Label htmlFor="mutationRate">Mutation Rate</Label>
            <Input
              id="mutationRate"
              type="number"
              step="0.01"
              min="0.01"
              max="0.5"
              value={settings.mutationRate}
              onChange={(e) => handleSettingChange('mutationRate', parseFloat(e.target.value))}
              disabled={generating}
            />
          </div>
          
          <div>
            <Label htmlFor="crossoverRate">Crossover Rate</Label>
            <Input
              id="crossoverRate"
              type="number"
              step="0.01"
              min="0.1"
              max="1.0"
              value={settings.crossoverRate}
              onChange={(e) => handleSettingChange('crossoverRate', parseFloat(e.target.value))}
              disabled={generating}
            />
          </div>
          
          <div>
            <Label htmlFor="optimizationTarget">Optimization Target</Label>
            <select
              id="optimizationTarget"
              value={settings.optimizationTarget}
              onChange={(e) => handleSettingChange('optimizationTarget', e.target.value as OptimizationTarget)}
              className="w-full p-2 border border-[var(--border)] rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)]"
              disabled={generating}
            >
              <option value={OptimizationTarget.TEACHER_BALANCE}>Teacher Balance</option>
              <option value={OptimizationTarget.SUBJECT_SPREAD}>Subject Spread</option>
              <option value={OptimizationTarget.ROOM_UTILIZATION}>Room Utilization</option>
              <option value={OptimizationTarget.STUDENT_SATISFACTION}>Student Satisfaction</option>
              <option value={OptimizationTarget.MINIMIZE_CONFLICTS}>Minimize Conflicts</option>
            </select>
          </div>
          
          <div className="flex items-center pt-6">
            <input
              type="checkbox"
              id="allowPartialSolutions"
              checked={settings.allowPartialSolutions}
              onChange={(e) => handleSettingChange('allowPartialSolutions', e.target.checked)}
              disabled={generating}
              className="mr-2"
            />
            <Label htmlFor="allowPartialSolutions">Allow Partial Solutions</Label>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Subject Configuration</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Configure the number of periods per week for each subject
        </p>
        
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {subjects.map((subject) => (
            <div key={subject.id} className="flex items-center justify-between p-3 border rounded-lg bg-[var(--bg-surface)]">
              <div className="flex-1">
                <div className="font-medium">{subject.name}</div>
                <div className="text-sm text-[var(--text-secondary)]">
                  {subject.code} • {subject.teacherName}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Periods/Week:</span>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={subject.periodsPerWeek}
                  onChange={(e) => updateSubjectPeriods(subject.id, parseInt(e.target.value))}
                  disabled={generating}
                  className="w-20"
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Generate Timetable</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Create an optimized timetable based on your configuration
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] min-w-[150px]"
          >
            {generating ? 'Generating...' : 'Generate Timetable'}
          </Button>
        </div>

        {generating && (
          <div className="space-y-3">
            <div className="w-full bg-[var(--bg-surface)] rounded-full h-2.5">
              <Progress value={progress} className="h-2.5" />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{currentStep || 'Initializing generation...'}</p>
          </div>
        )}

        {error && (
          <div className="bg-[var(--danger-light)] border border-[var(--danger-light)] rounded-lg p-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-[var(--danger)] rounded-full"></div>
              <span className="font-medium text-[var(--danger-dark)]">Generation Error</span>
            </div>
            <p className="text-sm text-[var(--chart-red)]">{error}</p>
          </div>
        )}

        {generationResult && !error && (
          <div className="bg-[var(--success-light)] border border-[var(--success-light)] rounded-lg p-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-[var(--success)] rounded-full"></div>
              <span className="font-medium text-[var(--success-dark)]">Generation Complete</span>
            </div>
            <p className="text-sm text-[var(--chart-green)] mb-3">
              Timetable has been successfully generated with quality score of {generationResult.qualityScore?.toFixed(1)}%.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">Version {generationResult.version}</Badge>
              <Badge variant="outline">{generationResult.conflictCount} conflicts</Badge>
              <Badge variant="outline">{generationResult.totalSlots} slots</Badge>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}