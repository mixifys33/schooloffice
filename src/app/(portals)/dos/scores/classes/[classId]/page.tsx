import { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ClassScoresView } from '@/components/dos/class-scores-view';
import { prisma } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Class Scores - DoS Portal',
  description: 'View and approve class scores (CA 20% + Exam 80%)',
};

interface PageProps {
  params: Promise<{
    classId: string;
  }>;
}

export default async function ClassScoresPage({ params }: PageProps) {
  const session = await auth();
  
  if (!session?.user?.schoolId) {
    redirect('/login');
  }

  const { classId } = await params;

  // Fetch class details
  const classData = await prisma.class.findFirst({
    where: {
      id: classId,
      schoolId: session.user.schoolId,
    },
    select: {
      id: true,
      name: true,
      level: true,
    },
  });

  if (!classData) {
    redirect('/dos/scores');
  }

  // Fetch current term
  const currentTerm = await prisma.term.findFirst({
    where: {
      academicYear: {
        schoolId: session.user.schoolId,
        isCurrent: true,
      },
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
    },
  });

  if (!currentTerm) {
    return (
      <div className="p-6">
        <div className="bg-[var(--warning-light)] border border-[var(--warning-light)] rounded-lg p-4">
          <p className="text-[var(--warning-dark)]">
            No active term found. Please configure an active term first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ClassScoresView
      classData={classData}
      termData={currentTerm}
      schoolId={session.user.schoolId}
      userId={session.user.id}
    />
  );
}
