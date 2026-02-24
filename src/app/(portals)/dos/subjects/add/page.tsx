'use client'

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Plus } from 'lucide-react';

interface NewSubject {
  name: string;
  code: string;
  description: string;
  credits: number;
  type: 'core' | 'elective';
  maxCapacity?: number;
  prerequisites: string[];
}

function AddSubjectPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectType = searchParams.get('type') as 'core' | 'elective' || 'core';
  
  const [subject, setSubject] = useState<NewSubject>({
    name: '',
    code: '',
    description: '',
    credits: 3,
    type: subjectType,
    maxCapacity: subjectType === 'elective' ? 30 : undefined,
    prerequisites: []
  });
  const [saving, setSaving] = useState(false);

  const handleBack = () => {
    router.push('/dos/subjects/management');
  };

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    // Redirect back to management page
    router.push('/dos/subjects/management');
  };

  const handleSubjectChange = (key: keyof NewSubject, value: any) => {
    setSubject(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subject Management
          </Button>
        </div>
        <Button onClick={handleSave} disabled={saving || !subject.name || !subject.code}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Subject'}
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
          Add {subject.type === 'core' ? 'Core' : 'Elective'} Subject
        </h1>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
          Create a new {subject.type} subject for the curriculum
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subject Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Subject Name *</Label>
              <Input
                id="name"
                value={subject.name}
                onChange={(e) => handleSubjectChange('name', e.target.value)}
                placeholder="e.g., Mathematics"
              />
            </div>
            <div>
              <Label htmlFor="code">Subject Code *</Label>
              <Input
                id="code"
                value={subject.code}
                onChange={(e) => handleSubjectChange('code', e.target.value.toUpperCase())}
                placeholder="e.g., MATH101"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={subject.description}
              onChange={(e) => handleSubjectChange('description', e.target.value)}
              placeholder="Brief description of the subject..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="credits">Credits</Label>
              <Input
                id="credits"
                type="number"
                min="1"
                max="6"
                value={subject.credits}
                onChange={(e) => handleSubjectChange('credits', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="type">Subject Type</Label>
              <Select value={subject.type} onValueChange={(value) => handleSubjectChange('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="core">Core Subject</SelectItem>
                  <SelectItem value="elective">Elective Subject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {subject.type === 'elective' && (
              <div>
                <Label htmlFor="capacity">Max Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={subject.maxCapacity || ''}
                  onChange={(e) => handleSubjectChange('maxCapacity', parseInt(e.target.value))}
                  placeholder="30"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
export default function AddSubjectPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <AddSubjectPageContent />
    </Suspense>
  )
}
