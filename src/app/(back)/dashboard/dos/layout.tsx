import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { StaffRole, Role } from '@/types/enums';
import { DoSContextProvider } from '@/components/dos/dos-context-provider';
import { DoSStandaloneLayout } from '@/components/dos/dos-standalone-layout';
import { ThemeProvider } from '@/components/providers/theme-provider';

export const metadata: Metadata = {
  title: 'Director of Studies Dashboard',
  description: 'Academic management and curriculum oversight',
};

export default async function DoSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Check if user has DoS role
  const userRoles = Array.isArray(session.user.roles) ? session.user.roles : [session.user.role];
  const hasDoSRole = userRoles.includes(StaffRole.DOS) || userRoles.includes(Role.SCHOOL_ADMIN);

  if (!hasDoSRole) {
    redirect('/dashboard/access-denied');
  }

  return (
    <ThemeProvider>
      <DoSContextProvider>
        <DoSStandaloneLayout user={{
          name: session.user.name || session.user.email || 'User',
          email: session.user.email,
          image: session.user.image
        }}>
          {children}
        </DoSStandaloneLayout>
      </DoSContextProvider>
    </ThemeProvider>
  );
}