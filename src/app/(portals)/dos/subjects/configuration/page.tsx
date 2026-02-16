'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Settings, Save } from 'lucide-react';

interface SubjectConfiguration {
  maxCreditsPerTerm: number;
  minCreditsPerTerm: number;
  allowElectiveOverride: boolean;
  requirePrerequisites: boolean;
  maxClassSize: number;
  enableWaitlist: boolean;
  autoAssignTeachers: boolean;
}

export default function SubjectConfigurationPage() {
  const router = useRouter();
  const [config, setConfig] = useState<SubjectConfiguration>({
    maxCreditsPerTerm: 20,
    minCreditsPerTerm: 12,
    allowElectiveOverride: true,
    requirePrerequisites: true,
    maxClassSize: 35,
    enableWaitlist: true,
    autoAssignTeachers: false
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
    // Show success message or redirect
  };

  const handleConfigChange = (key: keyof SubjectConfiguration, value: any) => {
    setConfig(prev => ({
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
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Subject Configuration</h1>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Configure subject management settings and policies</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-[var(--chart-blue)]" />
              <span>Credit Requirements</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="maxCredits">Maximum Credits Per Term</Label>
              <Input
                id="maxCredits"
                type="number"
                value={config.maxCreditsPerTerm}
                onChange={(e) => handleConfigChange('maxCreditsPerTerm', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="minCredits">Minimum Credits Per Term</Label>
              <Input
                id="minCredits"
                type="number"
                value={config.minCreditsPerTerm}
                onChange={(e) => handleConfigChange('minCreditsPerTerm', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-[var(--chart-green)]" />
              <span>Class Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="maxClassSize">Maximum Class Size</Label>
              <Input
                id="maxClassSize"
                type="number"
                value={config.maxClassSize}
                onChange={(e) => handleConfigChange('maxClassSize', parseInt(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enableWaitlist">Enable Waitlist</Label>
              <Switch
                id="enableWaitlist"
                checked={config.enableWaitlist}
                onCheckedChange={(checked) => handleConfigChange('enableWaitlist', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-[var(--chart-purple)]" />
              <span>Subject Policies</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="allowOverride">Allow Elective Override</Label>
              <Switch
                id="allowOverride"
                checked={config.allowElectiveOverride}
                onCheckedChange={(checked) => handleConfigChange('allowElectiveOverride', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="requirePrereq">Require Prerequisites</Label>
              <Switch
                id="requirePrereq"
                checked={config.requirePrerequisites}
                onCheckedChange={(checked) => handleConfigChange('requirePrerequisites', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-[var(--chart-orange)]" />
              <span>Teacher Assignment</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="autoAssign">Auto-assign Teachers</Label>
              <Switch
                id="autoAssign"
                checked={config.autoAssignTeachers}
                onCheckedChange={(checked) => handleConfigChange('autoAssignTeachers', checked)}
              />
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Automatically assign qualified teachers to subjects based on availability and expertise.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}