'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Edit, Trash2, BookOpen, Users, Star } from 'lucide-react';
import { toast } from 'sonner';

interface ElectiveSubject {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  popularity: number;
  teachersAssigned: number;
  studentsEnrolled: number;
  maxCapacity: number;
}

export default function ElectiveSubjectsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [subjects, setSubjects] = useState<ElectiveSubject[]>([]);
  const [loading, setLoading] = useState(true);

  // Authentication check
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.role !== 'DOS' && session?.user?.role !== 'SUPER_ADMIN') {
      toast.error('Director of Studies access required');
      router.push('/dashboard');
      return;
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.schoolId) {
      fetchElectiveSubjects();
    }
  }, [status, session?.user?.schoolId]);

  const fetchElectiveSubjects = async () => {
    try {
      const response = await fetch('/api/dos/subjects/overview?type=elective');
      if (!response.ok) {
        throw new Error('Failed to fetch elective subjects');
      }
      const data = await response.json();
      
      // Transform the data to match our interface
      const transformedSubjects: ElectiveSubject[] = data.subjects.map((subject: any) => ({
        id: subject.id,
        name: subject.name,
        code: subject.code,
        description: `Elective ${subject.name.toLowerCase()} subject`,
        category: 'General',
        popularity: subject.popularity || 0,
        teachersAssigned: subject.teachersAssigned,
        studentsEnrolled: subject.studentsEnrolled || 0,
        maxCapacity: subject.totalCapacity || 50
      }));
      
      setSubjects(transformedSubjects);
    } catch (error) {
      console.error('Error fetching elective subjects:', error);
      toast.error('Failed to load elective subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/dos/subjects/management');
  };

  const handleAddSubject = () => {
    router.push('/dashboard/dos/subjects/add?type=elective');
  };

  const handleEditSubject = (subjectId: string) => {
    router.push(`/dashboard/dos/subjects/edit/${subjectId}`);
  };

  const getPopularityColor = (popularity: number) => {
    if (popularity >= 80) return 'text-green-600';
    if (popularity >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCapacityColor = (enrolled: number, capacity: number) => {
    const percentage = (enrolled / capacity) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading elective subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Elective Subjects</h1>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Manage elective and optional subjects</p>
          </div>
        </div>
        <Button onClick={handleAddSubject}>
          <Plus className="h-4 w-4 mr-2" />
          Add Elective Subject
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <Card key={subject.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{subject.name}</CardTitle>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Code: {subject.code}
                  </p>
                </div>
                <Badge variant="secondary">
                  {subject.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                {subject.description}
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-1">
                    <Star className={`h-4 w-4 ${getPopularityColor(subject.popularity)}`} />
                    <span>Popularity: {subject.popularity}%</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4 text-[var(--chart-blue)]" />
                    <span>{subject.teachersAssigned} Teachers</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-4 w-4 text-[var(--chart-green)]" />
                    <span className={getCapacityColor(subject.studentsEnrolled, subject.maxCapacity)}>
                      {subject.studentsEnrolled}/{subject.maxCapacity} Students
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {Math.round((subject.studentsEnrolled / subject.maxCapacity) * 100)}% Full
                  </div>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleEditSubject(subject.id)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {subjects.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
              No Elective Subjects Found
            </h3>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4">
              Start by adding your first elective subject to expand student choices.
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