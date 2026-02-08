'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TimetableDraft, 
  TimetableAnalytics,
  TeacherWorkloadAnalysis
} from '@/types/timetable';

interface TimetableAnalyticsProps {
  timetable: TimetableDraft;
  analytics: TimetableAnalytics;
}

export function TimetableAnalytics({ 
  timetable, 
  analytics 
}: TimetableAnalyticsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workloadAnalysis, setWorkloadAnalysis] = useState<TeacherWorkloadAnalysis[]>([]);

  useEffect(() => {
    if (analytics) {
      // Process teacher workload data from analytics
      const processedWorkload = Object.entries(analytics.teacherWorkloadStats).map(([teacherId, stats]) => ({
        teacherId,
        teacherName: `Teacher ${teacherId.substring(0, 8)}...`, // In real app, would fetch actual name
        totalPeriods: stats.periodsPerWeek,
        maxPeriodsPerDay: stats.maxPeriodsPerDay,
        averagePeriodsPerDay: Math.round(stats.periodsPerWeek / 5), // Assuming 5-day week
        freePeriods: 0, // Would calculate from actual schedule
        overloadDays: [], // Would identify from actual schedule
        workloadScore: stats.utilization,
        workloadRating: stats.utilization > 90 ? 'OVERLOADED' : 
                       stats.utilization > 70 ? 'NORMAL' : 
                       stats.utilization < 40 ? 'UNDERLOADED' : 'NORMAL'
      }));
      
      setWorkloadAnalysis(processedWorkload);
    }
  }, [analytics]);

  const getStatusColor = (rating: string) => {
    switch (rating) {
      case 'OVERLOADED': return 'bg-[var(--danger-light)] text-[var(--danger-dark)]';
      case 'UNDERLOADED': return 'bg-[var(--warning-light)] text-[var(--warning-dark)]';
      case 'NORMAL': return 'bg-[var(--success-light)] text-[var(--success-dark)]';
      default: return 'bg-[var(--info-light)] text-[var(--info-dark)]';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 85) return 'text-[var(--success)]';
    if (score >= 70) return 'text-[var(--warning)]';
    return 'text-[var(--danger)]';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Timetable Analytics</h3>
        <Badge variant="outline">
          Updated: {new Date(analytics.calculatedAt).toLocaleDateString()}
        </Badge>
      </div>

      {error && (
        <div className="bg-[var(--danger-light)] border border-[var(--danger-light)] rounded-lg p-4">
          <h4 className="font-medium text-[var(--danger-dark)] mb-2">Error Loading Analytics</h4>
          <p className="text-sm text-[var(--chart-red)]">{error}</p>
        </div>
      )}

      {/* Quality Metrics */}
      <Card className="p-6">
        <h4 className="text-lg font-medium mb-4">Quality Metrics</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--bg-surface)] p-4 rounded-lg">
            <div className="text-sm text-[var(--text-secondary)]">Overall Quality</div>
            <div className={`text-2xl font-bold ${getQualityColor(analytics.qualityScore)}`}>
              {analytics.qualityScore.toFixed(1)}%
            </div>
          </div>
          
          <div className="bg-[var(--bg-surface)] p-4 rounded-lg">
            <div className="text-sm text-[var(--text-secondary)]">Constraint Violations</div>
            <div className={`text-2xl font-bold ${analytics.constraintViolations > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
              {analytics.constraintViolations}
            </div>
          </div>
          
          <div className="bg-[var(--bg-surface)] p-4 rounded-lg">
            <div className="text-sm text-[var(--text-secondary)]">Soft Constraint Score</div>
            <div className={`text-2xl font-bold ${getQualityColor(analytics.softConstraintScore)}`}>
              {analytics.softConstraintScore.toFixed(1)}%
            </div>
          </div>
          
          <div className="bg-[var(--bg-surface)] p-4 rounded-lg">
            <div className="text-sm text-[var(--text-secondary)]">Teacher Load Balance</div>
            <div className={`text-2xl font-bold ${getQualityColor(analytics.teacherLoadBalance)}`}>
              {analytics.teacherLoadBalance.toFixed(1)}
            </div>
          </div>
        </div>
      </Card>

      {/* Teacher Workload Analysis */}
      <Card className="p-6">
        <h4 className="text-lg font-medium mb-4">Teacher Workload Analysis</h4>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="py-2 px-4 text-left">Teacher</th>
                <th className="py-2 px-4 text-left">Total Periods</th>
                <th className="py-2 px-4 text-left">Avg/Day</th>
                <th className="py-2 px-4 text-left">Max/Day</th>
                <th className="py-2 px-4 text-left">Utilization</th>
                <th className="py-2 px-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {workloadAnalysis.map((teacher, index) => (
                <tr key={index} className="border-b border-[var(--border)]">
                  <td className="py-2 px-4">{teacher.teacherName}</td>
                  <td className="py-2 px-4">{teacher.totalPeriods}</td>
                  <td className="py-2 px-4">{teacher.averagePeriodsPerDay}</td>
                  <td className="py-2 px-4">{teacher.maxPeriodsPerDay}</td>
                  <td className="py-2 px-4">{teacher.workloadScore.toFixed(1)}%</td>
                  <td className="py-2 px-4">
                    <Badge className={getStatusColor(teacher.workloadRating)}>
                      {teacher.workloadRating}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Subject Distribution */}
      <Card className="p-6">
        <h4 className="text-lg font-medium mb-4">Subject Distribution</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(analytics.subjectDistribution).map(([subjectId, dist], index) => (
            <div key={index} className="bg-[var(--bg-surface)] p-4 rounded-lg">
              <div className="font-medium">Subject {subjectId.substring(0, 8)}...</div>
              <div className="text-sm text-[var(--text-secondary)]">
                {dist.totalPeriods} periods • {dist.classCount} classes • {dist.teacherCount} teachers
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Time Utilization */}
      <Card className="p-6">
        <h4 className="text-lg font-medium mb-4">Time Utilization</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium mb-2">Morning Slot Usage</h5>
            <div className="w-full bg-[var(--bg-surface)] rounded-full h-4">
              <div 
                className="bg-[var(--primary)] h-4 rounded-full" 
                style={{ width: `${analytics.morningSlotUsage}%` }}
              ></div>
            </div>
            <div className="text-right text-sm text-[var(--text-secondary)] mt-1">
              {analytics.morningSlotUsage.toFixed(1)}%
            </div>
          </div>
          
          <div>
            <h5 className="font-medium mb-2">Afternoon Slot Usage</h5>
            <div className="w-full bg-[var(--bg-surface)] rounded-full h-4">
              <div 
                className="bg-[var(--primary)] h-4 rounded-full" 
                style={{ width: `${analytics.afternoonSlotUsage}%` }}
              ></div>
            </div>
            <div className="text-right text-sm text-[var(--text-secondary)] mt-1">
              {analytics.afternoonSlotUsage.toFixed(1)}%
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}