'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Edit, Trash2, BookOpen, Users } from 'lucide-react';

interface CoreSubject {
  id: string;
  name: string;
  code: string;
  description: string;
  credits: number;
  teachersAssigned: number;
  studentsEnrolled: number;
  status: 'active' | 'inactive';
}

export default function CoreSubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<CoreSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockSubjects: CoreSubject[] = [
      {
        id: '1',
        name: 'Mathematics',
        code: 'MATH101',
        description: 'Core mathematics curriculum',
        credits: 4,
        teachersAssigned: 3,
        studentsEnrolled: 120,
        status: 'active'
      },
      {
        id: '2',
        name: 'English Language',
        code: 'ENG101',
        description: 'Core English language and literature',
        credits: 4,
        teachersAssigned: 2,
        studentsEnrolled: 115,
        status: 'active'
      },
      {
        id: '3',
        name: 'Science',
        code: 'SCI101',
        description: 'General science curriculum',
        credits: 3,
        teachersAssigned: 2,
        studentsEnrolled: 110,
        status: 'active'
      }
    ];
    
    setTimeout(() => {
      setSubjects(mockSubjects);
      setLoading(false);
    }, 500);
  }, []);

  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subject.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBack = () => {
    router.push('/dashboard/dos/subjects/management');
  };

  const handleAddSubject = () => {
    router.push('/dashboard/dos/subjects/add?type=core');
  };

  const handleEditSubject = (subjectId: string) => {
    router.push(`/dashboard/dos/subjects/edit/${subjectId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subject Management
          </Button>
        </div>
        <Button onClick={handleAddSubject}>
          <Plus className="h-4 w-4 mr-2" />
          Add Core Subject
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Core Subjects</h1>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Manage core curriculum subjects</p>
      </div>

      <div className="flex items-center space-x-4">
        <Input
          placeholder="Search subjects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubjects.map((subject) => (
            <Card key={subject.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-[var(--chart-blue)]" />
                    <span>{subject.name}</span>
                  </CardTitle>
                  <Badge variant={subject.status === 'active' ? 'default' : 'secondary'}>
                    {subject.status}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">{subject.code}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--text-secondary)] mb-4">{subject.description}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Credits:</span>
                    <span className="font-medium">{subject.credits}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Teachers:</span>
                    <span className="font-medium">{subject.teachersAssigned}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Students:</span>
                    <span className="font-medium">{subject.studentsEnrolled}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditSubject(subject.id)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredSubjects.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
              No Core Subjects Found
            </h3>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4">
              {searchTerm ? 'No subjects match your search criteria.' : 'Start by adding your first core subject.'}
            </p>
            <Button onClick={handleAddSubject}>
              <Plus className="h-4 w-4 mr-2" />
              Add Core Subject
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}