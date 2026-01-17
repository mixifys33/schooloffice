import React, { ReactNode } from 'react';
import { SiteHeader } from '../../../components/site-header';

export default function FrontLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
