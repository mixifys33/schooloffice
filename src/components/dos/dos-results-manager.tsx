'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  CalendarIcon, 
  EyeIcon, 
  SendIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  AlertTriangleIcon,
  BarChartIcon,
  FileTextIcon,
  UsersIcon
} from 'lucide-react';
import { DosResultsInboxItem, SmsMode, ReportCardState } from '@/types/dos-results';

const DosResultsManager = () => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [inboxItems, setInboxItems] = useState<DosResultsInboxItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [smsMode, setSmsMode] = useState<SmsMode>(SmsMode.STANDARD);
  const [customComment, setCustomComment] = useState<string>('');
  const [previewSms, setPreviewSms] = useState<{segment1: string, segment2?: string} | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [reportCards, setReportCards] = useState<any[]>([]);
  const [classList, setClassList] = useState<any[]>([]);

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch inbox items
        const inboxResponse = await fetch('/api/dos/results/submissions');
        if (inboxResponse.ok) {
          const inboxData = await inboxResponse.json();
          setInboxItems(inboxData);
        }

        // Fetch dashboard stats
        const dashboardResponse = await fetch('/api/dos/results/dashboard');
        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json();
          setDashboardStats(dashboardData);
        }

        // Fetch class list
        const classResponse = await fetch('/api/classes');
        if (classResponse.ok) {
          const classData = await classResponse.json();
          setClassList(classData);
        }
      } catch (error) {
        console.error('Error fetching DOS results data:', error);
      }
    };

    fetchData();
  }, []);

  const handleApproveSubject = async (classId: string, subjectId: string) => {
    try {
      const response = await fetch('/api/dos/results/approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          subjectId,
          caApproved: true,
          examApproved: true,
          lockSubject: true
        })
      });

      if (response.ok) {
        // Refresh the data after approval
        const inboxResponse = await fetch('/api/dos/results/submissions');
        if (inboxResponse.ok) {
          const inboxData = await inboxResponse.json();
          setInboxItems(inboxData);
        }

        // Show success notification
        alert('Subject approved successfully!');
      } else {
        alert('Failed to approve subject');
      }
    } catch (error) {
      console.error('Error approving subject:', error);
      alert('Error approving subject');
    }
  };

  const handleSmsPreview = async () => {
    try {
      // Get selected class ID (we need to map the UI selection to actual class ID)
      // For now, let's assume we have a way to get the actual class ID
      // This would typically come from a dropdown that fetches real class data

      // In a real implementation, we would call the API to generate preview
      // For now, we'll simulate with a temporary call to a preview endpoint
      const response = await fetch('/api/dos/results/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId: selectedClass, // This would need to be mapped to actual class ID
          smsMode,
          customComment,
          previewOnly: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Assuming the API returns the preview data
        setPreviewSms({
          segment1: result.results?.[0]?.smsSegments?.[0] || '[School] Results Preview',
          segment2: result.results?.[0]?.smsSegments?.[1] || undefined
        });
      } else {
        alert('Failed to generate SMS preview');
      }
    } catch (error) {
      console.error('Error generating SMS preview:', error);
      alert('Error generating SMS preview');
    }
  };

  const handleSendSms = async () => {
    try {
      const response = await fetch('/api/dos/results/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId: selectedClass, // This would need to be mapped to actual class ID
          smsMode,
          customComment,
          previewOnly: false // This means actually send the SMS
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`SMS sent successfully! ${result.sentCount} messages sent.`);
      } else {
        alert('Failed to send SMS');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      alert('Error sending SMS');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-500';
      case 'SUBMITTED':
        return 'bg-yellow-500';
      case 'DRAFT':
        return 'bg-gray-500';
      case 'REJECTED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Helper function for report card status badges
  const getReportCardStatusVariant = (state: string) => {
    switch (state) {
      case 'DRAFT':
        return 'outline';
      case 'REVIEWED':
        return 'secondary';
      case 'APPROVED':
        return 'default';
      case 'PUBLISHED':
        return 'success';
      default:
        return 'outline';
    }
  };

  // Function to compile report cards
  const handleCompileReportCards = async () => {
    try {
      const response = await fetch('/api/dos/results/report-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId: selectedClass,
          action: 'compile'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setReportCards(result.reportCards || []);
        alert('Report cards compiled successfully!');
      } else {
        alert('Failed to compile report cards');
      }
    } catch (error) {
      console.error('Error compiling report cards:', error);
      alert('Error compiling report cards');
    }
  };

  // Function to view a report card
  const handleViewReportCard = async (reportCardId: string) => {
    try {
      // In a real implementation, this would navigate to the report card view page
      window.open(`/dos/results/report-card/${reportCardId}`, '_blank');
    } catch (error) {
      console.error('Error viewing report card:', error);
      alert('Error viewing report card');
    }
  };

  // Function to approve a report card
  const handleApproveReportCard = async (reportCardId: string) => {
    try {
      const response = await fetch('/api/dos/results/report-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportCardIds: [reportCardId],
          action: 'approve'
        })
      });

      if (response.ok) {
        // Refresh the report cards list
        const refreshResponse = await fetch('/api/dos/results/report-cards', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            classId: selectedClass
          })
        });

        if (refreshResponse.ok) {
          const result = await refreshResponse.json();
          setReportCards(result.reportCards || []);
        }

        alert('Report card approved successfully!');
      } else {
        alert('Failed to approve report card');
      }
    } catch (error) {
      console.error('Error approving report card:', error);
      alert('Error approving report card');
    }
  };

  // Function to publish a report card
  const handlePublishReportCard = async (reportCardId: string) => {
    try {
      const response = await fetch('/api/dos/results/report-cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportCardIds: [reportCardId],
          action: 'publish'
        })
      });

      if (response.ok) {
        // Refresh the report cards list
        const refreshResponse = await fetch('/api/dos/results/report-cards', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            classId: selectedClass
          })
        });

        if (refreshResponse.ok) {
          const result = await refreshResponse.json();
          setReportCards(result.reportCards || []);
        }

        alert('Report card published successfully!');
      } else {
        alert('Failed to publish report card');
      }
    } catch (error) {
      console.error('Error publishing report card:', error);
      alert('Error publishing report card');
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Department of Studies (DoS) Results Management</h1>
        <p className="text-muted-foreground">Centralized academic authority for results collection, approval, and distribution</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="inbox">Results Inbox</TabsTrigger>
          <TabsTrigger value="approval">Approvals</TabsTrigger>
          <TabsTrigger value="reports">Report Cards</TabsTrigger>
          <TabsTrigger value="sms">SMS Distribution</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        {/* Results Inbox Tab */}
        <TabsContent value="inbox" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Results Inbox</CardTitle>
              <CardDescription>Review teacher submissions awaiting DoS approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex justify-end">
                <Button 
                  onClick={() => {
                    // Refresh data
                    const fetchData = async () => {
                      try {
                        const inboxResponse = await fetch('/api/dos/results/submissions');
                        if (inboxResponse.ok) {
                          const inboxData = await inboxResponse.json();
                          setInboxItems(inboxData);
                        }
                      } catch (error) {
                        console.error('Error refreshing inbox:', error);
                      }
                    };
                    fetchData();
                  }}
                >
                  Refresh
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>CA Status</TableHead>
                    <TableHead>Exam Status</TableHead>
                    <TableHead>Completeness</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inboxItems.map((item) => (
                    <TableRow key={`${item.classId}-${item.subjectId}`}>
                      <TableCell className="font-medium">{item.className}</TableCell>
                      <TableCell>{item.subjectName}</TableCell>
                      <TableCell>{item.teacherName}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeVariant(item.caStatus)}>
                          {item.caStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeVariant(item.examStatus)}>
                          {item.examStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                            <div
                              className={`h-2.5 rounded-full ${
                                item.completenessIndicator === 100 ? 'bg-green-500' :
                                item.completenessIndicator >= 75 ? 'bg-blue-500' :
                                item.completenessIndicator >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${item.completenessIndicator}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{item.completenessIndicator}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{item.lastUpdated.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApproveSubject(item.classId, item.subjectId)}
                        >
                          Review & Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approval" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Subjects awaiting DoS approval and freeze</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>S2 East - Mathematics</CardTitle>
                    <CardDescription>Mr. Johnson</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>CA Approved</Label>
                        <Checkbox />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Exam Approved</Label>
                        <Checkbox />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Lock Subject</Label>
                        <Checkbox />
                      </div>
                      <Button>Approve & Lock</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>S2 East - English</CardTitle>
                    <CardDescription>Mrs. Smith</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>CA Approved</Label>
                        <Checkbox defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Exam Approved</Label>
                        <Checkbox />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Lock Subject</Label>
                        <Checkbox />
                      </div>
                      <Button disabled>Approve & Lock (Exam Pending)</Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>S2 East - Biology</CardTitle>
                    <CardDescription>Dr. Wilson</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>CA Approved</Label>
                        <Checkbox defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Exam Approved</Label>
                        <Checkbox defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Lock Subject</Label>
                        <Checkbox defaultChecked />
                      </div>
                      <Button>Approve & Lock</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report Cards Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Cards</CardTitle>
              <CardDescription>Generate, review, and publish student report cards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent id="class-select-content">
                    {classList.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={smsMode} onValueChange={(value) => setSmsMode(value as SmsMode)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="SMS Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SmsMode.STANDARD}>Standard</SelectItem>
                    <SelectItem value={SmsMode.SIMPLE}>Simple Language</SelectItem>
                    <SelectItem value={SmsMode.MINIMAL}>Minimal</SelectItem>
                    <SelectItem value={SmsMode.NO_LINK}>No Link</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleCompileReportCards}>Compile Report Cards</Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Admission #</TableHead>
                    <TableHead>Overall Avg</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportCards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell className="font-medium">{card.studentName}</TableCell>
                      <TableCell>{card.admissionNumber}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${
                          card.overallAverage && card.overallAverage >= 80 ? 'text-green-600' :
                          card.overallAverage && card.overallAverage >= 70 ? 'text-blue-600' :
                          card.overallAverage && card.overallAverage >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {card.overallAverage}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getReportCardStatusVariant(card.state)}>
                          {card.state}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleViewReportCard(card.id)}>
                              <EyeIcon className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleApproveReportCard(card.id)}>
                              <CheckCircleIcon className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePublishReportCard(card.id)}>
                              <SendIcon className="mr-2 h-4 w-4" />
                              Publish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Distribution Tab */}
        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMS Distribution</CardTitle>
              <CardDescription>Send report card links to parents via SMS (2-segment professional format)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="class-select">Select Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger id="class-select">
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classList.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>SMS Mode</Label>
                    <Select value={smsMode} onValueChange={(value) => setSmsMode(value as SmsMode)}>
                      <SelectTrigger>
                        <SelectValue placeholder="SMS Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SmsMode.STANDARD}>Standard (2 Segments)</SelectItem>
                        <SelectItem value={SmsMode.SIMPLE}>Simple Language</SelectItem>
                        <SelectItem value={SmsMode.MINIMAL}>Minimal</SelectItem>
                        <SelectItem value={SmsMode.NO_LINK}>No Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Custom Comment</Label>
                    <Textarea
                      value={customComment}
                      onChange={(e) => setCustomComment(e.target.value)}
                      placeholder="Enter custom comment for all messages (optional)..."
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={handleSmsPreview}>Preview SMS</Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="default">Send SMS</Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Send SMS Confirmation</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to send SMS to selected students? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <h4 className="font-medium mb-2">SMS Preview:</h4>
                          {previewSms && (
                            <>
                              <div className="bg-gray-100 p-3 rounded mb-2">
                                <p className="text-sm font-medium text-gray-700">Segment 1:</p>
                                <p className="mt-1">{previewSms.segment1}</p>
                              </div>
                              {previewSms.segment2 && (
                                <div className="bg-gray-100 p-3 rounded">
                                  <p className="text-sm font-medium text-gray-700">Segment 2:</p>
                                  <p className="mt-1">{previewSms.segment2}</p>
                                </div>
                              )}
                              <div className="mt-3 text-sm">
                                <p>Total Characters: {previewSms.totalCharacters}</p>
                                <p>Segments: {previewSms.segmentCount}</p>
                                {previewSms.operatorWarning && (
                                  <p className="text-red-600 font-medium">{previewSms.operatorWarning}</p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline">Cancel</Button>
                          <Button onClick={handleSendSms}>Send Now</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">SMS Format Guide</h3>
                  <div className="border rounded-lg p-4 bg-gray-50 text-sm">
                    <p className="mb-2"><strong>Segment 1:</strong> [SchoolName] Term 2 Results – John Kato (S2E)</p>
                    <p className="mb-2">Math 78, Eng 65, Bio 72, Chem 70, Geo 68</p>
                    <p className="mb-4">Overall Avg: 70%</p>
                    
                    <p className="mb-2"><strong>Segment 2:</strong> Comment: Steady progress. Improve English.</p>
                    <p>Full Report: https://so.ug/r/Ab3X9P</p>
                    
                    <div className="mt-4 p-3 bg-blue-50 rounded">
                      <p className="font-medium">Requirements:</p>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        <li>Maximum 306 characters for 2 segments</li>
                        <li>Professional and readable format</li>
                        <li>Secure report link included</li>
                        <li>Short, meaningful comments</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.totalClasses || 0}</div>
                <p className="text-xs text-muted-foreground">Classes in system</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.completedClasses || 0}</div>
                <p className="text-xs text-muted-foreground">Classes with all approvals</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.pendingApprovals || 0}</div>
                <p className="text-xs text-muted-foreground">Items awaiting approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Published</CardTitle>
                <SendIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats?.publishedReports || 0}</div>
                <p className="text-xs text-muted-foreground">Report cards published</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Completion Overview</CardTitle>
              <CardDescription>Overall progress of report card completion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2">
                <span>Overall Completion</span>
                <span className="text-lg font-semibold">{dashboardStats?.overallCompletion || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${dashboardStats?.overallCompletion || 0}%` }}
                ></div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded">
                  <h4 className="font-medium text-blue-800">Academic Authority</h4>
                  <p className="text-sm text-blue-600">DoS controls all academic results</p>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-medium text-green-800">Secure Distribution</h4>
                  <p className="text-sm text-green-600">Controlled SMS and links</p>
                </div>
                <div className="bg-purple-50 p-3 rounded">
                  <h4 className="font-medium text-purple-800">Professional Format</h4>
                  <p className="text-sm text-purple-600">Readable 2-segment SMS</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DosResultsManager;