'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, BookOpen, Shield, TrendingUp, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createThemeStyle } from '@/lib/theme-utils';

/**
 * Legacy Subject Manager - Redirects to new comprehensive Subject Control System
 * This component is deprecated and redirects users to the new DoS Subjects page
 */
export default function SubjectManager() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      router.push('/dashboard/dos/subjects');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  const handleRedirect = (path: string) => {
    router.push(path);
  };

  return (
    <div className="p-6 space-y-6">
      <div 
        className="border rounded-lg p-6"
        style={createThemeStyle.alert('info')}
      >
        <div className="flex items-start space-x-4">
          <AlertTriangle className="h-6 w-6 mt-1" style={{ color: 'var(--info)' }} />
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--info-dark)' }}>
              Subject Management Has Been Upgraded
            </h3>
            <p className="mb-4" style={{ color: 'var(--info-dark)' }}>
              The subject management system has been replaced with a comprehensive DoS Subject Control Center 
              that provides academic oversight, performance tracking, and intervention capabilities.
            </p>
            <div className="flex items-center space-x-4">
              <Button onClick={() => handleRedirect('/dashboard/dos/subjects')} style={createThemeStyle.button('primary')}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Subject Control Center
              </Button>
              <span className="text-sm" style={{ color: 'var(--info)' }}>
                Auto-redirecting in 5 seconds...
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleRedirect('/dashboard/dos/subjects')}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5" style={{ color: 'var(--info)' }} />
              <span>Subject Control Center</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4" style={createThemeStyle.text('secondary')}>
              Comprehensive subject oversight with academic health indicators, risk assessment, and command map.
            </p>
            <ul className="text-sm space-y-1" style={createThemeStyle.text('secondary')}>
              <li>• Academic Context Bar</li>
              <li>• Subject Overview Table</li>
              <li>• Health Indicators</li>
              <li>• DoS Actions Panel</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleRedirect('/dashboard/dos/subjects/performance')}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" style={{ color: 'var(--success)' }} />
              <span>Performance Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4" style={createThemeStyle.text('secondary')}>
              Deep performance tracking with trend analysis, class comparisons, and teacher impact assessment.
            </p>
            <ul className="text-sm space-y-1" style={createThemeStyle.text('secondary')}>
              <li>• Performance Metrics</li>
              <li>• Trend Analysis</li>
              <li>• Class Breakdowns</li>
              <li>• Teacher Impact</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleRedirect('/dashboard/dos/subjects/interventions')}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" style={{ color: 'var(--warning)' }} />
              <span>DoS Interventions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4" style={createThemeStyle.text('secondary')}>
              Academic intervention management with tracking, templates, and direct DoS powers.
            </p>
            <ul className="text-sm space-y-1" style={createThemeStyle.text('secondary')}>
              <li>• Teacher Reassignment</li>
              <li>• Workload Adjustment</li>
              <li>• Recovery Plans</li>
              <li>• Performance Monitoring</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleRedirect('/dashboard/dos/subjects/management')}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} />
              <span>Subject Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4" style={createThemeStyle.text('secondary')}>
              Create, edit, and manage school subjects with full administrative control.
            </p>
            <ul className="text-sm space-y-1" style={createThemeStyle.text('secondary')}>
              <li>• Create/Edit Subjects</li>
              <li>• Manage Subject Types</li>
              <li>• UNEB Configuration</li>
              <li>• Class Assignments</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div 
        className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-default)'
        }}
      >
        <h4 
          className="font-semibold mb-3"
          style={createThemeStyle.text('primary')}
        >
          What&apos;s New in the Subject Control Center?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h5 
              className="font-medium mb-2"
              style={createThemeStyle.text('primary')}
            >
              Academic Health Monitoring
            </h5>
            <ul 
              className="space-y-1"
              style={createThemeStyle.text('secondary')}
            >
              <li>• Real-time coverage tracking</li>
              <li>• Performance trend analysis</li>
              <li>• Teacher stability monitoring</li>
              <li>• Assessment completion rates</li>
            </ul>
          </div>
          <div>
            <h5 
              className="font-medium mb-2"
              style={createThemeStyle.text('primary')}
            >
              DoS Powers & Actions
            </h5>
            <ul 
              className="space-y-1"
              style={createThemeStyle.text('secondary')}
            >
              <li>• Direct teacher assignment</li>
              <li>• Workload adjustments</li>
              <li>• Academic review flags</li>
              <li>• Recovery plan requests</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

