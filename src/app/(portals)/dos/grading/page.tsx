'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Award,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Edit2,
  Save,
  X,
  Filter,
  School,
  Calendar,
} from 'lucide-react';
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

type GradingCategory = 'FINAL' | 'EXAM_ONLY' | 'CA_ONLY';

interface Grade {
  id: string;
  grade: string;
  minScore: number;
  maxScore: number;
  points: number;
  remarks: string | null;
}

interface ClassInfo {
  id: string;
  name: string;
}

interface TermInfo {
  id: string;
  name: string;
}

interface GradingSystem {
  id: string;
  name: string;
  category: GradingCategory;
  isDefault: boolean;
  classId: string | null;
  termId: string | null;
  class: ClassInfo | null;
  term: TermInfo | null;
  grades: Grade[];
  createdAt: string;
}

const CATEGORY_LABELS: Record<GradingCategory, string> = {
  FINAL: 'Final (Exam + CA)',
  EXAM_ONLY: 'Exam Only',
  CA_ONLY: 'CA Only',
};

const CATEGORY_COLORS: Record<GradingCategory, string> = {
  FINAL: 'bg-blue-100 text-blue-800',
  EXAM_ONLY: 'bg-green-100 text-green-800',
  CA_ONLY: 'bg-purple-100 text-purple-800',
};

export default function DoSGradingPage() {
  const [gradingSystems, setGradingSystems] = useState<GradingSystem[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [terms, setTerms] = useState<TermInfo[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<GradingCategory | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Create system dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSystemName, setNewSystemName] = useState('');
  const [newSystemCategory, setNewSystemCategory] = useState<GradingCategory>('FINAL');
  const [newSystemClassId, setNewSystemClassId] = useState<string>('all-classes');
  const [newSystemTermId, setNewSystemTermId] = useState<string>('all-terms');
  const [isCreating, setIsCreating] = useState(false);
  
  // Copy dialog
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copySourceId, setCopySourceId] = useState<string | null>(null);
  const [copyTargetCategory, setCopyTargetCategory] = useState<GradingCategory>('FINAL');
  const [copyTargetName, setCopyTargetName] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  
  // Add/Edit grade
  const [newGrade, setNewGrade] = useState({
    grade: '',
    minScore: 0,
    maxScore: 100,
    points: 0,
    remarks: '',
  });
  const [isAddingGrade, setIsAddingGrade] = useState(false);
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  
  // Auto-save state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [editedGrades, setEditedGrades] = useState<Map<string, Grade>>(new Map());

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [systemsRes, classesRes, termsRes] = await Promise.all([
        fetch('/api/dos/grading-systems'),
        fetch('/api/dos/classes'),
        fetch('/api/dos/terms'),
      ]);

      if (!systemsRes.ok || !classesRes.ok || !termsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [systemsData, classesData, termsData] = await Promise.all([
        systemsRes.json(),
        classesRes.json(),
        termsRes.json(),
      ]);

      setGradingSystems(systemsData.gradingSystems || []);
      setClasses(classesData.classes || []);
      setTerms(termsData.terms || []);
      
      if (systemsData.gradingSystems?.length > 0 && !selectedSystemId) {
        setSelectedSystemId(systemsData.gradingSystems[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedSystemId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Auto-save functionality - Save edited grades every 2 seconds
  const autoSaveGrades = useCallback(async () => {
    if (!selectedSystemId || editedGrades.size === 0) return;

    try {
      setAutoSaveStatus('saving');

      for (const [gradeId, grade] of editedGrades.entries()) {
        const response = await fetch(
          `/api/dos/grading-systems/${selectedSystemId}/grades/${gradeId}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              grade: grade.grade,
              minScore: grade.minScore,
              maxScore: grade.maxScore,
              points: grade.points,
              remarks: grade.remarks || '',
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Auto-save failed');
        }
      }

      setAutoSaveStatus('saved');
      setLastSavedAt(new Date());
      setHasUnsavedChanges(false);
      setEditedGrades(new Map());
      
      // Clear localStorage
      const storageKey = `grading-system-${selectedSystemId}`;
      localStorage.removeItem(storageKey);
      
      await fetchData();
    } catch (err) {
      console.error('Auto-save error:', err);
      setAutoSaveStatus('unsaved');
    }
  }, [selectedSystemId, editedGrades, fetchData]);

  useEffect(() => {
    if (!hasUnsavedChanges || !selectedSystemId || editedGrades.size === 0) return;

    const timer = setTimeout(() => {
      autoSaveGrades();
    }, 2000);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, editedGrades, selectedSystemId, autoSaveGrades]);

  // localStorage backup - Save unsaved changes
  useEffect(() => {
    if (!selectedSystemId || editedGrades.size === 0) return;

    const storageKey = `grading-system-${selectedSystemId}`;
    const gradesObj = Object.fromEntries(editedGrades);
    localStorage.setItem(storageKey, JSON.stringify(gradesObj));
  }, [editedGrades, selectedSystemId]);

  // Restore from localStorage on mount
  useEffect(() => {
    if (!selectedSystemId) return;

    const storageKey = `grading-system-${selectedSystemId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      try {
        const gradesObj = JSON.parse(stored);
        const gradesMap = new Map<string, Grade>(Object.entries(gradesObj));
        setEditedGrades(gradesMap);
        setHasUnsavedChanges(true);
      } catch (err) {
        console.error('Failed to restore from localStorage:', err);
      }
    }
  }, [selectedSystemId]);

  // Auto-save on page unload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && editedGrades.size > 0) {
        // Try to save using sendBeacon
        const storageKey = `grading-system-${selectedSystemId}`;
        const gradesObj = Object.fromEntries(editedGrades);
        localStorage.setItem(storageKey, JSON.stringify(gradesObj));
        
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, editedGrades, selectedSystemId]);

  // Create new grading system
  const handleCreateSystem = async () => {
    if (!newSystemName.trim()) {
      setError('System name is required');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const response = await fetch('/api/dos/grading-systems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSystemName.trim(),
          category: newSystemCategory,
          classId: newSystemClassId && newSystemClassId !== 'all-classes' ? newSystemClassId : null,
          termId: newSystemTermId && newSystemTermId !== 'all-terms' ? newSystemTermId : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create grading system');
      }

      const data = await response.json();
      setSuccessMessage(`Grading system "${newSystemName}" created successfully!`);
      setNewSystemName('');
      setNewSystemCategory('FINAL');
      setNewSystemClassId('all-classes');
      setNewSystemTermId('all-terms');
      setShowCreateDialog(false);
      
      await fetchData();
      setSelectedSystemId(data.gradingSystem.id);
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create grading system');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete, Set Default, Copy, Add Grade, Update Grade, Delete Grade functions
  // (Same as before - keeping them for brevity)
  
  const handleDeleteSystem = async (systemId: string) => {
    const system = gradingSystems.find((s) => s.id === systemId);
    if (!system) return;
    if (system.isDefault) {
      setError('Cannot delete the default grading system');
      return;
    }
    if (!confirm(`Are you sure you want to delete "${system.name}"?`)) return;

    try {
      setError(null);
      const response = await fetch(`/api/dos/grading-systems/${systemId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete grading system');
      }
      setSuccessMessage(`Grading system "${system.name}" deleted successfully!`);
      if (selectedSystemId === systemId) {
        const remaining = gradingSystems.filter(s => s.id !== systemId);
        setSelectedSystemId(remaining[0]?.id || null);
      }
      await fetchData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete grading system');
    }
  };

  const handleSetDefault = async (systemId: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/dos/grading-systems/${systemId}/set-default`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to set default grading system');
      }
      const system = gradingSystems.find((s) => s.id === systemId);
      setSuccessMessage(`"${system?.name}" is now the default grading system!`);
      await fetchData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default grading system');
    }
  };

  const handleCopySystem = async () => {
    if (!copySourceId || !copyTargetName.trim()) {
      setError('Please provide a name for the copied system');
      return;
    }
    try {
      setIsCopying(true);
      setError(null);
      const response = await fetch(`/api/dos/grading-systems/${copySourceId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetCategory: copyTargetCategory,
          targetName: copyTargetName.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to copy grading system');
      }
      const data = await response.json();
      setSuccessMessage(`Grading system copied to ${CATEGORY_LABELS[copyTargetCategory]}!`);
      setCopySourceId(null);
      setCopyTargetName('');
      setShowCopyDialog(false);
      await fetchData();
      setSelectedSystemId(data.gradingSystem.id);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to copy grading system');
    } finally {
      setIsCopying(false);
    }
  };

  const handleAddGrade = async () => {
    if (!selectedSystemId) return;
    const { grade, minScore, maxScore, points, remarks } = newGrade;
    if (!grade.trim()) {
      setError('Grade letter is required');
      return;
    }
    if (minScore >= maxScore) {
      setError('Minimum score must be less than maximum score');
      return;
    }
    if (minScore < 0 || maxScore > 100) {
      setError('Scores must be between 0 and 100');
      return;
    }
    try {
      setIsAddingGrade(true);
      setError(null);
      const response = await fetch(`/api/dos/grading-systems/${selectedSystemId}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grade: grade.trim(),
          minScore,
          maxScore,
          points,
          remarks: remarks.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add grade range');
      }
      setSuccessMessage(`Grade "${grade}" added successfully!`);
      setNewGrade({ grade: '', minScore: 0, maxScore: 100, points: 0, remarks: '' });
      await fetchData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add grade range');
    } finally {
      setIsAddingGrade(false);
    }
  };

  const handleUpdateGrade = async () => {
    if (!selectedSystemId || !editingGrade) return;
    const { grade, minScore, maxScore } = editingGrade;
    if (!grade.trim()) {
      setError('Grade letter is required');
      return;
    }
    if (minScore >= maxScore) {
      setError('Minimum score must be less than maximum score');
      return;
    }
    if (minScore < 0 || maxScore > 100) {
      setError('Scores must be between 0 and 100');
      return;
    }
    
    // Add to edited grades for auto-save
    const newEditedGrades = new Map(editedGrades);
    newEditedGrades.set(editingGrade.id, editingGrade);
    setEditedGrades(newEditedGrades);
    setHasUnsavedChanges(true);
    setAutoSaveStatus('unsaved');
    
    setEditingGradeId(null);
    setEditingGrade(null);
    
    // Update local state immediately for better UX
    setGradingSystems(prev => prev.map(sys => {
      if (sys.id === selectedSystemId) {
        return {
          ...sys,
          grades: sys.grades.map(g => g.id === editingGrade.id ? editingGrade : g)
        };
      }
      return sys;
    }));
  };

  const handleDeleteGrade = async (gradeId: string) => {
    if (!selectedSystemId) return;
    if (!confirm('Are you sure you want to delete this grade range?')) return;
    try {
      setError(null);
      const response = await fetch(
        `/api/dos/grading-systems/${selectedSystemId}/grades/${gradeId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete grade range');
      }
      setSuccessMessage('Grade deleted successfully!');
      await fetchData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete grade range');
    }
  };

  const filteredSystems =
    categoryFilter === 'ALL'
      ? gradingSystems
      : gradingSystems.filter((s) => s.category === categoryFilter);

  const selectedSystem = gradingSystems.find((s) => s.id === selectedSystemId);
  const sortedGrades = selectedSystem?.grades?.sort((a, b) => b.maxScore - a.maxScore) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <Award className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Grading System</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Configure grading scales by category, class, and term</p>
              {/* Auto-save status */}
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 text-xs mt-2">
                  {autoSaveStatus === 'saving' && (
                    <span className="text-blue-600 flex items-center gap-1">
                      <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                      Saving...
                    </span>
                  )}
                  {autoSaveStatus === 'saved' && lastSavedAt && (
                    <span className="text-green-600">
                      ✓ Saved {lastSavedAt.toLocaleTimeString()}
                    </span>
                  )}
                  {autoSaveStatus === 'unsaved' && (
                    <span className="text-orange-600">Unsaved changes</span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Filter and Create Button */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Select
              value={categoryFilter}
              onValueChange={(value) => setCategoryFilter(value as GradingCategory | 'ALL')}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="FINAL">Final (Exam + CA)</SelectItem>
                <SelectItem value="EXAM_ONLY">Exam Only</SelectItem>
                <SelectItem value="CA_ONLY">CA Only</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              <span>New System</span>
            </Button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left: Systems List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">
                Grading Systems ({filteredSystems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredSystems.length === 0 ? (
                <p className="text-xs sm:text-sm text-gray-500 text-center py-8">
                  No grading systems found. Create one to get started.
                </p>
              ) : (
                filteredSystems.map((system) => (
                  <div
                    key={system.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedSystemId === system.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSystemId(system.id)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm sm:text-base text-gray-900 truncate">{system.name}</h3>
                          <div className="flex items-center gap-1 flex-wrap mt-1">
                            {system.isDefault && (
                              <Badge variant="default" className="text-xs">Default</Badge>
                            )}
                            <Badge className={`text-xs ${CATEGORY_COLORS[system.category]}`}>
                              {CATEGORY_LABELS[system.category]}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <p className="text-gray-500">
                          {system.grades?.length || 0} grade ranges
                        </p>
                        {system.class && (
                          <p className="text-gray-600 flex items-center gap-1">
                            <School className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{system.class.name}</span>
                          </p>
                        )}
                        {system.term && (
                          <p className="text-gray-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{system.term.name}</span>
                          </p>
                        )}
                        <p className="text-gray-400">
                          Created {new Date(system.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {/* Action Buttons - Full Width on Mobile */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCopySourceId(system.id);
                            setCopyTargetName(system.name + ' (Copy)');
                            setShowCopyDialog(true);
                          }}
                          className="flex-1 sm:flex-none text-xs h-8"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        {!system.isDefault && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefault(system.id);
                              }}
                              className="flex-1 sm:flex-none text-xs h-8"
                            >
                              Set Default
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSystem(system.id);
                              }}
                              className="flex-1 sm:flex-none text-xs h-8 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Right: Grade Ranges */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">
                {selectedSystem
                  ? `${selectedSystem.name} - Grade Ranges`
                  : 'Select a System'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedSystem ? (
                <p className="text-xs sm:text-sm text-gray-500 text-center py-8">
                  Select a grading system to view and manage grade ranges
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Add New Grade Form WITH LABELS */}
                  <div className="p-3 sm:p-4 bg-gray-50 rounded-lg space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">Add New Grade Range</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Grade Letter</Label>
                        <Input
                          placeholder="e.g., A"
                          value={newGrade.grade}
                          onChange={(e) => setNewGrade({ ...newGrade, grade: e.target.value })}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Min Score</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={newGrade.minScore}
                          onChange={(e) =>
                            setNewGrade({ ...newGrade, minScore: Number(e.target.value) })
                          }
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Max Score</Label>
                        <Input
                          type="number"
                          placeholder="100"
                          value={newGrade.maxScore}
                          onChange={(e) =>
                            setNewGrade({ ...newGrade, maxScore: Number(e.target.value) })
                          }
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Grade Points</Label>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="4.0"
                          value={newGrade.points}
                          onChange={(e) =>
                            setNewGrade({ ...newGrade, points: Number(e.target.value) })
                          }
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">Remarks</Label>
                        <Input
                          placeholder="Excellent"
                          value={newGrade.remarks}
                          onChange={(e) => setNewGrade({ ...newGrade, remarks: e.target.value })}
                          className="h-9"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleAddGrade}
                      disabled={isAddingGrade}
                      className="w-full sm:w-auto h-9"
                    >
                      {isAddingGrade ? 'Adding...' : 'Add Grade'}
                    </Button>
                  </div>

                  {/* Grades List - Mobile: Cards, Desktop: Table */}
                  {sortedGrades.length === 0 ? (
                    <p className="text-xs sm:text-sm text-gray-500 text-center py-8">
                      No grade ranges yet. Add one above to get started.
                    </p>
                  ) : (
                    <>
                      {/* Mobile View - Cards */}
                      <div className="block lg:hidden space-y-3">
                        {sortedGrades.map((grade) => (
                          <div key={grade.id} className="p-3 bg-white border rounded-lg space-y-2">
                            {editingGradeId === grade.id ? (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs text-gray-600">Grade</Label>
                                    <Input
                                      value={editingGrade?.grade || ''}
                                      onChange={(e) =>
                                        setEditingGrade({
                                          ...editingGrade!,
                                          grade: e.target.value,
                                        })
                                      }
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Points</Label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      value={editingGrade?.points || 0}
                                      onChange={(e) =>
                                        setEditingGrade({
                                          ...editingGrade!,
                                          points: Number(e.target.value),
                                        })
                                      }
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-600">Score Range</Label>
                                  <div className="flex gap-2 items-center">
                                    <Input
                                      type="number"
                                      value={editingGrade?.minScore || 0}
                                      onChange={(e) =>
                                        setEditingGrade({
                                          ...editingGrade!,
                                          minScore: Number(e.target.value),
                                        })
                                      }
                                      className="h-8 text-sm"
                                      placeholder="Min"
                                    />
                                    <span className="text-gray-500">-</span>
                                    <Input
                                      type="number"
                                      value={editingGrade?.maxScore || 0}
                                      onChange={(e) =>
                                        setEditingGrade({
                                          ...editingGrade!,
                                          maxScore: Number(e.target.value),
                                        })
                                      }
                                      className="h-8 text-sm"
                                      placeholder="Max"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-600">Remarks</Label>
                                  <Input
                                    value={editingGrade?.remarks || ''}
                                    onChange={(e) =>
                                      setEditingGrade({
                                        ...editingGrade!,
                                        remarks: e.target.value,
                                      })
                                    }
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={handleUpdateGrade}
                                    className="flex-1 h-8"
                                  >
                                    <Save className="h-3 w-3 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingGradeId(null);
                                      setEditingGrade(null);
                                    }}
                                    className="flex-1 h-8"
                                  >
                                    <X className="h-3 w-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="font-mono text-sm">
                                        {grade.grade}
                                      </Badge>
                                      <span className="text-sm text-gray-700">
                                        {grade.minScore} - {grade.maxScore}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                      Points: {grade.points}
                                    </p>
                                    {grade.remarks && (
                                      <p className="text-xs text-gray-500">{grade.remarks}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingGradeId(grade.id);
                                        setEditingGrade(grade);
                                      }}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit2 className="h-4 w-4 text-blue-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteGrade(grade.id)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Desktop View - Table */}
                      <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                Grade
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                Score Range
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                Points
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                                Remarks
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {sortedGrades.map((grade) => (
                              <tr key={grade.id} className="hover:bg-gray-50">
                                {editingGradeId === grade.id ? (
                                  <>
                                    <td className="px-4 py-3">
                                      <Input
                                        value={editingGrade?.grade || ''}
                                        onChange={(e) =>
                                          setEditingGrade({
                                            ...editingGrade!,
                                            grade: e.target.value,
                                          })
                                        }
                                        className="w-20"
                                      />
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex gap-1 items-center">
                                        <Input
                                          type="number"
                                          value={editingGrade?.minScore || 0}
                                          onChange={(e) =>
                                            setEditingGrade({
                                              ...editingGrade!,
                                              minScore: Number(e.target.value),
                                            })
                                          }
                                          className="w-16"
                                        />
                                        <span>-</span>
                                        <Input
                                          type="number"
                                          value={editingGrade?.maxScore || 0}
                                          onChange={(e) =>
                                            setEditingGrade({
                                              ...editingGrade!,
                                              maxScore: Number(e.target.value),
                                            })
                                          }
                                          className="w-16"
                                        />
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <Input
                                        type="number"
                                        step="0.1"
                                        value={editingGrade?.points || 0}
                                        onChange={(e) =>
                                          setEditingGrade({
                                            ...editingGrade!,
                                            points: Number(e.target.value),
                                          })
                                        }
                                        className="w-20"
                                      />
                                    </td>
                                    <td className="px-4 py-3">
                                      <Input
                                        value={editingGrade?.remarks || ''}
                                        onChange={(e) =>
                                          setEditingGrade({
                                            ...editingGrade!,
                                            remarks: e.target.value,
                                          })
                                        }
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="flex gap-1 justify-end">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={handleUpdateGrade}
                                          title="Save changes"
                                        >
                                          <Save className="h-4 w-4 text-green-600" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingGradeId(null);
                                            setEditingGrade(null);
                                          }}
                                          title="Cancel"
                                        >
                                          <X className="h-4 w-4 text-gray-600" />
                                        </Button>
                                      </div>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-4 py-3">
                                      <Badge variant="outline" className="font-mono">
                                        {grade.grade}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                      {grade.minScore} - {grade.maxScore}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                      {grade.points}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                      {grade.remarks}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                      <div className="flex gap-1 justify-end">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingGradeId(grade.id);
                                            setEditingGrade(grade);
                                          }}
                                          title="Edit grade"
                                        >
                                          <Edit2 className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteGrade(grade.id)}
                                          title="Delete grade"
                                        >
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                      </div>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create System Dialog - ENHANCED & MOBILE-FRIENDLY */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Create New Grading System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">System Name *</Label>
                  <Input
                    placeholder="e.g., Primary School Grading"
                    value={newSystemName}
                    onChange={(e) => setNewSystemName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSystem()}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">Category *</Label>
                  <Select
                    value={newSystemCategory}
                    onValueChange={(value) => setNewSystemCategory(value as GradingCategory)}
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FINAL">Final (Exam + CA)</SelectItem>
                      <SelectItem value="EXAM_ONLY">Exam Only</SelectItem>
                      <SelectItem value="CA_ONLY">CA Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">
                    Apply to Specific Class (Optional)
                  </Label>
                  <Select
                    value={newSystemClassId}
                    onValueChange={setNewSystemClassId}
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Whole School (All Classes)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-classes">Whole School (All Classes)</SelectItem>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to apply to all classes
                  </p>
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">
                    Tie to Specific Term (Optional)
                  </Label>
                  <Select
                    value={newSystemTermId}
                    onValueChange={setNewSystemTermId}
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="All Terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-terms">All Terms</SelectItem>
                      {terms.map((term) => (
                        <SelectItem key={term.id} value={term.id}>
                          {term.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to use for all terms
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-md text-xs sm:text-sm text-blue-800">
                  <p className="font-medium">ℹ️ Configuration Summary:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Category: {CATEGORY_LABELS[newSystemCategory]}</li>
                    <li>
                      Scope: {newSystemClassId && newSystemClassId !== 'all-classes'
                        ? classes.find(c => c.id === newSystemClassId)?.name
                        : 'Whole School'}
                    </li>
                    <li>
                      Term: {newSystemTermId && newSystemTermId !== 'all-terms'
                        ? terms.find(t => t.id === newSystemTermId)?.name
                        : 'All Terms'}
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateDialog(false);
                      setNewSystemName('');
                      setNewSystemCategory('FINAL');
                      setNewSystemClassId('all-classes');
                      setNewSystemTermId('all-terms');
                    }}
                    className="w-full sm:w-auto h-9"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateSystem} disabled={isCreating} className="w-full sm:w-auto h-9">
                    {isCreating ? 'Creating...' : 'Create System'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Copy System Dialog - MOBILE-FRIENDLY */}
        {showCopyDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Copy Grading System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">New System Name</Label>
                  <Input
                    placeholder="e.g., Exam Grading"
                    value={copyTargetName}
                    onChange={(e) => setCopyTargetName(e.target.value)}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs sm:text-sm font-medium text-gray-700">Target Category</Label>
                  <Select
                    value={copyTargetCategory}
                    onValueChange={(value) => setCopyTargetCategory(value as GradingCategory)}
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FINAL">Final (Exam + CA)</SelectItem>
                      <SelectItem value="EXAM_ONLY">Exam Only</SelectItem>
                      <SelectItem value="CA_ONLY">CA Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 bg-blue-50 rounded-md text-xs sm:text-sm text-blue-800">
                  <p className="font-medium">ℹ️ What will be copied:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>All grade ranges (letters, scores, points, remarks)</li>
                    <li>System will be created in the selected category</li>
                  </ul>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCopyDialog(false);
                      setCopySourceId(null);
                      setCopyTargetName('');
                    }}
                    className="w-full sm:w-auto h-9"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCopySystem} disabled={isCopying} className="w-full sm:w-auto h-9">
                    {isCopying ? 'Copying...' : 'Copy System'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
