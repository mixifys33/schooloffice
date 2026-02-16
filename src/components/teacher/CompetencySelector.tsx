/**
 * Competency Selector Component
 * Requirements: 31.1, 31.4
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Competency, CompetencyType, CompetencyLevel } from '@/types/competency';
import { Link, Unlink, Plus, BookOpen, Target, Heart, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CompetencySelectorProps {
  subjectId: string;
  classId: string;
  caEntryId?: string;
  linkedCompetencies?: string[];
  onCompetencyLinked?: (competencyId: string, evidenceType: string, weight?: number, comment?: string) => void;
  onCompetencyUnlinked?: (competencyId: string) => void;
  readOnly?: boolean;
}

const competencyTypeIcons = {
  [CompetencyType.KNOWLEDGE]: BookOpen,
  [CompetencyType.SKILLS]: Target,
  [CompetencyType.VALUES_ATTITUDES]: Heart,
  [CompetencyType.GENERIC_SKILLS]: Zap,
};

const competencyTypeColors = {
  [CompetencyType.KNOWLEDGE]: 'bg-blue-100 text-blue-800 border-blue-200',
  [CompetencyType.SKILLS]: 'bg-green-100 text-green-800 border-green-200',
  [CompetencyType.VALUES_ATTITUDES]: 'bg-purple-100 text-purple-800 border-purple-200',
  [CompetencyType.GENERIC_SKILLS]: 'bg-orange-100 text-orange-800 border-orange-200',
};

const competencyLevelColors = {
  [CompetencyLevel.EMERGING]: 'bg-red-100 text-red-800',
  [CompetencyLevel.DEVELOPING]: 'bg-yellow-100 text-yellow-800',
  [CompetencyLevel.PROFICIENT]: 'bg-blue-100 text-blue-800',
  [CompetencyLevel.ADVANCED]: 'bg-green-100 text-green-800',
};

export function CompetencySelector({
  subjectId,
  classId,
  caEntryId,
  linkedCompetencies = [],
  onCompetencyLinked,
  onCompetencyUnlinked,
  readOnly = false,
}: CompetencySelectorProps) {
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState<Competency | null>(null);
  const [evidenceType, setEvidenceType] = useState('');
  const [weight, setWeight] = useState<number>(1.0);
  const [comment, setComment] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchCompetencies();
  }, [subjectId, classId]);

  const fetchCompetencies = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/teacher/competencies?subjectId=${subjectId}&classId=${classId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch competencies');
      }

      const data = await response.json();
      setCompetencies(data.data || []);
    } catch (error) {
      console.error('Error fetching competencies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load competencies',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkCompetency = async () => {
    if (!selectedCompetency || !caEntryId || !evidenceType) {
      toast({
        title: 'Error',
        description: 'Please select a competency and provide evidence type',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/teacher/competencies/link-ca', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          caEntryId,
          competencyId: selectedCompetency.id,
          evidenceType,
          weight,
          teacherComment: comment || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to link competency');
      }

      toast({
        title: 'Success',
        description: 'Competency linked successfully',
      });

      onCompetencyLinked?.(selectedCompetency.id, evidenceType, weight, comment);
      setLinkDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error linking competency:', error);
      toast({
        title: 'Error',
        description: 'Failed to link competency',
        variant: 'destructive',
      });
    }
  };

  const handleUnlinkCompetency = (competencyId: string) => {
    onCompetencyUnlinked?.(competencyId);
    toast({
      title: 'Success',
      description: 'Competency unlinked successfully',
    });
  };

  const resetForm = () => {
    setSelectedCompetency(null);
    setEvidenceType('');
    setWeight(1.0);
    setComment('');
  };

  const getCompetencyIcon = (type: CompetencyType) => {
    const Icon = competencyTypeIcons[type];
    return <Icon className="h-4 w-4" />;
  };

  const linkedCompetencyObjects = competencies.filter(comp => 
    linkedCompetencies.includes(comp.id)
  );

  const availableCompetencies = competencies.filter(comp => 
    !linkedCompetencies.includes(comp.id)
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Linked Competencies</Label>
        {!readOnly && caEntryId && (
          <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Link className="h-4 w-4 mr-2" />
                Link Competency
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Link CA Entry to Competency</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="competency">Select Competency</Label>
                  <Select
                    value={selectedCompetency?.id || ''}
                    onValueChange={(value) => {
                      const comp = availableCompetencies.find(c => c.id === value);
                      setSelectedCompetency(comp || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a competency..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCompetencies.map((competency) => (
                        <SelectItem key={competency.id} value={competency.id}>
                          <div className="flex items-center space-x-2">
                            {getCompetencyIcon(competency.type)}
                            <span>{competency.code} - {competency.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCompetency && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={competencyTypeColors[selectedCompetency.type]}>
                          {getCompetencyIcon(selectedCompetency.type)}
                          <span className="ml-1">{selectedCompetency.type}</span>
                        </Badge>
                        <Badge className={competencyLevelColors[selectedCompetency.level]}>
                          {selectedCompetency.level}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{selectedCompetency.description}</p>
                    </CardContent>
                  </Card>
                )}

                <div>
                  <Label htmlFor="evidenceType">Evidence Type</Label>
                  <Input
                    id="evidenceType"
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    placeholder="e.g., Problem-solving demonstration, Knowledge application"
                  />
                </div>

                <div>
                  <Label htmlFor="weight">Weight (1.0 = normal, 2.0 = double importance)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(parseFloat(e.target.value) || 1.0)}
                  />
                </div>

                <div>
                  <Label htmlFor="comment">Teacher Comment (Optional)</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Additional notes about how this assessment demonstrates the competency..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleLinkCompetency}>
                    Link Competency
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {linkedCompetencyObjects.length > 0 ? (
        <div className="space-y-2">
          {linkedCompetencyObjects.map((competency) => (
            <Card key={competency.id} className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={competencyTypeColors[competency.type]}>
                        {getCompetencyIcon(competency.type)}
                        <span className="ml-1">{competency.type}</span>
                      </Badge>
                      <Badge className={competencyLevelColors[competency.level]}>
                        {competency.level}
                      </Badge>
                      <span className="font-medium">{competency.code}</span>
                    </div>
                    <h4 className="font-medium">{competency.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{competency.description}</p>
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkCompetency(competency.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No competencies linked to this assessment</p>
          {!readOnly && caEntryId && (
            <p className="text-sm mt-2">Click "Link Competency" to connect this assessment to curriculum competencies</p>
          )}
        </div>
      )}
    </div>
  );
}