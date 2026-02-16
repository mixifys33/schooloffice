/**
 * Competency Report Component
 * Requirements: 31.3, 31.6
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CompetencyReport, CompetencyLevel, CompetencyType } from '@/types/competency';
import { BookOpen, Target, Heart, Zap, Download, FileText, Award, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CompetencyReportProps {
  studentId: string;
  subjectId: string;
  termId: string;
  studentName?: string;
  subjectName?: string;
  termName?: string;
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

const competencyLevelDescriptions = {
  [CompetencyLevel.EMERGING]: 'Beginning to show understanding',
  [CompetencyLevel.DEVELOPING]: 'Developing understanding with support',
  [CompetencyLevel.PROFICIENT]: 'Demonstrates competency independently',
  [CompetencyLevel.ADVANCED]: 'Exceeds expectations and shows mastery',
};

export function CompetencyReportComponent({
  studentId,
  subjectId,
  termId,
  studentName = 'Student',
  subjectName = 'Subject',
  termName = 'Term',
  className = '',
}: CompetencyReportProps) {
  const [report, setReport] = useState<CompetencyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompetencyReport();
  }, [studentId, subjectId, termId]);

  const fetchCompetencyReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/teacher/competencies/report?studentId=${studentId}&subjectId=${subjectId}&termId=${termId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch competency report');
      }

      const data = await response.json();
      setReport(data.data);
    } catch (error) {
      console.error('Error fetching competency report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load competency report',
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

  const handleExportReport = () => {
    // TODO: Implement PDF export functionality
    toast({
      title: 'Export Feature',
      description: 'PDF export functionality will be implemented in a future update',
    });
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded mb-4"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No competency report data available</p>
        <p className="text-sm mt-2">Report will be generated once competencies are linked to assessments</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Report Header */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Competency-Based Assessment Report</CardTitle>
              <div className="text-sm text-gray-600 mt-2">
                <p><strong>Student:</strong> {studentName}</p>
                <p><strong>Subject:</strong> {subjectName}</p>
                <p><strong>Term:</strong> {termName}</p>
                <p><strong>Generated:</strong> {new Date(report.generatedAt).toLocaleDateString()}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Overall Mastery Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-blue-600" />
            <span>Overall Mastery Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(report.overallMastery).map(([key, level]) => {
              const type = key.replace('Level', '').replace(/([A-Z])/g, ' $1').trim().toUpperCase();
              const levelColors = competencyLevelColors[level];
              
              return (
                <div key={key} className="text-center">
                  <Badge className={`${levelColors.bg} ${levelColors.text} ${levelColors.border} mb-2`}>
                    {getLevelIcon(level)}
                    <span className="ml-1">{level}</span>
                  </Badge>
                  <div className="text-sm font-medium">{type}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Competency Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Detailed Competency Assessment</h3>
        
        {report.competencies.map((competencyData, index) => {
          const { competency, progress, evidences, masteryLevel, recommendations } = competencyData;
          const levelColors = competencyLevelColors[masteryLevel];
          
          return (
            <Card key={competency.id} className="border-l-4 border-l-gray-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getCompetencyIcon(competency.type)}
                    <div>
                      <h4 className="font-semibold">{competency.code} - {competency.title}</h4>
                      <p className="text-sm text-gray-600">{competency.description}</p>
                    </div>
                  </div>
                  <Badge className={`${levelColors.bg} ${levelColors.text} ${levelColors.border}`}>
                    {getLevelIcon(masteryLevel)}
                    <span className="ml-1">{masteryLevel}</span>
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progress Metrics */}
                {progress && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-blue-600">{evidences.length}</div>
                      <div className="text-gray-500">Evidence Count</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-green-600">{progress.averageScore}%</div>
                      <div className="text-gray-500">Average Score</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-purple-600">{progress.masteryPercentage}%</div>
                      <div className="text-gray-500">Mastery Level</div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Evidence Details */}
                {evidences.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-3">Assessment Evidence</h5>
                    <div className="space-y-2">
                      {evidences.map((evidence, evidenceIndex) => (
                        <div key={evidenceIndex} className="bg-gray-50 p-3 rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{evidence.caEntryName}</span>
                            <Badge variant="secondary">
                              {evidence.score}/{evidence.maxScore} ({Math.round(evidence.percentage)}%)
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600">
                            {new Date(evidence.date).toLocaleDateString()}
                          </div>
                          {evidence.teacherComment && (
                            <div className="text-sm text-gray-700 mt-2 italic">
                              "{evidence.teacherComment}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <div>
                    <h5 className="font-medium mb-3">Recommendations for Growth</h5>
                    <ul className="space-y-1">
                      {recommendations.map((recommendation, recIndex) => (
                        <li key={recIndex} className="text-sm text-gray-700 flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Level Description */}
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="text-sm">
                    <strong>{masteryLevel}:</strong> {competencyLevelDescriptions[masteryLevel]}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Report Footer */}
      <Card className="bg-gray-50">
        <CardContent className="pt-6">
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              <strong>Note:</strong> This competency-based assessment report provides a comprehensive view of student progress 
              across different competency areas. The assessment is based on continuous assessment activities linked to specific 
              curriculum competencies.
            </p>
            <p>
              <strong>Legend:</strong> Emerging (Beginning), Developing (With Support), Proficient (Independent), Advanced (Exceeds Expectations)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}