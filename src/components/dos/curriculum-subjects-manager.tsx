'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface CurriculumSubject {
  id: string;
  subjectName: string;
  subjectCode: string;
  class: {
    name: string;
    level: number;
  };
  isCore: boolean;
  periodsPerWeek: number;
  practicalPeriods: number;
  dosApproved: boolean;
  dosApprovedAt?: string;
  createdAt: string;
}

interface CurriculumSubjectsManagerProps {
  curriculumSubjects: CurriculumSubject[];
  schoolId: string;
  userId: string;
}

export function CurriculumSubjectsManager({ 
  curriculumSubjects, 
  schoolId, 
  userId 
}: CurriculumSubjectsManagerProps) {
  const [subjects, setSubjects] = useState(curriculumSubjects);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [loading, setLoading] = useState(false);

  // Get unique classes for filter
  const classes = Array.from(new Set(subjects.map(s => s.class.name))).sort();

  // Filter subjects
  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.subjectCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = selectedClass === 'all' || subject.class.name === selectedClass;
    const matchesFilter = filter === 'all' || 
                         (filter === 'approved' && subject.dosApproved) ||
                         (filter === 'pending' && !subject.dosApproved) ||
                         (filter === 'core' && subject.isCore);
    
    return matchesSearch && matchesClass && matchesFilter;
  });

  const handleApproveSubject = async (subjectId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dos/curriculum/subjects/${subjectId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schoolId, userId }),
      });

      if (response.ok) {
        setSubjects(prev => prev.map(subject => 
          subject.id === subjectId 
            ? { ...subject, dosApproved: true, dosApprovedAt: new Date().toISOString() }
            : subject
        ));
      } else {
        throw new Error('Failed to approve subject');
      }
    } catch (error) {
      console.error('Error approving subject:', error);
      alert('Failed to approve subject. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    const pendingSubjects = filteredSubjects.filter(s => !s.dosApproved);
    if (pendingSubjects.length === 0) return;

    if (!confirm(`Approve ${pendingSubjects.length} subjects?`)) return;

    setLoading(true);
    try {
      const response = await fetch('/api/dos/curriculum/subjects/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          subjectIds: pendingSubjects.map(s => s.id),
          schoolId, 
          userId 
        }),
      });

      if (response.ok) {
        setSubjects(prev => prev.map(subject => 
          pendingSubjects.some(ps => ps.id === subject.id)
            ? { ...subject, dosApproved: true, dosApprovedAt: new Date().toISOString() }
            : subject
        ));
      } else {
        throw new Error('Failed to bulk approve subjects');
      }
    } catch (error) {
      console.error('Error bulk approving subjects:', error);
      alert('Failed to bulk approve subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <Input
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <option value="all">All Classes</option>
              {classes.map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </Select>

            <Select value={filter} onValueChange={setFilter}>
              <option value="all">All Subjects</option>
              <option value="approved">DoS Approved</option>
              <option value="pending">Pending Approval</option>
              <option value="core">Core Subjects</option>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleBulkApprove}
              disabled={loading || filteredSubjects.filter(s => !s.dosApproved).length === 0}
              className="bg-[var(--chart-green)] hover:bg-[var(--chart-green)]"
            >
              Bulk Approve ({filteredSubjects.filter(s => !s.dosApproved).length})
            </Button>
          </div>
        </div>
      </Card>

      {/* Subjects List */}
      <div className="grid gap-4">
        {filteredSubjects.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-[var(--text-muted)]">No subjects found matching your criteria.</p>
          </Card>
        ) : (
          filteredSubjects.map((subject) => (
            <Card key={subject.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {subject.subjectName}
                    </h3>
                    <Badge variant="outline">{subject.subjectCode}</Badge>
                    {subject.isCore && (
                      <Badge className="bg-[var(--info-light)] text-[var(--info-dark)]">Core Subject</Badge>
                    )}
                    {subject.dosApproved ? (
                      <Badge className="bg-[var(--success-light)] text-[var(--success-dark)]">DoS Approved</Badge>
                    ) : (
                      <Badge className="bg-[var(--warning-light)] text-[var(--warning-dark)]">Pending Approval</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)]">
                    <span>Class: {subject.class.name}</span>
                    <span>Periods/Week: {subject.periodsPerWeek}</span>
                    {subject.practicalPeriods > 0 && (
                      <span>Practical Periods: {subject.practicalPeriods}</span>
                    )}
                  </div>

                  {subject.dosApprovedAt && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Approved on {new Date(subject.dosApprovedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!subject.dosApproved && (
                    <Button
                      onClick={() => handleApproveSubject(subject.id)}
                      disabled={loading}
                      size="sm"
                      className="bg-[var(--chart-green)] hover:bg-[var(--chart-green)]"
                    >
                      Approve
                    </Button>
                  )}
                  
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Summary */}
      <Card className="p-6 bg-[var(--bg-surface)]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{filteredSubjects.length}</p>
            <p className="text-sm text-[var(--text-secondary)]">Showing</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--chart-green)]">
              {filteredSubjects.filter(s => s.dosApproved).length}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">Approved</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--chart-yellow)]">
              {filteredSubjects.filter(s => !s.dosApproved).length}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--chart-blue)]">
              {filteredSubjects.filter(s => s.isCore).length}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">Core Subjects</p>
          </div>
        </div>
      </Card>
    </div>
  );
}