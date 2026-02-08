'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Shield, 
  AlertTriangle, 
  UserCheck, 
  Clock, 
  Flag, 
  Activity,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  FileText,
  Plus,
  Edit,
  Trash2,
  Eye,
  Target,
  TrendingUp,
  BookOpen
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDoSContext } from '@/components/dos/dos-context-provider';

interface SubjectIntervention {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  type: 'TEACHER_REASSIGNMENT' | 'WORKLOAD_ADJUSTMENT' | 'ACADEMIC_REVIEW' | 'RECOVERY_PLAN' | 'PERFORMANCE_MONITORING';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  reason: string;
  targetOutcome: string;
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  dueDate?: string;
  completedAt?: string;
  progress: number;
  actions: {
    id: string;
    description: string;
    completed: boolean;
    completedAt?: string;
    completedBy?: string;
  }[];
  metrics: {
    beforeIntervention: {
      averagePerformance: number;
      syllabusCoverage: number;
      teacherStability: string;
    };
    afterIntervention?: {
      averagePerformance: number;
      syllabusCoverage: number;
      teacherStability: string;
    };
  };
  notes: {
    id: string;
    content: string;
    createdBy: string;
    createdByName: string;
    createdAt: string;
  }[];
}

interface InterventionFormData {
  subjectId: string;
  type: string;
  priority: string;
  title: string;
  description: string;
  reason: string;
  targetOutcome: string;
  assignedTo?: string;
  dueDate?: string;
  actions: string[];
}

export default function SubjectInterventionsPage() {
  const { data: session } = useSession();
  const { currentTerm, academicYear } = useDoSContext();
  const [interventions, setInterventions] = useState<SubjectIntervention[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<SubjectIntervention | null>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [filterPriority, setFilterPriority] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('ALL');
  const [formData, setFormData] = useState<InterventionFormData>({
    subjectId: '',
    type: 'ACADEMIC_REVIEW',
    priority: 'MEDIUM',
    title: '',
    description: '',
    reason: '',
    targetOutcome: '',
    assignedTo: '',
    dueDate: '',
    actions: ['']
  });

  useEffect(() => {
    if (session?.user?.schoolId && currentTerm) {
      fetchData();
    }
  }, [session, currentTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [interventionsRes, subjectsRes, staffRes] = await Promise.all([
        fetch(`/api/dos/subjects/interventions?termId=${currentTerm?.id}`),
        fetch(`/api/dos/subjects/overview?termId=${currentTerm?.id}`),
        fetch(`/api/staff?role=TEACHER,DOS`)
      ]);

      if (interventionsRes.ok) {
        const interventionsData = await interventionsRes.json();
        setInterventions(interventionsData);
      }

      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json();
        setSubjects(subjectsData);
      }

      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaff(staffData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingIntervention 
        ? `/api/dos/subjects/interventions/${editingIntervention.id}`
        : `/api/dos/subjects/interventions`;
      
      const method = editingIntervention ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, termId: currentTerm?.id })
      });

      if (response.ok) {
        await fetchData();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving intervention:', error);
    }
  };

  const handleStatusUpdate = async (interventionId: string, status: string) => {
    try {
      const response = await fetch(`/api/dos/subjects/interventions/${interventionId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      subjectId: '',
      type: 'ACADEMIC_REVIEW',
      priority: 'MEDIUM',
      title: '',
      description: '',
      reason: '',
      targetOutcome: '',
      assignedTo: '',
      dueDate: '',
      actions: ['']
    });
    setEditingIntervention(null);
    setShowForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-[var(--warning-light)] text-[var(--warning-dark)] border-amber-200';
      case 'IN_PROGRESS': return 'bg-[var(--info-light)] text-[var(--info-dark)] border-[var(--info-light)]';
      case 'COMPLETED': return 'bg-[var(--success-light)] text-[var(--success-dark)] border-[var(--success-light)]';
      case 'CANCELLED': return 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)]';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-[var(--danger-light)] text-[var(--danger-dark)] border-[var(--danger-light)]';
      case 'HIGH': return 'bg-[var(--warning-light)] text-[var(--warning-dark)] border-[var(--warning-light)]';
      case 'MEDIUM': return 'bg-[var(--warning-light)] text-[var(--warning-dark)] border-[var(--warning-light)]';
      case 'LOW': return 'bg-[var(--success-light)] text-[var(--success-dark)] border-[var(--success-light)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)]';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TEACHER_REASSIGNMENT': return <UserCheck className="h-4 w-4" />;
      case 'WORKLOAD_ADJUSTMENT': return <Clock className="h-4 w-4" />;
      case 'ACADEMIC_REVIEW': return <Flag className="h-4 w-4" />;
      case 'RECOVERY_PLAN': return <Activity className="h-4 w-4" />;
      case 'PERFORMANCE_MONITORING': return <TrendingUp className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const filteredInterventions = interventions.filter(intervention => {
    const matchesStatus = filterStatus === 'ALL' || intervention.status === filterStatus;
    const matchesPriority = filterPriority === 'ALL' || intervention.priority === filterPriority;
    return matchesStatus && matchesPriority;
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--bg-surface)] rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-[var(--bg-surface)] rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-[var(--bg-surface)] rounded"></div>
        </div>
      </div>
    );
  }

  const pendingInterventions = interventions.filter(i => i.status === 'PENDING').length;
  const inProgressInterventions = interventions.filter(i => i.status === 'IN_PROGRESS').length;
  const completedInterventions = interventions.filter(i => i.status === 'COMPLETED').length;
  const criticalInterventions = interventions.filter(i => i.priority === 'CRITICAL').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">DoS Subject Interventions</h1>
          <p className="text-[var(--text-secondary)]">Academic intervention management with tracking and direct DoS powers</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Intervention
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Pending</p>
                <p className="text-2xl font-bold text-[var(--chart-yellow)]">{pendingInterventions}</p>
                <p className="text-xs text-[var(--chart-yellow)] mt-1">Awaiting action</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-[var(--chart-yellow)]" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">In Progress</p>
                <p className="text-2xl font-bold text-[var(--chart-blue)]">{inProgressInterventions}</p>
                <p className="text-xs text-[var(--chart-blue)] mt-1">Active interventions</p>
              </div>
              <Activity className="h-8 w-8 text-[var(--chart-blue)]" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Completed</p>
                <p className="text-2xl font-bold text-[var(--chart-green)]">{completedInterventions}</p>
                <p className="text-xs text-[var(--chart-green)] mt-1">Successfully resolved</p>
              </div>
              <CheckCircle className="h-8 w-8 text-[var(--chart-green)]" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Critical</p>
                <p className="text-2xl font-bold text-[var(--chart-red)]">{criticalInterventions}</p>
                <p className="text-xs text-[var(--chart-red)] mt-1">Urgent attention</p>
              </div>
              <XCircle className="h-8 w-8 text-[var(--chart-red)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)]"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Priority</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as any)}
                  className="px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)]"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>
            
            <div className="text-sm text-[var(--text-secondary)]">
              {filteredInterventions.length} intervention{filteredInterventions.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interventions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Active Interventions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-[var(--border-default)]">
                  <th className="text-left py-4 px-4 font-semibold text-[var(--text-primary)]">Intervention</th>
                  <th className="text-left py-4 px-4 font-semibold text-[var(--text-primary)]">Subject</th>
                  <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Type</th>
                  <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Priority</th>
                  <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Status</th>
                  <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Progress</th>
                  <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Assigned To</th>
                  <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Due Date</th>
                  <th className="text-center py-4 px-4 font-semibold text-[var(--text-primary)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInterventions.map((intervention) => (
                  <tr 
                    key={intervention.id} 
                    className="border-b border-[var(--border-default)] hover:bg-[var(--bg-surface)] cursor-pointer"
                    onClick={() => setSelectedIntervention(selectedIntervention === intervention.id ? null : intervention.id)}
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">{intervention.title}</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{intervention.description}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          Created by {intervention.createdByName} on {new Date(intervention.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-4 w-4 text-[var(--text-muted)]" />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{intervention.subjectName}</p>
                          <p className="text-sm text-[var(--text-muted)]">{intervention.subjectCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {getTypeIcon(intervention.type)}
                        <span className="text-sm font-medium">
                          {intervention.type.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge className={`${getPriorityColor(intervention.priority)} border font-semibold`}>
                        {intervention.priority}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <Badge className={`${getStatusColor(intervention.status)} border font-semibold`}>
                        {intervention.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-16 bg-[var(--bg-surface)] rounded-full h-2">
                          <div 
                            className="h-2 bg-[var(--accent-primary)] rounded-full"
                            style={{ width: `${intervention.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{intervention.progress}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      {intervention.assignedToName ? (
                        <div className="flex items-center justify-center space-x-1">
                          <Users className="h-4 w-4 text-[var(--text-muted)]" />
                          <span className="text-sm">{intervention.assignedToName}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {intervention.dueDate ? (
                        <div className="flex items-center justify-center space-x-1">
                          <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                          <span className="text-sm">
                            {new Date(intervention.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">No due date</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        {intervention.status === 'PENDING' && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(intervention.id, 'IN_PROGRESS');
                            }}
                          >
                            <CheckCircle className="h-4 w-4 text-[var(--chart-green)]" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Intervention Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-[var(--text-primary)] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-main)] rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingIntervention ? 'Edit Intervention' : 'Create New Intervention'}
              </h2>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Subject *
                  </label>
                  <select
                    required
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)]"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Intervention Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)]"
                  >
                    <option value="TEACHER_REASSIGNMENT">Teacher Reassignment</option>
                    <option value="WORKLOAD_ADJUSTMENT">Workload Adjustment</option>
                    <option value="ACADEMIC_REVIEW">Academic Review</option>
                    <option value="RECOVERY_PLAN">Recovery Plan</option>
                    <option value="PERFORMANCE_MONITORING">Performance Monitoring</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Priority *
                  </label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Assign To
                  </label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)]"
                  >
                    <option value="">Select Staff Member</option>
                    {staff.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName} ({member.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)]"
                    placeholder="Brief title for the intervention"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)]"
                  placeholder="Detailed description of the intervention"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Reason for Intervention *
                </label>
                <textarea
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)]"
                  placeholder="Why is this intervention necessary?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Target Outcome *
                </label>
                <textarea
                  required
                  value={formData.targetOutcome}
                  onChange={(e) => setFormData({ ...formData, targetOutcome: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)]"
                  placeholder="What outcome do you expect from this intervention?"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingIntervention ? 'Update Intervention' : 'Create Intervention'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}