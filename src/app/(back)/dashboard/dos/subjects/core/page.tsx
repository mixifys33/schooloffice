'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Edit, Trash2, BookOpen, Users } from 'lucide-react';
import { toast } from 'sonner';

interface CoreSubject {
  id: string;
  name: string;
  code: string;
  description: string;
  isRequired: boolean;
  teachersAssigned: number;
  classesAssigned: number;
}

export default function CoreSubjectsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [subjects, setSubjects] = useState<CoreSubject[]>([]);
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
      fetchCoreSubjects();
    }
  }, [status, session?.user?.schoolId]);

  const fetchCoreSubjects = async () => {
    try {
      const response = await fetch('/api/dos/subjects/overview?type=core');
      if (!response.ok) {
        throw new Error('Failed to fetch core subjects');
      }
      const data = await response.json();
      
      // Transform the data to match our interface
      const transformedSubjects: CoreSubject[] = data.subjects.map((subject: any) => ({
        id: subject.id,
        name: subject.name,
        code: subject.code,
        description: `Core ${subject.name.toLowerCase()} curriculum`,
        isRequired: subject.type === 'CORE',
        teachersAssigned: subject.teachersAssigned,
        classesAssigned: subject.classesOffered
      }));
      
      setSubjects(transformedSubjects);
    } catch (error) {
      console.error('Error fetching core subjects:', error);
      toast.error('Failed to load core subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/dos/subjects/management');
  };

  const handleAddSubject = () => {
    router.push('/dashboard/dos/subjects/add?type=core');
  };

  const handleEditSubject = (subjectId: string) => {
    router.push(`/dashboard/dos/subjects/edit/${subjectId}`);
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
          <p className="mt-2 text-sm text-gray-600">Loading core subjects...</p>
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
            <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Core Subjects</h1>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Manage core curriculum subjects</p>
          </div>
        </div>
        <Button onClick={handleAddSubject}>
          <Plus className="h-4 w-4 mr-2" />
          Add Core Subject
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
                <Badge variant={subject.isRequired ? "default" : "secondary"}>
                  {subject.isRequired ? "Required" : "Optional"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                {subject.description}
              </p>
              
              <div className="flex justify-between text-sm">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-[var(--chart-blue)]" />
                  <span>{subject.teachersAssigned} Teachers</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BookOpen className="h-4 w-4 text-[var(--chart-green)]" />
                  <span>{subject.classesAssigned} Classes</span>
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
              No Core Subjects Found
            </h3>
            <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4">
              Start by adding your first core subject to the curriculum.
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