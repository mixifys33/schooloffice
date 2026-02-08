'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { MultiFilter } from '@/components/ui/multi-filter';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Send,
  Calculator,
  Target,
  TrendingUp,
  TrendingDown,
  Eye,
  Filter,
  Settings,
  RefreshCw,
  CreditCard,
  Percent,
  Gift,
  BookOpen,
  Bus,
  Utensils,
  Shirt,
  Activity
} from 'lucide-react';

interface FeeStructure {
  id: string;
  name: string;
  description: string;
  amount: number;
  type: 'TUITION' | 'TRANSPORT' | 'MEALS' | 'UNIFORM' | 'BOOKS' | 'ACTIVITIES' | 'OTHER';
  frequency: 'TERMLY' | 'MONTHLY' | 'ANNUALLY' | 'ONE_TIME';
  mandatory: boolean;
  classes: string[];
  dueDate: string;
  status: 'ACTIVE' | 'INACTIVE';
  studentsCount: number;
  createdAt: string;
  updatedAt: string;
}

interface StudentFee {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  feeStructureId: string;
  feeName: string;
  amount: number;
  amountPaid: number;
  amountOutstanding: number;
  dueDate: string;
  status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'PENDING';
  lastPaymentDate?: string;
  discountApplied?: number;
  scholarshipApplied?: number;
  paymentHistory: Array<{
    id: string;
    amount: number;
    date: string;
    method: string;
    reference: string;
  }>;
}

interface Discount {
  id: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  description: string;
  eligibilityCriteria: string;
  maxStudents?: number;
  currentStudents: number;
  validFrom: string;
  validTo: string;
  status: 'ACTIVE' | 'INACTIVE';
  requiresApproval: boolean;
}

interface FeeAnalytics {
  totalFeeStructures: number;
  totalStudentsWithFees: number;
  totalOutstanding: number;
  totalCollected: number;
  collectionRate: number;
  overdueCount: number;
  discountUsage: number;
  feeTypeBreakdown: Array<{
    type: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
}

export function EnhancedFeeManagement() {
  const [activeTab, setActiveTab] = useState('structures');
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [analytics, setAnalytics] = useState<FeeAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    class: '',
    status: '',
    feeType: '',
    term: 'current',
    paymentStatus: '',
    discountType: ''
  });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [filters, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const endpoints = {
        structures: '/api/bursar/fee-structures',
        'student-fees': '/api/bursar/student-fees',
        discounts: '/api/bursar/discounts',
        analytics: '/api/bursar/fee-analytics'
      };

      const promises = [
        fetch(endpoints.structures),
        fetch(`${endpoints['student-fees']}?${new URLSearchParams(filters)}`),
        fetch(endpoints.discounts),
        fetch(endpoints.analytics)
      ];

      const [structuresRes, studentFeesRes, discountsRes, analyticsRes] = await Promise.all(promises);
      
      const [structures, studentFeesData, discountsData, analyticsData] = await Promise.all([
        structuresRes.json(),
        studentFeesRes.json(),
        discountsRes.json(),
        analyticsRes.json()
      ]);

      setFeeStructures(structures);
      setStudentFees(studentFeesData);
      setDiscounts(discountsData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching fee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFeeStructure = async (data: Partial<FeeStructure>) => {
    try {
      const response = await fetch('/api/bursar/fee-structures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        fetchData();
        setShowCreateDialog(false);
      }
    } catch (error) {
      console.error('Error creating fee structure:', error);
    }
  };

  const handleBulkAction = async (action: string, items: string[]) => {
    try {
      const response = await fetch('/api/bursar/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, items, type: activeTab })
      });

      if (response.ok) {
        fetchData();
        setSelectedItems([]);
        setShowBulkActionDialog(false);
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  const getFeeTypeIcon = (type: string) => {
    switch (type) {
      case 'TUITION': return <BookOpen className="h-4 w-4" />;
      case 'TRANSPORT': return <Bus className="h-4 w-4" />;
      case 'MEALS': return <Utensils className="h-4 w-4" />;
      case 'UNIFORM': return <Shirt className="h-4 w-4" />;
      case 'BOOKS': return <FileText className="h-4 w-4" />;
      case 'ACTIVITIES': return <Activity className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-[var(--success-light)] text-[var(--success-dark)]';
      case 'PARTIAL': return 'bg-[var(--warning-light)] text-[var(--warning-dark)]';
      case 'OVERDUE': return 'bg-[var(--danger-light)] text-[var(--danger-dark)]';
      case 'PENDING': return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
      case 'ACTIVE': return 'bg-[var(--success-light)] text-[var(--success-dark)]';
      case 'INACTIVE': return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
      default: return 'bg-[var(--bg-surface)] text-[var(--text-primary)]';
    }
  };

  const feeStructureColumns = [
    {
      header: 'Fee Details',
      accessorKey: 'name',
      cell: ({ row }: any) => (
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-[var(--info-light)] rounded-lg">
            {getFeeTypeIcon(row.original.type)}
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-sm text-[var(--text-muted)]">{row.original.description}</p>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {row.original.frequency}
              </Badge>
              {row.original.mandatory && (
                <Badge variant="secondary" className="text-xs bg-[var(--danger-light)] text-[var(--danger-dark)]">
                  Mandatory
                </Badge>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: ({ row }: any) => (
        <div className="text-right">
          <span className="font-bold text-lg">UGX {row.original.amount.toLocaleString()}</span>
          <p className="text-sm text-[var(--text-muted)]">{row.original.frequency.toLowerCase()}</p>
        </div>
      )
    },
    {
      header: 'Coverage',
      accessorKey: 'classes',
      cell: ({ row }: any) => (
        <div>
          <div className="flex flex-wrap gap-1 mb-1">
            {row.original.classes.slice(0, 2).map((cls: string) => (
              <Badge key={cls} variant="outline" className="text-xs">
                {cls}
              </Badge>
            ))}
            {row.original.classes.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{row.original.classes.length - 2} more
              </Badge>
            )}
          </div>
          <p className="text-sm text-[var(--text-muted)]">{row.original.studentsCount} students</p>
        </div>
      )
    },
    {
      header: 'Due Date',
      accessorKey: 'dueDate',
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-sm">
            {row.original.dueDate ? new Date(row.original.dueDate).toLocaleDateString() : 'Not set'}
          </span>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: any) => (
        <Badge className={getStatusColor(row.original.status)}>
          {row.original.status}
        </Badge>
      )
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingItem(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => console.log('View details', row.original.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-[var(--chart-red)] hover:text-[var(--danger-dark)]"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const studentFeeColumns = [
    {
      header: 'Student',
      accessorKey: 'studentName',
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.studentName}</p>
          <p className="text-sm text-[var(--text-muted)]">{row.original.studentClass}</p>
        </div>
      )
    },
    {
      header: 'Fee Type',
      accessorKey: 'feeName',
      cell: ({ row }: any) => (
        <div className="flex items-center space-x-2">
          {getFeeTypeIcon('TUITION')}
          <span className="font-medium">{row.original.feeName}</span>
        </div>
      )
    },
    {
      header: 'Financial Summary',
      accessorKey: 'amount',
      cell: ({ row }: any) => (
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Total:</span>
            <span className="font-medium">UGX {row.original.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Paid:</span>
            <span className="text-[var(--chart-green)] font-medium">
              UGX {row.original.amountPaid.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Outstanding:</span>
            <span className={`font-medium ${
              row.original.amountOutstanding > 0 ? 'text-[var(--chart-red)]' : 'text-[var(--chart-green)]'
            }`}>
              UGX {row.original.amountOutstanding.toLocaleString()}
            </span>
          </div>
          {(row.original.discountApplied || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Discount:</span>
              <span className="text-[var(--chart-blue)] font-medium">
                -UGX {row.original.discountApplied.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Payment Progress',
      accessorKey: 'progress',
      cell: ({ row }: any) => {
        const progress = (row.original.amountPaid / row.original.amount) * 100;
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-[var(--bg-surface)] rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  progress === 100 ? 'bg-[var(--success)]' : 
                  progress > 50 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'
                }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
          </div>
        );
      }
    },
    {
      header: 'Due Date & Status',
      accessorKey: 'dueDate',
      cell: ({ row }: any) => {
        const dueDate = new Date(row.original.dueDate);
        const isOverdue = dueDate < new Date() && row.original.amountOutstanding > 0;
        
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
              <span className={`text-sm ${isOverdue ? 'text-[var(--chart-red)]' : ''}`}>
                {dueDate.toLocaleDateString()}
              </span>
            </div>
            <Badge className={getStatusColor(row.original.status)}>
              <div className="flex items-center space-x-1">
                {row.original.status === 'PAID' && <CheckCircle className="h-3 w-3" />}
                {row.original.status === 'PARTIAL' && <Clock className="h-3 w-3" />}
                {row.original.status === 'OVERDUE' && <AlertCircle className="h-3 w-3" />}
                {row.original.status === 'PENDING' && <Clock className="h-3 w-3" />}
                <span>{row.original.status}</span>
              </div>
            </Badge>
          </div>
        );
      }
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex flex-col space-y-1">
          <Button variant="ghost" size="sm" className="justify-start">
            <CreditCard className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
          <Button variant="ghost" size="sm" className="justify-start">
            <Percent className="h-4 w-4 mr-2" />
            Apply Discount
          </Button>
          <Button variant="ghost" size="sm" className="justify-start">
            <Send className="h-4 w-4 mr-2" />
            Send Reminder
          </Button>
          <Button variant="ghost" size="sm" className="justify-start">
            <Eye className="h-4 w-4 mr-2" />
            View History
          </Button>
        </div>
      )
    }
  ];

  const discountColumns = [
    {
      header: 'Discount Details',
      accessorKey: 'name',
      cell: ({ row }: any) => (
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-[var(--info-light)] rounded-lg">
            <Gift className="h-4 w-4 text-[var(--chart-purple)]" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-sm text-[var(--text-muted)]">{row.original.description}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{row.original.eligibilityCriteria}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Value & Type',
      accessorKey: 'value',
      cell: ({ row }: any) => (
        <div className="text-center">
          <div className="text-lg font-bold text-[var(--chart-purple)]">
            {row.original.type === 'PERCENTAGE' 
              ? `${row.original.value}%` 
              : `UGX ${row.original.value.toLocaleString()}`
            }
          </div>
          <Badge variant="outline" className="text-xs mt-1">
            {row.original.type === 'PERCENTAGE' ? 'Percentage' : 'Fixed Amount'}
          </Badge>
          {row.original.maxAmount && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Max: UGX {row.original.maxAmount.toLocaleString()}
            </p>
          )}
        </div>
      )
    },
    {
      header: 'Usage Statistics',
      accessorKey: 'currentStudents',
      cell: ({ row }: any) => (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">Students:</span>
            <span className="font-medium">
              {row.original.currentStudents}
              {row.original.maxStudents && ` / ${row.original.maxStudents}`}
            </span>
          </div>
          {row.original.maxStudents && (
            <div className="w-full bg-[var(--bg-surface)] rounded-full h-2">
              <div 
                className="h-2 bg-[var(--info)] rounded-full"
                style={{ 
                  width: `${Math.min((row.original.currentStudents / row.original.maxStudents) * 100, 100)}%` 
                }}
              ></div>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <TrendingUp className="h-3 w-3 text-[var(--success)]" />
            <span className="text-xs text-[var(--text-muted)]">Active usage</span>
          </div>
        </div>
      )
    },
    {
      header: 'Validity Period',
      accessorKey: 'validFrom',
      cell: ({ row }: any) => (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="text-[var(--text-secondary)]">From:</span> {new Date(row.original.validFrom).toLocaleDateString()}
          </div>
          <div className="text-sm">
            <span className="text-[var(--text-secondary)]">To:</span> {new Date(row.original.validTo).toLocaleDateString()}
          </div>
          <div className="flex items-center space-x-1 mt-2">
            <div className={`w-2 h-2 rounded-full ${
              new Date() >= new Date(row.original.validFrom) && new Date() <= new Date(row.original.validTo)
                ? 'bg-[var(--success)]' : 'bg-[var(--border-default)]'
            }`}></div>
            <span className="text-xs text-[var(--text-muted)]">
              {new Date() >= new Date(row.original.validFrom) && new Date() <= new Date(row.original.validTo)
                ? 'Currently valid' : 'Not active'}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Status & Approval',
      accessorKey: 'status',
      cell: ({ row }: any) => (
        <div className="space-y-2">
          <Badge className={getStatusColor(row.original.status)}>
            {row.original.status}
          </Badge>
          {row.original.requiresApproval && (
            <div className="flex items-center space-x-1">
              <AlertCircle className="h-3 w-3 text-[var(--warning)]" />
              <span className="text-xs text-[var(--chart-yellow)]">Requires approval</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Users className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-[var(--chart-red)]">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">Fee Management</h2>
          <p className="text-[var(--text-secondary)] mt-1">
            Comprehensive fee structure and payment management
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Fees
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          {selectedItems.length > 0 && (
            <Button variant="outline" onClick={() => setShowBulkActionDialog(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Bulk Actions ({selectedItems.length})
            </Button>
          )}
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Fee Structure
          </Button>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[var(--info-light)] rounded-lg">
                <FileText className="h-6 w-6 text-[var(--chart-blue)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Fee Structures</p>
                <p className="text-2xl font-bold">{analytics.totalFeeStructures}</p>
                <p className="text-xs text-[var(--text-muted)]">Active structures</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[var(--success-light)] rounded-lg">
                <Users className="h-6 w-6 text-[var(--chart-green)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Students with Fees</p>
                <p className="text-2xl font-bold">{analytics.totalStudentsWithFees}</p>
                <p className="text-xs text-[var(--chart-green)]">
                  {analytics.collectionRate.toFixed(1)}% collection rate
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[var(--danger-light)] rounded-lg">
                <AlertCircle className="h-6 w-6 text-[var(--chart-red)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Outstanding</p>
                <p className="text-2xl font-bold text-[var(--chart-red)]">
                  UGX {analytics.totalOutstanding.toLocaleString()}
                </p>
                <p className="text-xs text-[var(--chart-red)]">{analytics.overdueCount} overdue</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[var(--info-light)] rounded-lg">
                <Gift className="h-6 w-6 text-[var(--chart-purple)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Discounts Applied</p>
                <p className="text-2xl font-bold">{analytics.discountUsage}</p>
                <p className="text-xs text-[var(--chart-purple)]">Active discounts</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="structures" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Fee Structures</span>
          </TabsTrigger>
          <TabsTrigger value="student-fees" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Student Fees</span>
          </TabsTrigger>
          <TabsTrigger value="discounts" className="flex items-center space-x-2">
            <Gift className="h-4 w-4" />
            <span>Discounts & Scholarships</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structures" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Fee Structures Management
              </h3>
              <div className="flex space-x-4">
                <SearchInput
                  placeholder="Search fee structures..."
                  value={searchTerm}
                  onChange={setSearchTerm}
                />
                <MultiFilter
                  filters={[
                    { 
                      key: 'feeType', 
                      label: 'Fee Type', 
                      options: ['TUITION', 'TRANSPORT', 'MEALS', 'UNIFORM', 'BOOKS', 'ACTIVITIES', 'OTHER'] 
                    },
                    { 
                      key: 'frequency', 
                      label: 'Frequency', 
                      options: ['TERMLY', 'MONTHLY', 'ANNUALLY', 'ONE_TIME'] 
                    },
                    { 
                      key: 'status', 
                      label: 'Status', 
                      options: ['ACTIVE', 'INACTIVE'] 
                    }
                  ]}
                  values={filters}
                  onChange={setFilters}
                />
              </div>
            </div>
            <DataTable
              columns={feeStructureColumns}
              data={feeStructures}
              loading={loading}
              onSelectionChange={setSelectedItems}
            />
          </Card>
        </TabsContent>

        <TabsContent value="student-fees" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Student Fee Records
              </h3>
              <div className="flex space-x-4">
                <SearchInput
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={setSearchTerm}
                />
                <MultiFilter
                  filters={[
                    { key: 'class', label: 'Class', options: ['Grade 1', 'Grade 2', 'Grade 3'] },
                    { key: 'paymentStatus', label: 'Payment Status', options: ['PAID', 'PARTIAL', 'OVERDUE', 'PENDING'] },
                    { key: 'term', label: 'Term', options: ['current', 'term-1', 'term-2', 'term-3'] }
                  ]}
                  values={filters}
                  onChange={setFilters}
                />
              </div>
            </div>
            <DataTable
              columns={studentFeeColumns}
              data={studentFees}
              loading={loading}
              onSelectionChange={setSelectedItems}
            />
          </Card>
        </TabsContent>

        <TabsContent value="discounts" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center">
                <Gift className="h-5 w-5 mr-2" />
                Discounts & Scholarships
              </h3>
              <div className="flex space-x-4">
                <SearchInput
                  placeholder="Search discounts..."
                  value={searchTerm}
                  onChange={setSearchTerm}
                />
                <MultiFilter
                  filters={[
                    { key: 'discountType', label: 'Type', options: ['PERCENTAGE', 'FIXED_AMOUNT'] },
                    { key: 'status', label: 'Status', options: ['ACTIVE', 'INACTIVE'] }
                  ]}
                  values={filters}
                  onChange={setFilters}
                />
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Discount
                </Button>
              </div>
            </div>
            <DataTable
              columns={discountColumns}
              data={discounts}
              loading={loading}
              onSelectionChange={setSelectedItems}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Fee Type Breakdown Chart */}
      {analytics && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Fee Type Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics.feeTypeBreakdown.map((item, index) => (
              <div key={item.type} className="p-4 bg-[var(--bg-surface)] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getFeeTypeIcon(item.type)}
                    <span className="font-medium text-sm">{item.type}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.percentage.toFixed(1)}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold">UGX {item.amount.toLocaleString()}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{item.count} structures</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}