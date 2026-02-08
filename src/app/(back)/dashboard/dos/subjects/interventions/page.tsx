'use client';

import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Clock, CheckCircle, Plus, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Intervention {
  id: string;
  subjectName: string;
  subjectCode: string;
  type: 'academic' | 'staffing' | 'resource' | 'behavioral';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  title: string;
  description: string;
  assignedTo: string;
  createdDate: string;
  dueDate: string;
  progress: number;
}

export default function SubjectInterventionsPage() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'active' | 'completed'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  useEffect(() => {
    loadInterventions();
  }, []);

  const loadInterventions = async () => {
    try {
      // Mock data - in real implementation, this would fetch from API
      const mockInterventions: Intervention[] = [
        {
          id: '1',
          subjectName: 'Mathematics',
          subjectCode: 'MTH',
          type: 'academic',
          priority: 'high',
          status: 'active',
          title: 'Improve Grade 5 Math Performance',
          description: 'Grade 5 math scores have dropped below 60%. Implement additional practice sessions and peer tutoring.',
          assignedTo: 'John Doe (Math HOD)',
          createdDate: '2024-01-15',
          dueDate: '2024-02-15',
          progress: 65
        },
        {
          id: '2',
          subjectName: 'English',
          subjectCode: 'ENG',
          type: 'staffing',
          priority: 'critical',
          status: 'pending',
          title: 'Replace Absent Teacher',
          description: 'Grade 3 English teacher on extended leave. Need immediate replacement to avoid curriculum gaps.',
          assignedTo: 'HR Department',
          createdDate: '2024-01-20',
          dueDate: '2024-01-25',
          progress: 0
        },
        {
          id: '3',
          subjectName: 'Science',
          subjectCode: 'SCI',
          type: 'resource',
          priority: 'medium',
          status: 'completed',
          title: 'Laboratory Equipment Upgrade',
          description: 'Outdated lab equipment affecting practical sessions. Procure new microscopes and chemicals.',
          assignedTo: 'Science Department',
          createdDate: '2024-01-10',
          dueDate: '2024-01-30',
          progress: 100
        }
      ];

      setInterventions(mockInterventions);
    } catch (error) {
      console.error('Failed to load interventions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInterventions = interventions.filter(intervention => {
    if (filterStatus !== 'all' && intervention.status !== filterStatus) return false;
    if (filterPriority !== 'all' && intervention.priority !== filterPriority) return false;
    return true;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-[var(--warning-light)] text-[var(--warning-dark)]';
      case 'active': return 'bg-[var(--info-light)] text-[var(--info-dark)]';
      case 'completed': return 'bg-[var(--success-light)] text-[var(--success-dark)]';
      case 'cancelled': return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-[var(--success-light)] text-[var(--success-dark)]';
      case 'medium': return 'bg-[var(--warning-light)] text-[var(--warning-dark)]';
      case 'high': return 'bg-[var(--warning-light)] text-[var(--warning-dark)]';
      case 'critical': return 'bg-[var(--danger-light)] text-[var(--danger-dark)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'academic': return <Shield className="h-4 w-4" />;
      case 'staffing': return <Shield className="h-4 w-4" />;
      case 'resource': return <Shield className="h-4 w-4" />;
      case 'behavioral': return <Shield className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-[var(--bg-surface)] rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">DoS Interventions</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Manage academic interventions and corrective actions for subject performance
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-[var(--chart-blue)] text-[var(--white-pure)] px-4 py-2 rounded-lg hover:bg-[var(--accent-hover)] flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Intervention</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Total Active</p>
              <p className="text-2xl font-bold text-[var(--chart-blue)]">
                {interventions.filter(i => i.status === 'active').length}
              </p>
            </div>
            <Shield className="h-8 w-8 text-[var(--chart-blue)]" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Critical Priority</p>
              <p className="text-2xl font-bold text-[var(--chart-red)]">
                {interventions.filter(i => i.priority === 'critical').length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-[var(--chart-red)]" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Pending</p>
              <p className="text-2xl font-bold text-[var(--chart-yellow)]">
                {interventions.filter(i => i.status === 'pending').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-[var(--chart-yellow)]" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Completed</p>
              <p className="text-2xl font-bold text-[var(--chart-green)]">
                {interventions.filter(i => i.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-[var(--chart-green)]" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
        
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as any)}
          className="px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Interventions List */}
      <Card>
        <div className="px-6 py-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Active Interventions</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {filteredInterventions.map((intervention) => (
            <div key={intervention.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getTypeIcon(intervention.type)}
                    <h3 className="text-lg font-medium text-[var(--text-primary)]">
                      {intervention.title}
                    </h3>
                    <Badge className={`text-xs ${getStatusBadgeColor(intervention.status)}`}>
                      {intervention.status.toUpperCase()}
                    </Badge>
                    <Badge className={`text-xs ${getPriorityBadgeColor(intervention.priority)}`}>
                      {intervention.priority.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-[var(--text-secondary)] mb-3">
                    <span>{intervention.subjectName} ({intervention.subjectCode})</span>
                    <span>•</span>
                    <span>Assigned to: {intervention.assignedTo}</span>
                    <span>•</span>
                    <span>Due: {new Date(intervention.dueDate).toLocaleDateString()}</span>
                  </div>
                  
                  <p className="text-[var(--text-primary)] mb-3">{intervention.description}</p>
                  
                  {intervention.status === 'active' && (
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-[var(--bg-surface)] rounded-full h-2">
                        <div 
                          className="bg-[var(--chart-blue)] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${intervention.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-[var(--text-secondary)]">{intervention.progress}%</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button className="text-[var(--chart-blue)] hover:text-[var(--info-dark)] flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredInterventions.length === 0 && (
            <div className="px-6 py-8 text-center text-[var(--text-muted)]">
              No interventions match the current filters.
            </div>
          )}
        </div>
      </Card>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-[var(--text-primary)] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-main)] rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Create New Intervention</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>
            <div className="text-center py-8 text-[var(--text-muted)]">
              Intervention creation form will be implemented here.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}