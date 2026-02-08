'use client';

import { useState, useEffect } from 'react';

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

interface SubjectAssignment {
  subjectId: string;
  maxMark: number;
  appearsOnReport: boolean;
  affectsPosition: boolean;
}

export default function ClassSubjectAssignment() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [currentAssignments, setCurrentAssignments] = useState<ClassSubject[]>([]);
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
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
    } catch (err) {
      setError('Failed to load data');
    }
  };

  const fetchClassSubjects = async (classId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}/subjects`);
      if (response.ok) {
        const data = await response.json();
        setCurrentAssignments(data.classSubjects || []);
        
        // Initialize assignments from current data
        const currentAssignmentData = data.classSubjects?.map((cs: ClassSubject) => ({
          subjectId: cs.subject.id,
          maxMark: cs.maxMark,
          appearsOnReport: cs.appearsOnReport,
          affectsPosition: cs.affectsPosition
        })) || [];
        
        setAssignments(currentAssignmentData);
      }
    } catch (err) {
      console.error('Failed to fetch class subjects:', err);
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

  const handleAssignmentChange = (subjectId: string, field: keyof SubjectAssignment, value: any) => {
    setAssignments(prev => prev.map(a => 
      a.subjectId === subjectId ? { ...a, [field]: value } : a
    ));
  };

  const handleSave = async () => {
    if (!selectedClass) return;

    setLoading(true);
    setError(null);

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

      await fetchClassSubjects(selectedClass);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assignments');
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
                disabled={loading}
                className="bg-[var(--chart-blue)] text-[var(--white-pure)] px-6 py-2 rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Assignments'}
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
    </div>
  );
}