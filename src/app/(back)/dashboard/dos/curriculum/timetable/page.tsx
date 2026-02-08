
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TimetableManager } from '@/components/dos/timetable-manager';
import { prisma } from '@/lib/db';

export default async function TimetablePage() {
  const session = await auth();
  
  if (!session?.user?.schoolId) {
    redirect('/login');
  }

  // Get current academic year and term
  const currentAcademicYear = await prisma.academicYear.findFirst({
    where: {
      schoolId: session.user.schoolId,
      isActive: true,
    },
    include: {
      terms: {
        orderBy: { startDate: 'asc' },
      },
    },
  });

  // Get classes for timetable generation
  const classes = await prisma.class.findMany({
    where: {
      schoolId: session.user.schoolId,
    },
    orderBy: { level: 'asc' },
  });

  // Get existing timetables
  const timetables = await prisma.doSTimetable.findMany({
    where: {
      schoolId: session.user.schoolId,
    },
    include: {
      class: true,
      term: true,
      entries: {
        include: {
          curriculumSubject: {
            include: {
              subject: true,
            },
          },
          teacher: {
            include: {
              user: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Timetable Management</h1>
        <p className="text-[var(--text-secondary)]">Generate, approve, and manage class timetables</p>
      </div>

      {/* Timetable Manager */}
      <TimetableManager
        schoolId={session.user.schoolId}
        userId={session.user.id}
        classes={classes}
        academicYear={currentAcademicYear}
        timetables={timetables}
      />
    </div>
  );
}