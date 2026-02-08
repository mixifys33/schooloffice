'use client'

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface SubjectEditData {
  id: string;
  name: string;
  code: string;
  description?: string;
  educationLevel: 'PRIMARY' | 'SECONDARY' | 'BOTH';
  isActive: boolean;
  // DoS Curriculum data if exists
  curriculumData?: {
    isCore: boolean;
    caWeight: number;
    examWeight: number;
    minPassMark: number;
    periodsPerWeek: number;
    dosApproved: boolean;
  };
}

export default function EditSubjectPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState<SubjectEditData | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.schoolId && params.id) {
      fetchSubject(params.id as string);
    }
  }, [status, session?.user?.schoolId, params.id]);

  const fetchSubject = async (subjectId: string) => {
    try {
      const response = await fetch(`/api/dos/subjects/${subjectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch subject');
      }
      const data = await response.json();
      setSubject(data.subject);
    } catch (error) {
      console.error('Error fetching subject:', error);
      toast.error('Failed to load subject data');
      router.push('/dashboard/dos/subjects/management');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof SubjectEditData, value: any) => {
    if (!subject) return;
    
    setSubject(prev => ({
      ...prev!,
      [field]: value
    }));
  };

  const handleCurriculumChange = (field: string, value: any) => {
    if (!subject) return;
    
    setSubject(prev => ({
      ...prev!,
      curriculumData: {
        ...prev!.curriculumData!,
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!subject) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/dos/subjects/${subject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subject),
      });

      if (!response.ok) {
        throw new Error('Failed to update subject');
      }

      toast.success('Subject updated successfully!');
      router.push('/dashboard/dos/subjects/management');
    } catch (error) {
      toast.error('Failed to update subject. Please try again.');
      console.error('Error updating subject:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!subject || !confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/dos/subjects/${subject.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete subject');
      }

      toast.success('Subject deleted successfully!');
      router.push('/dashboard/dos/subjects/management');
    } catch (error) {
      toast.error('Failed to delete subject. Please try again.');
      console.error('Error deleting subject:', error);
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading subject...</p>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-[var(--text-secondary)]">Subject not found</p>
          <Button onClick={() => router.push('/dashboard/dos/subjects/management')} className="mt-4">
            Back to Subjects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
              Edit Subject: {subject.name}
            </h1>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              Modify subject details and curriculum settings
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={saving}
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !subject.name || !subject.code}
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Subject Information */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Subject Name *</Label>
              <Input
                id="name"
                value={subject.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Mathematics"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Subject Code *</Label>
              <Input
                id="code"
                value={subject.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                placeholder="e.g., MATH"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={subject.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the subject..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="educationLevel">Education Level</Label>
              <Select
                value={subject.educationLevel}
                onValueChange={(value) => handleInputChange('educationLevel', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIMARY">Primary Only</SelectItem>
                  <SelectItem value="SECONDARY">Secondary Only</SelectItem>
                  <SelectItem value="BOTH">Both Levels</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={subject.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
              <Label htmlFor="isActive">Active Subject</Label>
            </div>
          </CardContent>
        </Card>

        {/* Curriculum Settings */}
        {subject.curriculumData && (
          <Card>
            <CardHeader>
              <CardTitle>Curriculum Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isCore"
                  checked={subject.curriculumData.isCore}
                  onCheckedChange={(checked) => handleCurriculumChange('isCore', checked)}
                />
                <Label htmlFor="isCore">Core Subject</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="caWeight">CA Weight (%)</Label>
                  <Input
                    id="caWeight"
                    type="number"
                    value={subject.curriculumData.caWeight}
                    onChange={(e) => handleCurriculumChange('caWeight', parseFloat(e.target.value))}
                    min="0"
                    max="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="examWeight">Exam Weight (%)</Label>
                  <Input
                    id="examWeight"
                    type="number"
                    value={subject.curriculumData.examWeight}
                    onChange={(e) => handleCurriculumChange('examWeight', parseFloat(e.target.value))}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minPassMark">Min Pass Mark</Label>
                  <Input
                    id="minPassMark"
                    type="number"
                    value={subject.curriculumData.minPassMark}
                    onChange={(e) => handleCurriculumChange('minPassMark', parseFloat(e.target.value))}
                    min="0"
                    max="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="periodsPerWeek">Periods per Week</Label>
                  <Input
                    id="periodsPerWeek"
                    type="number"
                    value={subject.curriculumData.periodsPerWeek}
                    onChange={(e) => handleCurriculumChange('periodsPerWeek', parseInt(e.target.value))}
                    min="1"
                    max="10"
                  />
                </div>
              </div>

              <div className="p-4 bg-[var(--bg-muted)] rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${subject.curriculumData.dosApproved ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-sm font-medium">
                    DoS Approval Status: {subject.curriculumData.dosApproved ? 'Approved' : 'Pending'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Changes to curriculum settings will reset approval status
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}