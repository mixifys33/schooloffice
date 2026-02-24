'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, BookOpen } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  level: number;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface ClassSubject {
  id: string;
  maxMark: number;
  appearsOnReport: boolean;
  affectsPosition: boolean;
  subject: Subject;
}

interface ClassWithAssignments {
  classId: string;
  className: string;
  subjects: Subject[];
}

interface SubjectAssignment {
  subjectId: string;
  maxMark: number;
  appearsOnReport: boolean;
  affectsPosition: boolean;
}

export default function ClassSubjectAssignment() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [allAssignments, setAllAssignments] = useState<ClassWithAssignments[]>([]);
  const [loadingAllAssignments, setLoadingAllAssignments] = useState(false);

  useEffect(() => {
    fetchInitialData();
    fetchAllAssignments();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassSubjects(selectedClass);
    }
  }, [selectedClass]);

  const fetchInitialData = async () => {
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/dos/subjects')
      ]);

      if (!classesRes.ok || !subjectsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [classesData, subjectsData] = await Promise.all([
        classesRes.json(),
        subjectsRes.json()
      ]);

      setClasses(classesData.classes || []);
      setSubjects(subjectsData.subjects?.filter((s: Subject) => s.isActive) || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const fetchClassSubjects = async (classId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}/subjects`);
      if (response.ok) {
        const data = await response.json();
        
        // Initialize assignments from current data
        const currentAssignmentData = data.classSubjects?.map((cs: ClassSubject) => ({
          subjectId: cs.subject.id,
          maxMark: cs.maxMark,
          appearsOnReport: cs.appearsOnReport,
          affectsPosition: cs.affectsPosition
        })) || [];
        
        setAssignments(currentAssignmentData);
      }
    } catch (error) {
      console.error('Failed to fetch class subjects:', error);
    }
  };

  const fetchAllAssignments = async () => {
    try {
      setLoadingAllAssignments(true);
      const response = await fetch('/api/classes/subjects');
      if (response.ok) {
        const data = await response.json();
        
        // Group by class
        const grouped: { [key: string]: ClassWithAssignments } = {};
        
        interface RelationshipData {
          classId: string;
          className: string;
          subjectId: string;
          subjectName: string;
          subjectCode: string;
        }
        
        data.relationships?.forEach((rel: RelationshipData) => {
          if (!grouped[rel.classId]) {
            grouped[rel.classId] = {
              classId: rel.classId,
              className: rel.className,
              subjects: []
            };
          }
          grouped[rel.classId].subjects.push({
            id: rel.subjectId,
            name: rel.subjectName,
            code: rel.subjectCode,
            isActive: true
          });
        });
        
        setAllAssignments(Object.values(grouped));
      }
    } catch (error) {
      console.error('Failed to fetch all assignments:', error);
    } finally {
      setLoadingAllAssignments(false);
    }
  };

  const handleSubjectToggle = (subjectId: string, checked: boolean) => {
    if (checked) {
      // Add subject with default settings
      setAssignments(prev => [...prev, {
        subjectId,
        maxMark: 100,
        appearsOnReport: true,
        affectsPosition: true
      }]);
    } else {
      // Remove subject
      setAssignments(prev => prev.filter(a => a.subjectId !== subjectId));
    }
  };

  const handleAssignmentChange = (subjectId: string, field: keyof SubjectAssignment, value: number | boolean) => {
    setAssignments(prev => prev.map(a => 
      a.subjectId === subjectId ? { ...a, [field]: value } : a
    ));
  };

  const handleSave = async () => {
    if (!selectedClass) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/dos/subjects/class-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClass,
          assignments: assignments.map(a => ({
            subjectId: a.subjectId,
            markStructure: {
              maxMark: a.maxMark,
              appearsOnReport: a.appearsOnReport,
              affectsPosition: a.affectsPosition
            }
          }))
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save assignments');
      }

      const data = await response.json();
      
      // Show success toast
      toast({
        title: 'Success!',
        description: `${assignments.length} subject(s) assigned to ${selectedClassName}`,
        variant: 'success',
        duration: 5000
      });

      // Show success message in UI
      setSuccessMessage(`Successfully assigned ${assignments.length} subject(s) to ${selectedClassName}`);

      // Refresh the assignments to show updated data
      await fetchClassSubjects(selectedClass);
      await fetchAllAssignments();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save assignments';
      setError(errorMessage);
      
      // Show error toast
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || '';

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Class Subject Assignment</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Assign subjects to classes and configure mark structures
        </p>
      </div>

      {error && (
        <div className="bg-[var(--danger-light)] border border-[var(--danger-light)] text-[var(--chart-red)] px-4 py-3 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="bg-[var(--bg-main)] rounded-lg border">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center space-x-4">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Select Class:
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
            >
              <option value="">Choose a class...</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedClass && (
          <div className="p-6">
            {/* Summary of assigned subjects */}
            {assignments.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900">
                    Currently Assigned: {assignments.length} subject(s)
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {assignments.map(assignment => {
                    const subject = subjects.find(s => s.id === assignment.subjectId);
                    return subject ? (
                      <span
                        key={assignment.subjectId}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {subject.name} ({subject.code})
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            <h3 className="text-lg font-semibold mb-4">
              Subjects for {selectedClassName}
            </h3>

            <div className="space-y-4">
              {subjects.map(subject => {
                const assignment = assignments.find(a => a.subjectId === subject.id);
                const isAssigned = !!assignment;

                return (
                  <div key={subject.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={(e) => handleSubjectToggle(subject.id, e.target.checked)}
                          className="h-4 w-4 text-[var(--chart-blue)] focus:ring-[var(--accent-primary)] border-[var(--border-default)] rounded"
                        />
                        <div>
                          <span className="font-medium">{subject.name}</span>
                          <span className="text-[var(--text-muted)] ml-2">({subject.code})</span>
                        </div>
                      </div>
                    </div>

                    {isAssigned && assignment && (
                      <div className="ml-7 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                            Maximum Mark
                          </label>
                          <input
                            type="number"
                            value={assignment.maxMark}
                            onChange={(e) => handleAssignmentChange(
                              subject.id, 
                              'maxMark', 
                              parseFloat(e.target.value) || 0
                            )}
                            min="1"
                            max="1000"
                            className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
                          />
                        </div>

                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={assignment.appearsOnReport}
                              onChange={(e) => handleAssignmentChange(
                                subject.id, 
                                'appearsOnReport', 
                                e.target.checked
                              )}
                              className="h-4 w-4 text-[var(--chart-blue)] focus:ring-[var(--accent-primary)] border-[var(--border-default)] rounded"
                            />
                            <span className="ml-2 text-sm text-[var(--text-primary)]">
                              Appears on report card
                            </span>
                          </label>
                        </div>

                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={assignment.affectsPosition}
                              onChange={(e) => handleAssignmentChange(
                                subject.id, 
                                'affectsPosition', 
                                e.target.checked
                              )}
                              className="h-4 w-4 text-[var(--chart-blue)] focus:ring-[var(--accent-primary)] border-[var(--border-default)] rounded"
                            />
                            <span className="ml-2 text-sm text-[var(--text-primary)]">
                              Affects total/position
                            </span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading || assignments.length === 0}
                className="bg-[var(--chart-blue)] text-[var(--white-pure)] px-6 py-2 rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Save Assignments
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {!selectedClass && (
          <div className="px-6 py-8 text-center text-[var(--text-muted)]">
            Select a class to manage subject assignments
          </div>
        )}
      </div>

      {/* All Assignments Overview */}
      <div className="bg-[var(--bg-main)] rounded-lg border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            All Class-Subject Assignments
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Overview of all curriculum assignments across classes
          </p>
        </div>

        <div className="p-6">
          {loadingAllAssignments ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <div className="animate-spin h-8 w-8 border-4 border-[var(--chart-blue)] border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading assignments...
            </div>
          ) : allAssignments.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)]">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No assignments yet</p>
              <p className="text-sm mt-1">Start by selecting a class above and assigning subjects</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allAssignments.map((classAssignment) => (
                <div
                  key={classAssignment.classId}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-lg text-[var(--text-primary)]">
                      {classAssignment.className}
                    </h3>
                    <span className="text-sm font-medium text-[var(--chart-blue)] bg-blue-50 px-2 py-1 rounded">
                      {classAssignment.subjects.length} subjects
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {classAssignment.subjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="flex items-center justify-between p-2 bg-[var(--bg-surface)] rounded text-sm"
                      >
                        <span className="font-medium text-[var(--text-primary)]">
                          {subject.name}
                        </span>
                        <span className="text-[var(--text-muted)] text-xs">
                          {subject.code}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedClass(classAssignment.classId);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="mt-3 w-full text-sm text-[var(--chart-blue)] hover:text-[var(--accent-hover)] font-medium"
                  >
                    Edit assignments →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}