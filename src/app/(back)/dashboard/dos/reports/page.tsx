/**
 * DoS Report Card Management Page
 * 
 * Modern, responsive report management with mobile-first design.
 * Manages report card generation, approval, and publication.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  GraduationCap, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  FileText,
  Eye,
  Lock,
  Download,
  Send,
  Users,
  TrendingUp,
  Calendar,
  Printer,
  Search,
  Filter
} from 'lucide-react';

interface ReportCard {
  id: string;
  studentName: string;
  admissionNumber: string;
  className: string;
  streamName: string | null;
  termName: string;
  academicYear: string;
  totalMarks: number;
  averageScore: number;
  position: number | null;
  totalStudents: number | null;
  overallGrade: string | null;
  promotionRecommendation: string | null;
  status: string;
  dosApproved: boolean;
  isLocked: boolean;
  watermarked: boolean;
  publishedAt: Date | null;
  pdfUrl: string | null;
}

interface ReportCardStatus {
  totalReports: number;
  draftReports: number;
  approvedReports: number;
  publishedReports: number;
  lockedReports: number;
  pendingApproval: number;
  pendingPublication: number;
  approvalRate: number;
  publicationRate: number;
}

interface ClassSummary {
  classId: string;
  className: string;
  totalStudents: number;
  generatedReports: number;
  approvedReports: number;
  publishedReports: number;
  averageScore: number;
  passRate: number;
}

export default function DoSReportsPage() {
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [status, setStatus] = useState<ReportCardStatus | null>(null);
  const [classSummaries, setClassSummaries] = useState<ClassSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (selectedTerm) {
      fetchReportData();
    }
  }, [selectedTerm, selectedClass]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Validate term selection
      if (!selectedTerm) {
        alert('Please select a term to view reports');
        return;
      }
      
      // Fetch status overview
      const statusResponse = await fetch(`/api/dos/reports/status?termId=${selectedTerm}${selectedClass !== 'all' ? `&classId=${selectedClass}` : ''}`);
      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        throw new Error(errorData.error || 'Failed to fetch status');
      }
      const statusData = await statusResponse.json();
      setStatus(statusData);
      
      // Fetch report cards
      const cardsResponse = await fetch(`/api/dos/reports/cards?termId=${selectedTerm}${selectedClass !== 'all' ? `&classId=${selectedClass}` : ''}`);
      if (!cardsResponse.ok) {
        const errorData = await cardsResponse.json();
        throw new Error(errorData.error || 'Failed to fetch report cards');
      }
      const reportCardsData = await cardsResponse.json();
      setReportCards(reportCardsData);
      
      // Fetch class summaries
      const summariesResponse = await fetch(`/api/dos/reports/class-summaries?termId=${selectedTerm}`);
      if (!summariesResponse.ok) {
        const errorData = await summariesResponse.json();
        throw new Error(errorData.error || 'Failed to fetch class summaries');
      }
      const classSummariesData = await summariesResponse.json();
      setClassSummaries(classSummariesData);
      
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      alert(`Failed to fetch report data: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReportCard = async (reportId: string) => {
    try {
      const response = await fetch(`/api/dos/reports/cards/${reportId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'DoS approval via report management interface'
        })
      });

      if (response.ok) {
        fetchReportData();
      } else {
        const error = await response.json();
        alert(`Failed to approve report card: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to approve report card:', error);
      alert('Failed to approve report card');
    }
  };

  const handlePublishReportCard = async (reportId: string) => {
    try {
      const response = await fetch(`/api/dos/reports/cards/${reportId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          removeWatermark: true
        })
      });

      if (response.ok) {
        fetchReportData();
      } else {
        const error = await response.json();
        alert(`Failed to publish report card: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to publish report card:', error);
      alert('Failed to publish report card');
    }
  };

  const handleBulkGenerate = async (classId: string) => {
    try {
      const response = await fetch('/api/dos/reports/bulk-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          termId: selectedTerm
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Generated ${result.generated} report cards. ${result.errors.length} errors.`);
        fetchReportData();
      } else {
        const error = await response.json();
        alert(`Failed to generate report cards: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to generate report cards:', error);
      alert('Failed to generate report cards');
    }
  };

  const filteredReports = reportCards.filter(report => {
    const matchesSearch = report.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'approved' && report.dosApproved) ||
                         (filterStatus === 'pending' && !report.dosApproved) ||
                         (filterStatus === 'published' && report.publishedAt);
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-[var(--bg-surface)] rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[var(--bg-main)] p-6 rounded-lg border">
                <div className="h-4 bg-[var(--bg-surface)] rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-[var(--bg-surface)] rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">Report Card Management</h1>
          <p className="text-[var(--text-secondary)] mt-1">Generate, approve, and publish student report cards</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Bulk Export
          </Button>
          <Button size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Generate Reports
          </Button>
        </div>
      </div>
      
      {/* Term Selection */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Select Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-default)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] bg-[var(--bg-main)] text-[var(--text-primary)]"
            >
              <option value="">Select a term</option>
              <option value="term1">Term 1</option>
              <option value="term2">Term 2</option>
              <option value="term3">Term 3</option>
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Select Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-default)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] bg-[var(--bg-main)] text-[var(--text-primary)]"
            >
              <option value="all">All Classes</option>
              <option value="grade10a">Grade 10A</option>
              <option value="grade10b">Grade 10B</option>
              <option value="grade11a">Grade 11A</option>
              <option value="grade11b">Grade 11B</option>
              <option value="grade12a">Grade 12A</option>
              <option value="grade12b">Grade 12B</option>
            </select>
          </div>
          <div className="pt-6 w-full md:w-auto">
            <Button 
              onClick={fetchReportData}
              disabled={!selectedTerm}
              className="w-full"
            >
              Load Reports
            </Button>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      {status && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">Total Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{status.totalReports}</div>
              <p className="text-xs text-[var(--text-muted)] mt-1">{status.draftReports} drafts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[var(--chart-green)]">{status.approvedReports}</div>
              <p className="text-xs text-[var(--text-muted)] mt-1">{status.approvalRate.toFixed(1)}% approval rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[var(--chart-blue)]">{status.publishedReports}</div>
              <p className="text-xs text-[var(--text-muted)] mt-1">{status.publicationRate.toFixed(1)}% published</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[var(--text-secondary)]">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[var(--chart-yellow)]">{status.pendingApproval}</div>
              <p className="text-xs text-[var(--text-muted)] mt-1">Awaiting DoS approval</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alert for Pending Approvals */}
      {status && status.pendingApproval > 0 && (
        <div className="bg-[var(--warning-light)] border border-[var(--warning-light)] rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-[var(--chart-yellow)] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-[var(--warning-dark)]">Pending Approvals</h3>
              <p className="text-sm text-[var(--warning)] mt-1">
                {status.pendingApproval} report cards are awaiting your approval before publication.
              </p>
            </div>
            <Button variant="outline" size="sm" className="border-[var(--warning)] text-[var(--warning)] hover:bg-[var(--warning-light)]">
              Review Now
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
          <TabsTrigger value="reports">Report Cards</TabsTrigger>
          <TabsTrigger value="classes">Class Summary</TabsTrigger>
          <TabsTrigger value="analytics" className="hidden lg:block">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] h-4 w-4" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-[var(--border-default)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="published">Published</option>
              </select>
              
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2 border border-[var(--border-default)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              >
                <option value="all">All Classes</option>
                <option value="grade10a">Grade 10A</option>
                <option value="grade10b">Grade 10B</option>
              </select>
            </div>
          </div>

          {/* Report Cards */}
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <Card key={report.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-2 lg:space-y-0">
                    <div>
                      <CardTitle className="text-lg">{report.studentName}</CardTitle>
                      <CardDescription>
                        {report.admissionNumber} • {report.className} • {report.termName}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={report.dosApproved ? "default" : "secondary"} 
                             className={report.dosApproved ? "bg-[var(--success-light)] text-[var(--success-dark)]" : "bg-[var(--warning-light)] text-[var(--warning-dark)]"}>
                        {report.dosApproved ? 'Approved' : 'Pending'}
                      </Badge>
                      {report.publishedAt && (
                        <Badge variant="secondary" className="bg-[var(--info-light)] text-[var(--info-dark)]">
                          Published
                        </Badge>
                      )}
                      {report.isLocked && (
                        <Badge variant="secondary" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                          <Lock className="h-3 w-3 mr-1" />
                          Locked
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-secondary)]">Average Score:</span>
                      <div className="font-medium">{report.averageScore.toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Grade:</span>
                      <div className="font-medium">{report.overallGrade}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Position:</span>
                      <div className="font-medium">{report.position}/{report.totalStudents}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Recommendation:</span>
                      <div className="font-medium text-[var(--chart-green)]">{report.promotionRecommendation}</div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    {report.pdfUrl && (
                      <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    )}
                    {!report.dosApproved && (
                      <Button 
                        size="sm" 
                        className="flex-1 sm:flex-none bg-[var(--chart-green)] hover:bg-[var(--chart-green)]"
                        onClick={() => handleApproveReportCard(report.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    )}
                    {report.dosApproved && !report.publishedAt && (
                      <Button 
                        size="sm" 
                        className="flex-1 sm:flex-none bg-[var(--chart-blue)] hover:bg-[var(--accent-hover)]"
                        onClick={() => handlePublishReportCard(report.id)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Publish
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="classes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {classSummaries.map((classData) => (
              <Card key={classData.classId}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-[var(--chart-blue)]" />
                    {classData.className}
                  </CardTitle>
                  <CardDescription>
                    {classData.totalStudents} students
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-[var(--text-secondary)]">Generated:</span>
                      <div className="text-lg font-bold text-[var(--chart-blue)]">{classData.generatedReports}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Approved:</span>
                      <div className="text-lg font-bold text-[var(--chart-green)]">{classData.approvedReports}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Published:</span>
                      <div className="text-lg font-bold text-[var(--chart-purple)]">{classData.publishedReports}</div>
                    </div>
                    <div>
                      <span className="text-[var(--text-secondary)]">Pass Rate:</span>
                      <div className="text-lg font-bold text-[var(--chart-yellow)]">{classData.passRate.toFixed(1)}%</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Class Average:</span>
                      <span className="font-medium">{classData.averageScore.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Completion Rate:</span>
                      <span className="font-medium">
                        {((classData.generatedReports / classData.totalStudents) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm" className="w-full">
                    View Class Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Publication Timeline</CardTitle>
                <CardDescription>Report card publication progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-[var(--bg-surface)] rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-muted)]">Timeline chart will be displayed here</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grade Distribution</CardTitle>
                <CardDescription>Overall grade distribution across classes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Grade A</span>
                    <Badge variant="secondary" className="bg-[var(--success-light)] text-[var(--success-dark)]">25%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Grade B</span>
                    <Badge variant="secondary" className="bg-[var(--info-light)] text-[var(--info-dark)]">35%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Grade C</span>
                    <Badge variant="secondary" className="bg-[var(--warning-light)] text-[var(--warning-dark)]">30%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Grade D</span>
                    <Badge variant="secondary" className="bg-[var(--danger-light)] text-[var(--danger-dark)]">10%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}