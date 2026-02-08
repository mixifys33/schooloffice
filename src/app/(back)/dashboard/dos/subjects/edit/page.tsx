'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Edit, Trash2, Users, BookOpen, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  educationLevel: 'PRIMARY' | 'SECONDARY' | 'BOTH';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  classSubjects: Array<{
    id: string;
    class: {
      id: string;
      name: string;
    };
  }>;
  staffSubjects: Array<{
    id: string;
    staff: {
      id: string;
      firstName: string;
      lastName: string;
    };
    class: {
      id: string;
      name: string;
    };
  }>;
}

interface SubjectFormData {
  name: string;
  code: string;
  description: string;
  educationLevel: 'PRIMARY' | 'SECONDARY' | 'BOTH';
  isActive: boolean;
}

export default function EditSubjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<SubjectFormData>({
    name: '',
    code: '',
    description: '',
    educationLevel: 'BOTH',
    isActive: true
  });

  useEffect(() => {
    if (subjectId) {
      fetchSubject();
    } else {
      setLoading(false);
      toast.error('No subject ID provided');
    }
  }, [subjectId]);

  const fetchSubject = async () => {
    try {
      const response = await fetch(`/api/dos/subjects/${subjectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch subject');
      }
      
      const data = await response.json();
      setSubject(data.subject);
      setFormData({
        name: data.subject.name,
        code: data.subject.code,
        description: data.subject.description || '',
        educationLevel: data.subject.educationLevel,
        isActive: data.subject.isActive
      });
    } catch (error) {
      toast.error('Failed to load subject details');
      console.error('Error fetching subject:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof SubjectFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/dos/subjects/${subjectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update subject');
      }

      toast.success('Subject updated successfully!');
      router.push('/dashboard/dos/subjects/management');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update subject');
      console.error('Error updating subject:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/dos/subjects/${subjectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete subject');
      }

      toast.success('Subject deleted successfully!');
      router.push('/dashboard/dos/subjects/management');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete subject');
      console.error('Error deleting subject:', error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--text-secondary)]">Loading subject details...</p>
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">Subject Not Found</h3>
          <p className="text-[var(--text-secondary)] mb-4">The subject you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push('/dashboard/dos/subjects/management')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
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
              Edit Subject
            </h1>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              Modify subject details and settings
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={subject.isActive ? "default" : "secondary"}>
            {subject.isActive ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="outline">
            {subject.educationLevel}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Edit className="h-5 w-5" />
                  <span>Subject Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Subject Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., Mathematics"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="code">Subject Code *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                      placeholder="e.g., MATH"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of the subject..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="educationLevel">Education Level *</Label>
                  <Select
                    value={formData.educationLevel}
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
                    checked={formData.isActive}
                    onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                  />
                  <Label htmlFor="isActive">Active Subject</Label>
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting || subject.classSubjects.length > 0}
                  >
                    {deleting ? (
                      <>Deleting...</>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Subject
                      </>
                    )}
                  </Button>
                  
                  <div className="flex space-x-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving || !formData.name || !formData.code}
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
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Subject Usage Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Class Assignments</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subject.classSubjects.length > 0 ? (
                <div className="space-y-2">
                  {subject.classSubjects.map((classSubject) => (
                    <div
                      key={classSubject.id}
                      className="flex items-center justify-between p-2 bg-[var(--bg-surface)] rounded"
                    >
                      <span className="text-sm">{classSubject.class.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-secondary)] text-sm">
                  Not assigned to any classes yet
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Teacher Assignments</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subject.staffSubjects.length > 0 ? (
                <div className="space-y-2">
                  {subject.staffSubjects.map((staffSubject) => (
                    <div
                      key={staffSubject.id}
                      className="p-2 bg-[var(--bg-surface)] rounded"
                    >
                      <div className="text-sm font-medium">
                        {staffSubject.staff.firstName} {staffSubject.staff.lastName}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        {staffSubject.class.name}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-secondary)] text-sm">
                  No teachers assigned yet
                </p>
              )}
            </CardContent>
          </Card>

          {subject.classSubjects.length > 0 && (
            <Card className="border-[var(--warning)] bg-[var(--warning-light)]">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-[var(--warning-dark)] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--warning-dark)]">
                      Cannot Delete
                    </p>
                    <p className="text-xs text-[var(--warning-dark)] mt-1">
                      This subject is assigned to {subject.classSubjects.length} class(es) and cannot be deleted. 
                      Remove all class assignments first.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}