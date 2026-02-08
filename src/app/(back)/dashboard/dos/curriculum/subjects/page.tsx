import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CurriculumService } from '@/services/dos/curriculum.service';
import { CurriculumSubjectsManager } from '@/components/dos/curriculum-subjects-manager';

export default async function CurriculumSubjectsPage() {
  const session = await auth();
  
  if (!session?.user?.schoolId) {
    redirect('/login');
  }

  // Get curriculum subjects data with error handling
  let curriculumSubjects = [];
  let curriculumOverview = {
    stats: { total: 0, approved: 0, pending: 0 },
    classCount: 0
  };

  try {
    curriculumSubjects = await CurriculumService.getCurriculumSubjects(session.user.schoolId);
    curriculumOverview = await CurriculumService.getCurriculumOverview(session.user.schoolId);
  } catch (error) {
    console.error('Error loading curriculum data:', error);
    // Continue with empty data - the component will handle the empty state
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Curriculum & Subjects</h1>
        <p className="text-[var(--text-secondary)]">Manage subject allocation and curriculum structure per class</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[var(--bg-main)] p-6 rounded-lg border border-[var(--border-default)]">
          <div className="flex items-center">
            <div className="p-2 bg-[var(--info-light)] rounded-lg">
              <svg className="w-6 h-6 text-[var(--chart-blue)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[var(--text-muted)]">Total Subjects</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">{curriculumOverview.stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-main)] p-6 rounded-lg border border-[var(--border-default)]">
          <div className="flex items-center">
            <div className="p-2 bg-[var(--success-light)] rounded-lg">
              <svg className="w-6 h-6 text-[var(--chart-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[var(--text-muted)]">DoS Approved</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">{curriculumOverview.stats.approved}</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-main)] p-6 rounded-lg border border-[var(--border-default)]">
          <div className="flex items-center">
            <div className="p-2 bg-[var(--warning-light)] rounded-lg">
              <svg className="w-6 h-6 text-[var(--chart-yellow)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[var(--text-muted)]">Pending Approval</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">{curriculumOverview.stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-main)] p-6 rounded-lg border border-[var(--border-default)]">
          <div className="flex items-center">
            <div className="p-2 bg-[var(--info-light)] rounded-lg">
              <svg className="w-6 h-6 text-[var(--chart-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-[var(--text-muted)]">Classes</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">{curriculumOverview.classCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <CurriculumSubjectsManager 
        curriculumSubjects={curriculumSubjects}
        schoolId={session.user.schoolId}
        userId={session.user.id}
      />
    </div>
  );
}