'use client';

import { useState, useEffect } from 'react';
import { SchoolType } from '@prisma/client';
import { 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Calendar,
  BarChart3,
  Settings,
  Eye,
  Shield,
  Clock,
  Target
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface SubjectHealthMetrics {
  id: string;
  name: string;
  code: string;
  educationLevel: SchoolType;
  isActive: boolean;
  
  // Academic Health Indicators
  healthScore: number; // 0-100
  performanceTrend: 'up' | 'down' | 'stable';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Assignment & Coverage
  totalClasses: number;
  assignedClasses: number;
  totalTeachers: number;
  qualifiedTeachers: number;
  
  // Performance Metrics
  averageScore: number;
  passRate: number;
  attendanceRate: number;
  
  // Recent Activity
  lastAssessment: string | null;
  pendingInterventions: number;
  recentAlerts: number;
  
  // Detailed breakdown
  classBreakdown: Array<{
    className: string;
    teacherName: string;
    studentCount: number;
    averageScore: number;
    attendanceRate: number;
    lastAssessment: string | null;
  }>;
}

interface AcademicContext {
  currentTerm: string;
  academicYear: string;
  termProgress: number; // 0-100
  daysRemaining: number;
}

export default function DoSSubjectsOverview() {
  const [subjects, setSubjects] = useState<SubjectHealthMetrics[]>([]);
  const [academicContext, setAcademicContext] = useState<AcademicContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<'all' | SchoolType>('all');
  const [filterRisk, setFilterRisk] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  useEffect(() => {
    loadSubjectData();
    loadAcademicContext();
  }, []);

  const loadSubjectData = async () => {
    try {
      const response = await fetch('/api/dos/subjects/health-overview');
      if (!response.ok) {
        throw new Error('Failed to load subject health data');
      }
      const data = await response.json();
      setSubjects(data.subjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const loadAcademicContext = async () => {
    try {
      const response = await fetch('/api/dos/academic-context');
      if (!response.ok) {
        throw new Error('Failed to load academic context');
      }
      const data = await response.json();
      setAcademicContext(data);
    } catch (err) {
      console.error('Failed to load academic context:', err);
    }
  };

  const filteredSubjects = subjects.filter(subject => {
    if (filterLevel !== 'all' && subject.educationLevel !== filterLevel) return false;
    if (filterRisk !== 'all' && subject.riskLevel !== filterRisk) return false;
    return true;
  });

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-[var(--chart-green)] bg-[var(--success-light)]';
    if (score >= 60) return 'text-[var(--chart-yellow)] bg-[var(--warning-light)]';
    if (score >= 40) return 'text-[var(--chart-yellow)] bg-[var(--warning-light)]';
    return 'text-[var(--chart-red)] bg-[var(--danger-light)]';
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-[var(--success-light)] text-[var(--success-dark)]';
      case 'medium': return 'bg-[var(--warning-light)] text-[var(--warning-dark)]';
      case 'high': return 'bg-[var(--warning-light)] text-[var(--warning-dark)]';
      case 'critical': return 'bg-[var(--danger-light)] text-[var(--danger-dark)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-[var(--chart-green)]" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-[var(--chart-red)]" />;
      default: return <BarChart3 className="h-4 w-4 text-[var(--text-secondary)]" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--bg-surface)] rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-[var(--bg-surface)] rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-[var(--bg-surface)] rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Academic Context Bar */}
      {academicContext && (
        <Card className="p-4 bg-[var(--info-light)] border-[var(--info-light)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div>
                <h3 className="font-semibold text-[var(--info-dark)]">{academicContext.currentTerm}</h3>
                <p className="text-sm text-[var(--accent-hover)]">{academicContext.academicYear}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-[var(--chart-blue)]" />
                <span className="text-sm text-[var(--accent-hover)]">
                  {academicContext.daysRemaining} days remaining
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-[var(--info)] rounded-full h-2">
                <div 
                  className="bg-[var(--chart-blue)] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${academicContext.termProgress}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-[var(--accent-hover)]">
                {academicContext.termProgress}%
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Subject Control Center</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Monitor academic health, performance trends, and manage DoS interventions
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="bg-[var(--chart-blue)] text-[var(--white-pure)] px-4 py-2 rounded-lg hover:bg-[var(--accent-hover)] flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>New Intervention</span>
          </button>
          <button className="bg-[var(--bg-surface)] text-[var(--text-primary)] px-4 py-2 rounded-lg hover:bg-[var(--bg-surface)] flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Total Subjects</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{subjects.length}</p>
            </div>
            <BookOpen className="h-8 w-8 text-[var(--chart-blue)]" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">High Risk</p>
              <p className="text-2xl font-bold text-[var(--chart-red)]">
                {subjects.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical').length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-[var(--chart-red)]" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Avg Health Score</p>
              <p className="text-2xl font-bold text-[var(--chart-green)]">
                {subjects.length > 0 ? Math.round(subjects.reduce((acc, s) => acc + s.healthScore, 0) / subjects.length) : 0}
              </p>
            </div>
            <Target className="h-8 w-8 text-[var(--chart-green)]" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Pending Actions</p>
              <p className="text-2xl font-bold text-[var(--chart-yellow)]">
                {subjects.reduce((acc, s) => acc + s.pendingInterventions, 0)}
              </p>
            </div>
            <Clock className="h-8 w-8 text-[var(--chart-yellow)]" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as any)}
          className="px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
        >
          <option value="all">All Levels</option>
          <option value="PRIMARY">Primary</option>
          <option value="SECONDARY">Secondary</option>
          <option value="BOTH">Both</option>
        </select>
        
        <select
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value as any)}
          className="px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
        >
          <option value="all">All Risk Levels</option>
          <option value="low">Low Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="high">High Risk</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {error && (
        <div className="bg-[var(--danger-light)] border border-[var(--danger-light)] text-[var(--chart-red)] px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Subject Overview Table */}
      <Card>
        <div className="px-6 py-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Subject Health Overview</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-surface)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Health Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Coverage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Alerts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[var(--bg-main)] divide-y divide-gray-200">
              {filteredSubjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-[var(--bg-surface)]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {subject.name}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">({subject.code})</span>
                          <Badge variant="outline" className="text-xs">
                            {subject.educationLevel}
                          </Badge>
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          {subject.assignedClasses}/{subject.totalClasses} classes assigned
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-1 rounded-full text-sm font-medium ${getHealthScoreColor(subject.healthScore)}`}>
                        {subject.healthScore}%
                      </div>
                      {getTrendIcon(subject.performanceTrend)}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`text-xs ${getRiskBadgeColor(subject.riskLevel)}`}>
                      {subject.riskLevel.toUpperCase()}
                    </Badge>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                    <div>
                      <div>{subject.qualifiedTeachers}/{subject.totalTeachers} qualified teachers</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {Math.round((subject.assignedClasses / subject.totalClasses) * 100)}% coverage
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text-primary)]">
                    <div>
                      <div>Avg: {subject.averageScore}%</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        Pass: {subject.passRate}% | Attend: {subject.attendanceRate}%
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {subject.recentAlerts > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {subject.recentAlerts} alerts
                        </Badge>
                      )}
                      {subject.pendingInterventions > 0 && (
                        <Badge className="text-xs bg-[var(--warning-light)] text-[var(--warning-dark)]">
                          {subject.pendingInterventions} pending
                        </Badge>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedSubject(subject.id)}
                        className="text-[var(--chart-blue)] hover:text-[var(--info-dark)] flex items-center space-x-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </button>
                      {(subject.riskLevel === 'high' || subject.riskLevel === 'critical') && (
                        <button className="text-[var(--chart-red)] hover:text-[var(--danger-dark)] flex items-center space-x-1">
                          <Shield className="h-4 w-4" />
                          <span>Intervene</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredSubjects.length === 0 && (
            <div className="px-6 py-8 text-center text-[var(--text-muted)]">
              No subjects match the current filters.
            </div>
          )}
        </div>
      </Card>

      {/* Subject Detail Modal/Panel would go here */}
      {selectedSubject && (
        <SubjectDetailPanel
          subjectId={selectedSubject}
          onClose={() => setSelectedSubject(null)}
        />
      )}
    </div>
  );
}

// Placeholder for detailed subject view
function SubjectDetailPanel({ subjectId, onClose }: { subjectId: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-[var(--text-primary)] bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-main)] rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Subject Details</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            ✕
          </button>
        </div>
        <div className="text-center py-8 text-[var(--text-muted)]">
          Detailed subject analysis and intervention tools will be implemented here.
          <br />
          Subject ID: {subjectId}
        </div>
      </div>
    </div>
  );
}