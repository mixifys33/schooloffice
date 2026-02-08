'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Settings, AlertCircle } from 'lucide-react';

interface SubjectConfiguration {
  maxSubjectsPerStudent: number;
  minSubjectsPerStudent: number;
  allowSubjectChanges: boolean;
  subjectChangeDeadline: string;
  requireParentApproval: boolean;
  autoAssignCore: boolean;
  electiveSelectionPeriod: string;
  maxClassSize: number;
  minClassSize: number;
}

export default function SubjectConfigurationPage() {
  const router = useRouter();
  const [config, setConfig] = useState<SubjectConfiguration>({
    maxSubjectsPerStudent: 8,
    minSubjectsPerStudent: 6,
    allowSubjectChanges: true,
    subjectChangeDeadline: '2024-03-15',
    requireParentApproval: false,
    autoAssignCore: true,
    electiveSelectionPeriod: '2024-02-01',
    maxClassSize: 35,
    minClassSize: 15
  });
  const [loading, setLoading] = useState(false);
  const [savedConfigurations, setSavedConfigurations] = useState<SubjectConfiguration[]>([]);

  useEffect(() => {
    fetchConfigurations()
  }, [])

  const fetchConfigurations = async () => {
    try {
      setLoading(true)
      // Mock data for now - replace with actual API call
      const mockConfigs: SubjectConfiguration[] = [
        {
          id: '1',
          name: 'Mathematics',
          code: 'MATH',
          type: 'core',
          description: 'Core mathematics curriculum covering algebra, geometry, and statistics',
          isActive: true,
          maxStudents: 30,
          minTeachers: 1,
          hoursPerWeek: 5,
          assessmentWeight: 100,
          prerequisites: [],
          gradeLevel: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
        },
        {
          id: '2',
          name: 'Computer Science',
          code: 'CS',
          type: 'elective',
          description: 'Programming fundamentals and computer science concepts',
          isActive: true,
          maxStudents: 25,
          minTeachers: 1,
          hoursPerWeek: 3,
          assessmentWeight: 80,
          prerequisites: ['Basic Mathematics'],
          gradeLevel: ['Grade 10', 'Grade 11', 'Grade 12']
        },
        {
          id: '3',
          name: 'Art & Design',
          code: 'ART',
          type: 'elective',
          description: 'Creative arts and design principles',
          isActive: true,
          maxStudents: 20,
          minTeachers: 1,
          hoursPerWeek: 2,
          assessmentWeight: 60,
          prerequisites: [],
          gradeLevel: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
        }
      ]
      setConfigurations(mockConfigs)
    } catch (error) {
      console.error('Error fetching configurations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfiguration = async (config: SubjectConfiguration) => {
    try {
      setSaving(true)
      // Mock save - replace with actual API call
      console.log('Saving configuration:', config)
      
      // Update local state
      setConfigurations(prev => 
        prev.map(c => c.id === config.id ? config : c)
      )
      
      // Show success message (you might want to add a toast notification)
      alert('Configuration saved successfully!')
    } catch (error) {
      console.error('Error saving configuration:', error)
      alert('Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleConfigChange = (field: keyof SubjectConfiguration, value: any) => {
    if (!selectedConfig) return
    
    setSelectedConfig(prev => prev ? { ...prev, [field]: value } : null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
            Subject Configuration
          </h1>
          <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            Configure subject settings, requirements, and parameters
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subject List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" />
              <span>Subjects</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : (
              configurations.map(config => (
                <div
                  key={config.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedConfig?.id === config.id 
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10' 
                      : 'border-[var(--border)] hover:bg-[var(--muted)]'
                  }`}
                  onClick={() => setSelectedConfig(config)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">{config.name}</h4>
                      <p className="text-sm text-[var(--text-secondary)]">{config.code}</p>
                    </div>
                    <Badge variant={config.type === 'core' ? 'default' : 'secondary'}>
                      {config.type}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <div className="lg:col-span-2">
          {selectedConfig ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Configure {selectedConfig.name}</span>
                  </div>
                  <Button 
                    onClick={() => handleSaveConfiguration(selectedConfig)}
                    disabled={saving}
                  >
                    {saving ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Subject Name</Label>
                    <Input
                      id="name"
                      value={selectedConfig.name}
                      onChange={(e) => handleConfigChange('name', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Subject Code</Label>
                    <Input
                      id="code"
                      value={selectedConfig.code}
                      onChange={(e) => handleConfigChange('code', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={selectedConfig.description}
                    onChange={(e) => handleConfigChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Subject Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Subject Type</Label>
                    <Select
                      value={selectedConfig.type}
                      onValueChange={(value) => handleConfigChange('type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="core">Core Subject</SelectItem>
                        <SelectItem value="elective">Elective Subject</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={selectedConfig.isActive}
                      onCheckedChange={(checked) => handleConfigChange('isActive', checked)}
                    />
                    <Label htmlFor="active">Active Subject</Label>
                  </div>
                </div>

                {/* Capacity & Requirements */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxStudents">Max Students</Label>
                    <Input
                      id="maxStudents"
                      type="number"
                      value={selectedConfig.maxStudents}
                      onChange={(e) => handleConfigChange('maxStudents', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minTeachers">Min Teachers</Label>
                    <Input
                      id="minTeachers"
                      type="number"
                      value={selectedConfig.minTeachers}
                      onChange={(e) => handleConfigChange('minTeachers', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hoursPerWeek">Hours/Week</Label>
                    <Input
                      id="hoursPerWeek"
                      type="number"
                      value={selectedConfig.hoursPerWeek}
                      onChange={(e) => handleConfigChange('hoursPerWeek', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assessmentWeight">Assessment Weight</Label>
                    <Input
                      id="assessmentWeight"
                      type="number"
                      value={selectedConfig.assessmentWeight}
                      onChange={(e) => handleConfigChange('assessmentWeight', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                {/* Grade Levels */}
                <div className="space-y-2">
                  <Label>Grade Levels</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(grade => (
                      <Badge
                        key={grade}
                        variant={selectedConfig.gradeLevel.includes(grade) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          const newGradeLevels = selectedConfig.gradeLevel.includes(grade)
                            ? selectedConfig.gradeLevel.filter(g => g !== grade)
                            : [...selectedConfig.gradeLevel, grade]
                          handleConfigChange('gradeLevel', newGradeLevels)
                        }}
                      >
                        {grade}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Prerequisites */}
                <div className="space-y-2">
                  <Label>Prerequisites</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedConfig.prerequisites.map((prereq, index) => (
                      <Badge key={index} variant="secondary">
                        {prereq}
                      </Badge>
                    ))}
                    {selectedConfig.prerequisites.length === 0 && (
                      <p className="text-sm text-[var(--text-muted)]">No prerequisites required</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Settings className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                  Select a Subject to Configure
                </h3>
                <p className="text-[var(--text-secondary)]">
                  Choose a subject from the list to view and modify its configuration settings.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}