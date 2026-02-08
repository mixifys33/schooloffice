'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Edit, Trash2, Users, Star } from 'lucide-react';

interface ElectiveSubject {
  id: string;
  name: string;
  code: string;
  description: string;
  credits: number;
  teachersAssigned: number;
  studentsEnrolled: number;
  maxCapacity: number;
  prerequisites: string[];
  status: 'active' | 'inactive' | 'full';
}

export default function ElectiveSubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<ElectiveSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockSubjects: ElectiveSubject[] = [
      {
        id: '1',
        name: 'Computer Programming',
        code: 'CS201',
        description: 'Introduction to programming concepts',
        credits: 3,
        teachersAssigned: 2,
        studentsEnrolled: 45,
        maxCapacity: 50,
        prerequisites: ['Mathematics'],
        status: 'active'
      },
      {
        id: '2',
        name: 'Art & Design',
        code: 'ART101',
        description: 'Creative arts and design principles',
        credits: 2,
        teachersAssigned: 1,
        studentsEnrolled: 30,
        maxCapacity: 30,
        prerequisites: [],
        status: 'full'
      },
      {
        id: '3',
        name: 'Music Theory',
        code: 'MUS101',
        description: 'Basic music theory and composition',
        credits: 2,
        teachersAssigned: 1,
        studentsEnrolled: 25,
        maxCapacity: 35,
        prerequisites: [],
        status: 'active'
      },
      {
        id: '4',
        name: 'Advanced Physics',
        code: 'PHY301',
        description: 'Advanced physics concepts',
        credits: 4,
        teachersAssigned: 1,
        studentsEnrolled: 15,
        maxCapacity: 25,
        prerequisites: ['Science', 'Mathematics'],
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
    router.push('/dashboard/dos/subjects/add?type=elective');
  };

  const handleEditSubject = (subjectId: string) => {
    router.push(`/dashboard/dos/subjects/edit/${subjectId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'full': return 'destructive';
      case 'inactive': return 'secondary';
      default: return 'default';
    }
  };

  const getCapacityColor = (enrolled: number, capacity: number) => {
    const percentage = (enrolled / capacity) * 100;
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-orange-600';
    return 'text-green-600';
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
          Add Elective Subject
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Elective Subjects</h1>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Manage elective and optional subjects</p>
      </div>

      <div className="flex items-center space-x-4">
        <Input
          placeholder="Search elective subjects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
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
                    <Star className="h-5 w-5 text-[var(--chart-green)]" />
                    <span>{subject.name}</span>
                  </CardTitle>
                  <Badge variant={getStatusColor(subject.status)}>
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
                    <span>Capacity:</span>
                    <span className={`font-medium ${getCapacityColor(subject.studentsEnrolled, subject.maxCapacity)}`}>
                      {subject.studentsEnrolled}/{subject.maxCapacity}
                    </span>
                  </div>
                  {subject.prerequisites.length > 0 && (
                    <div className="text-sm">
                      <span className="text-[var(--text-secondary)]">Prerequisites:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {subject.prerequisites.map((prereq, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {prereq}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
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
            <Star className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
              No Elective Subjects Found
            </h3>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4">
              {searchTerm ? 'No subjects match your search criteria.' : 'Start by adding your first elective subject.'}
            </p>
            <Button onClick={handleAddSubject}>
              <Plus className="h-4 w-4 mr-2" />
              Add Elective Subject
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}