/**
 * Competency Progress Component
 * Requirements: 31.2, 31.5
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CompetencyProgress, CompetencyLevel, CompetencyType } from '@/types/competency';
import { BookOpen, Target, Heart, Zap, TrendingUp, Award, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CompetencyProgressProps {
  studentId: string;
  subjectId: string;
  termId: string;
  className?: string;
}

const competencyTypeIcons = {
  [CompetencyType.KNOWLEDGE]: BookOpen,
  [CompetencyType.SKILLS]: Target,
  [CompetencyType.VALUES_ATTITUDES]: Heart,
  [CompetencyType.GENERIC_SKILLS]: Zap,
};

const competencyLevelColors = {
  [CompetencyLevel.EMERGING]: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  [CompetencyLevel.DEVELOPING]: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  [CompetencyLevel.PROFICIENT]: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  [CompetencyLevel.ADVANCED]: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
};

const competencyLevelProgress = {
  [CompetencyLevel.EMERGING]: 25,
  [CompetencyLevel.DEVELOPING]: 50,
  [CompetencyLevel.PROFICIENT]: 75,
  [CompetencyLevel.ADVANCED]: 100,
};

export function CompetencyProgressComponent({
  studentId,
  subjectId,
  termId,
  className = '',
}: CompetencyProgressProps) {
  const [progressData, setProgressData] = useState<CompetencyProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompetencyProgress();
  }, [studentId, subjectId, termId]);

  const fetchCompetencyProgress = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/teacher/competencies/progress?studentId=${studentId}&subjectId=${subjectId}&termId=${termId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch competency progress');
      }

      const data = await response.json();
      setProgressData(data.data || []);
    } catch (error) {
      console.error('Error fetching competency progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to load competency progress',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getCompetencyIcon = (type: CompetencyType) => {
    const Icon = competencyTypeIcons[type];
    return <Icon className="h-5 w-5" />;
  };

  const getLevelIcon = (level: CompetencyLevel) => {
    switch (level) {
      case CompetencyLevel.EMERGING:
        return <AlertCircle className="h-4 w-4" />;
      case CompetencyLevel.DEVELOPING:
        return <TrendingUp className="h-4 w-4" />;
      case CompetencyLevel.PROFICIENT:
        return <Target className="h-4 w-4" />;
      case CompetencyLevel.ADVANCED:
        return <Award className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const groupedProgress = progressData.reduce((acc, progress) => {
    const type = progress.competency?.type || CompetencyType.KNOWLEDGE;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(progress);
    return acc;
  }, {} as Record<CompetencyType, CompetencyProgress[]>);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded mb-3"></div>
          ))}
        </div>
      </div>
    );
  }

  if (progressData.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No competency progress data available</p>
        <p className="text-sm mt-2">Progress will appear as CA entries are linked to competencies</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Competency Progress</h3>
        <Button variant="outline" size="sm" onClick={fetchCompetencyProgress}>
          Refresh
        </Button>
      </div>

      {Object.entries(groupedProgress).map(([type, competencies]) => (
        <Card key={type} className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-base">
              {getCompetencyIcon(type as CompetencyType)}
              <span>{type.replace('_', ' ')}</span>
              <Badge variant="secondary">{competencies.length} competencies</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {competencies.map((progress) => {
              const levelColors = competencyLevelColors[progress.currentLevel];
              const progressValue = competencyLevelProgress[progress.currentLevel];
              
              return (
                <div key={progress.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">
                          {progress.competency?.code} - {progress.competency?.title}
                        </span>
                        <Badge className={`${levelColors.bg} ${levelColors.text} ${levelColors.border}`}>
                          {getLevelIcon(progress.currentLevel)}
                          <span className="ml-1">{progress.currentLevel}</span>
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        {progress.competency?.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Mastery Level</span>
                      <span className="font-medium">{progress.masteryPercentage}%</span>
                    </div>
                    <Progress 
                      value={progress.masteryPercentage} 
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-blue-600">{progress.evidenceCount}</div>
                      <div className="text-gray-500">Evidence</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-green-600">{progress.averageScore}%</div>
                      <div className="text-gray-500">Avg Score</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-purple-600">
                        {progress.lastAssessedAt 
                          ? new Date(progress.lastAssessedAt).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                      <div className="text-gray-500">Last Assessed</div>
                    </div>
                  </div>

                  {progress.teacherComment && (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <div className="text-xs font-medium text-gray-700 mb-1">Teacher Comment:</div>
                      <div className="text-sm text-gray-600">{progress.teacherComment}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 mb-3">
            <Target className="h-5 w-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">Progress Summary</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {Object.entries(groupedProgress).map(([type, competencies]) => {
              const avgMastery = competencies.reduce((sum, comp) => sum + comp.masteryPercentage, 0) / competencies.length;
              return (
                <div key={type} className="text-center">
                  <div className="font-medium text-blue-700">{Math.round(avgMastery)}%</div>
                  <div className="text-blue-600">{type.replace('_', ' ')}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}