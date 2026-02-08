'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, Share, Clock, CheckCircle } from 'lucide-react';


export default function ReviewReportsPage() {
  const [reportStats, setReportStats] = useState({
    pending: 0,
    approved: 0,
    distributed: 0,
    downloaded: 0
  });

  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        // Fetch report statistics
        const statsResponse = await fetch('/api/dos/reports/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setReportStats(statsData);
        }

        // Fetch recent reports
        const reportsResponse = await fetch('/api/dos/reports');
        if (reportsResponse.ok) {
          const reportsData = await reportsResponse.json();
          setReports(reportsData.reports || []);
        }
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, []);

  const handleViewReport = (reportId: string) => {
    // Navigate to report viewer using the secure token system
    // In a real implementation, you would get the token for the report
    // For now, we'll use a placeholder
    window.open(`/reports/${reportId}`, '_blank');
  };

  const handleDownloadReport = (reportId: string) => {
    // Download the report using the secure token system
    // In a real implementation, you would get the token for the report
    // For now, we'll use a placeholder
    window.location.href = `/reports/${reportId}`;
  };

  const handleShareReport = async (reportId: string) => {
    try {
      // Get the share link from the API
      const response = await fetch(`/api/reports/share/${reportId}`);
      if (response.ok) {
        const data = await response.json();
        navigator.clipboard.writeText(data.shareLink);
        alert('Report link copied to clipboard!');
      } else {
        alert('Failed to generate share link');
      }
    } catch (error) {
      console.error('Error sharing report:', error);
      alert('Error sharing report');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Review Reports</h1>
          <p className="text-muted-foreground">
            Loading report data...
          </p>
        </div>
        <div className="text-center py-10">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Review Reports</h1>
        <p className="text-muted-foreground">
          Review, approve, and distribute generated reports
        </p>
      </div>

      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--chart-yellow)]" />
                <span className="text-2xl font-bold">{reportStats.pending}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--chart-green)]" />
                <span className="text-2xl font-bold">{reportStats.approved}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Distributed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Share className="h-4 w-4 text-[var(--chart-blue)]" />
                <span className="text-2xl font-bold">{reportStats.distributed}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Downloaded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-[var(--chart-purple)]" />
                <span className="text-2xl font-bold">{reportStats.downloaded}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>
              Review and manage recently generated reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.length > 0 ? (
                reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h3 className="font-medium">{report.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{report.type}</span>
                        <span>•</span>
                        <span>Generated {new Date(report.generatedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{report.size}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        report.status === 'distributed' ? 'default' :
                        report.status === 'approved' ? 'secondary' : 'outline'
                      }>
                        {report.status}
                      </Badge>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewReport(report.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadReport(report.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {(report.status === 'approved' || report.status === 'distributed') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShareReport(report.id)}
                          >
                            <Share className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No reports found. Generate reports to begin reviewing.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}