'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { 
  Settings, 
  Eye, 
  Download, 
  RotateCcw, 
  Save, 
  Plus, 
  Trash2, 
  Move, 
  Image,
  Type,
  Hash,
  List,
  FileText,
  Table,
  PenTool
} from 'lucide-react';
import { ReportCardTemplate, TemplateField, TemplateSection } from '@/services/pdf-generation.service';

interface ReportCardTemplateEditorProps {
  template?: ReportCardTemplate;
  onSave: (template: ReportCardTemplate) => void;
  onPreview: (template: ReportCardTemplate) => void;
  onReset: () => void;
  isLoading?: boolean;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'select', label: 'Select', icon: List },
  { value: 'textarea', label: 'Text Area', icon: FileText },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'table', label: 'Table', icon: Table },
  { value: 'signature', label: 'Signature', icon: PenTool }
];

const SECTION_TYPES = [
  { value: 'header', label: 'Header' },
  { value: 'student_info', label: 'Student Information' },
  { value: 'subjects', label: 'Subject Assessment' },
  { value: 'skills', label: 'Skills & Values' },
  { value: 'remarks', label: 'Remarks' },
  { value: 'promotion', label: 'Promotion Decision' },
  { value: 'validation', label: 'DoS Validation' }
];

const DEFAULT_COMPETENCY_LEVELS = [
  { level: 'Emerging', descriptor: 'Beginning to show understanding', minScore: 0, maxScore: 39, color: 'var(--chart-red)' },
  { level: 'Developing', descriptor: 'Progressing towards expectations', minScore: 40, maxScore: 59, color: 'var(--chart-yellow)' },
  { level: 'Proficient', descriptor: 'Meeting expectations', minScore: 60, maxScore: 79, color: 'var(--chart-green)' },
  { level: 'Advanced', descriptor: 'Exceeding expectations', minScore: 80, maxScore: 100, color: 'var(--chart-blue)' }
];

export default function ReportCardTemplateEditor({
  template,
  onSave,
  onPreview,
  onReset,
  isLoading = false
}: ReportCardTemplateEditorProps) {
  const [currentTemplate, setCurrentTemplate] = useState<ReportCardTemplate | null>(template || null);
  const [activeTab, setActiveTab] = useState('layout');
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [draggedField, setDraggedField] = useState<TemplateField | null>(null);

  useEffect(() => {
    if (template) {
      setCurrentTemplate(template);
    }
  }, [template]);

  const updateTemplate = (updates: Partial<ReportCardTemplate>) => {
    if (!currentTemplate) return;
    setCurrentTemplate({ ...currentTemplate, ...updates });
  };

  const updateLayout = (layoutUpdates: Partial<ReportCardTemplate['layout']>) => {
    if (!currentTemplate) return;
    updateTemplate({
      layout: { ...currentTemplate.layout, ...layoutUpdates }
    });
  };

  const updateSection = (sectionId: string, updates: Partial<TemplateSection>) => {
    if (!currentTemplate) return;
    const updatedSections = currentTemplate.sections.map(section =>
      section.id === sectionId ? { ...section, ...updates } : section
    );
    updateTemplate({ sections: updatedSections });
  };

  const addField = (sectionId: string, field: TemplateField) => {
    if (!currentTemplate) return;
    const updatedSections = currentTemplate.sections.map(section =>
      section.id === sectionId 
        ? { ...section, fields: [...section.fields, field] }
        : section
    );
    updateTemplate({ sections: updatedSections });
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<TemplateField>) => {
    if (!currentTemplate) return;
    const updatedSections = currentTemplate.sections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            fields: section.fields.map(field =>
              field.id === fieldId ? { ...field, ...updates } : field
            )
          }
        : section
    );
    updateTemplate({ sections: updatedSections });
  };

  const removeField = (sectionId: string, fieldId: string) => {
    if (!currentTemplate) return;
    const updatedSections = currentTemplate.sections.map(section =>
      section.id === sectionId
        ? { ...section, fields: section.fields.filter(field => field.id !== fieldId) }
        : section
    );
    updateTemplate({ sections: updatedSections });
  };

  const handleSave = () => {
    if (!currentTemplate) return;
    onSave(currentTemplate);
  };

  const handlePreview = () => {
    if (!currentTemplate) return;
    onPreview(currentTemplate);
  };

  const handleReset = () => {
    onReset();
  };

  const renderLayoutTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Page Layout</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pageSize">Page Size</Label>
            <Select
              value={currentTemplate?.layout.pageSize || 'A4'}
              onValueChange={(value: 'A4' | 'Letter') => updateLayout({ pageSize: value })}
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="orientation">Orientation</Label>
            <Select
              value={currentTemplate?.layout.orientation || 'portrait'}
              onValueChange={(value: 'portrait' | 'landscape') => updateLayout({ orientation: value })}
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Margins (mm)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="marginTop">Top</Label>
            <Input
              type="number"
              value={currentTemplate?.layout.margins.top || 20}
              onChange={(e) => updateLayout({
                margins: { ...currentTemplate!.layout.margins, top: Number(e.target.value) }
              })}
            />
          </div>
          <div>
            <Label htmlFor="marginBottom">Bottom</Label>
            <Input
              type="number"
              value={currentTemplate?.layout.margins.bottom || 20}
              onChange={(e) => updateLayout({
                margins: { ...currentTemplate!.layout.margins, bottom: Number(e.target.value) }
              })}
            />
          </div>
          <div>
            <Label htmlFor="marginLeft">Left</Label>
            <Input
              type="number"
              value={currentTemplate?.layout.margins.left || 20}
              onChange={(e) => updateLayout({
                margins: { ...currentTemplate!.layout.margins, left: Number(e.target.value) }
              })}
            />
          </div>
          <div>
            <Label htmlFor="marginRight">Right</Label>
            <Input
              type="number"
              value={currentTemplate?.layout.margins.right || 20}
              onChange={(e) => updateLayout({
                margins: { ...currentTemplate!.layout.margins, right: Number(e.target.value) }
              })}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Colors</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="primaryColor">Primary Color</Label>
            <Input
              type="color"
              value={currentTemplate?.layout.colors.primary || 'var(--accent-hover)'}
              onChange={(e) => updateLayout({
                colors: { ...currentTemplate!.layout.colors, primary: e.target.value }
              })}
            />
          </div>
          <div>
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <Input
              type="color"
              value={currentTemplate?.layout.colors.secondary || 'var(--text-muted)'}
              onChange={(e) => updateLayout({
                colors: { ...currentTemplate!.layout.colors, secondary: e.target.value }
              })}
            />
          </div>
          <div>
            <Label htmlFor="accentColor">Accent Color</Label>
            <Input
              type="color"
              value={currentTemplate?.layout.colors.accent || 'var(--chart-green)'}
              onChange={(e) => updateLayout({
                colors: { ...currentTemplate!.layout.colors, accent: e.target.value }
              })}
            />
          </div>
          <div>
            <Label htmlFor="textColor">Text Color</Label>
            <Input
              type="color"
              value={currentTemplate?.layout.colors.text || '#0f172a'}
              onChange={(e) => updateLayout({
                colors: { ...currentTemplate!.layout.colors, text: e.target.value }
              })}
            />
          </div>
        </div>
      </Card>
    </div>
  );

  const renderSectionsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Report Card Sections</h3>
        <Button
          onClick={() => setShowFieldDialog(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Section
        </Button>
      </div>

      <div className="grid gap-4">
        {currentTemplate?.sections.map((section) => (
          <Card key={section.id} className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-semibold">{section.name}</h4>
                <Badge variant="outline">{section.type}</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSection(section.id)}
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateSection(section.id, { visible: !section.visible })}
                >
                  <Eye className={`w-4 h-4 ${section.visible ? 'text-[var(--chart-green)]' : 'text-[var(--text-muted)]'}`} />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fields ({section.fields.length})</Label>
              <div className="grid gap-2">
                {section.fields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between p-2 bg-[var(--bg-surface)] rounded">
                    <div className="flex items-center gap-2">
                      {FIELD_TYPES.find(type => type.value === field.type)?.icon && (
                        React.createElement(FIELD_TYPES.find(type => type.value === field.type)!.icon, {
                          className: "w-4 h-4"
                        })
                      )}
                      <span className="text-sm">{field.label}</span>
                      {field.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedField(field.id)}
                      >
                        <Settings className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeField(section.id, field.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedSection(section.id);
                  setShowFieldDialog(true);
                }}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderCompetencyTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Competency Levels</h3>
        <div className="space-y-4">
          {DEFAULT_COMPETENCY_LEVELS.map((level, index) => (
            <div key={level.level} className="flex items-center gap-4 p-4 border rounded">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: level.color }}></div>
              <div className="flex-1">
                <div className="font-medium">{level.level}</div>
                <div className="text-sm text-[var(--text-secondary)]">{level.descriptor}</div>
              </div>
              <div className="text-sm text-[var(--text-muted)]">
                {level.minScore} - {level.maxScore}%
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Grading Scale</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Continuous Assessment Weight</Label>
            <Input
              type="number"
              value={20}
              disabled
              className="bg-[var(--bg-surface)]"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Fixed at 20% per new curriculum</p>
          </div>
          <div>
            <Label>Examination Weight</Label>
            <Input
              type="number"
              value={80}
              disabled
              className="bg-[var(--bg-surface)]"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Fixed at 80% per new curriculum</p>
          </div>
          <div>
            <Label>Final Score</Label>
            <Input
              type="number"
              value={100}
              disabled
              className="bg-[var(--bg-surface)]"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Total out of 100</p>
          </div>
        </div>
      </Card>
    </div>
  );

  if (!currentTemplate) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-[var(--text-muted)] mb-4">No template loaded</p>
          <Button onClick={onReset}>Load Default Template</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Report Card Template Editor</h2>
          <p className="text-[var(--text-secondary)]">Customize your new curriculum report card template</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      {/* Template Info */}
      <Card className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="templateName">Template Name</Label>
            <Input
              value={currentTemplate.name}
              onChange={(e) => updateTemplate({ name: e.target.value })}
              placeholder="Enter template name"
            />
          </div>
          <div>
            <Label htmlFor="templateDescription">Description</Label>
            <Input
              value={currentTemplate.description || ''}
              onChange={(e) => updateTemplate({ description: e.target.value })}
              placeholder="Enter template description"
            />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('layout')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'layout'
                  ? 'border-[var(--accent-primary)] text-[var(--chart-blue)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Layout & Design
            </button>
            <button
              onClick={() => setActiveTab('sections')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sections'
                  ? 'border-[var(--accent-primary)] text-[var(--chart-blue)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Sections & Fields
            </button>
            <button
              onClick={() => setActiveTab('competency')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'competency'
                  ? 'border-[var(--accent-primary)] text-[var(--chart-blue)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Competency Levels
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'layout' && renderLayoutTab()}
          {activeTab === 'sections' && renderSectionsTab()}
          {activeTab === 'competency' && renderCompetencyTab()}
        </div>
      </Tabs>
    </div>
  );
}