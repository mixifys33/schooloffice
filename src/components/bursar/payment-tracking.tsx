'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { SearchInput } from '@/components/ui/search-input';
import { MultiFilter, FilterConfig, ActiveFilter } from '@/components/ui/multi-filter';
import { 
  Plus, 
  Upload, 
  DollarSign,
  CreditCard,
  Smartphone,
  Building2,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { createThemeStyle } from '@/lib/theme-utils';

interface Payment extends Record<string, unknown> {
  id: string;
  receiptNumber: string;
  studentName: string;
  studentClass: string;
  guardianName: string;
  amount: number;
  method: string;
  reference: string;
  status: string;
  receivedBy: string;
  receivedAt: string;
  balanceBefore: number;
  balanceAfter: number;
}

interface PaymentSummary {
  totalPayments: number;
  totalAmount: number;
  pendingCount: number;
  pendingAmount: number;
  todayCount: number;
  todayAmount: number;
  methodBreakdown: Array<{
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
}

export function PaymentTracking() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  const filterConfigs: FilterConfig[] = [
    {
      key: 'method',
      label: 'Method',
      placeholder: 'Payment Method',
      options: [
        { value: 'CASH', label: 'Cash' },
        { value: 'MOBILE_MONEY', label: 'Mobile Money' },
        { value: 'BANK', label: 'Bank Transfer' },
        { value: 'CARD', label: 'Card Payment' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      placeholder: 'Payment Status',
      options: [
        { value: 'CONFIRMED', label: 'Confirmed' },
        { value: 'PENDING', label: 'Pending' }
      ]
    },
    {
      key: 'dateRange',
      label: 'Period',
      placeholder: 'Time Period',
      options: [
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' }
      ]
    }
  ];

  const fetchPaymentData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query parameters from active filters
      const params = new URLSearchParams();
      activeFilters.forEach(filter => {
        params.append(filter.key, filter.value);
      });
      
      // Fetch real payment data from API
      const response = await fetch(`/api/bursar/payments?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payment data');
      }
      
      const data = await response.json();
      setSummary(data.summary);
      setPayments(data.payments);
      
    } catch (error) {
      console.error('Error fetching payment data:', error);
      // Set empty state on error
      setSummary({
        totalPayments: 0,
        totalAmount: 0,
        pendingCount: 0,
        pendingAmount: 0,
        todayCount: 0,
        todayAmount: 0,
        methodBreakdown: []
      });
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  useEffect(() => {
    fetchPaymentData();
  }, [fetchPaymentData]);

  const handleFilterChange = (key: string, value: string) => {
    const filterConfig = filterConfigs.find(f => f.key === key);
    const option = filterConfig?.options.find(o => o.value === value);
    
    if (filterConfig && option) {
      const newFilter: ActiveFilter = {
        key,
        value,
        label: filterConfig.label,
        displayValue: option.label
      };
      
      setActiveFilters(prev => [
        ...prev.filter(f => f.key !== key),
        newFilter
      ]);
    }
  };

  const handleFilterRemove = (key: string) => {
    setActiveFilters(prev => prev.filter(f => f.key !== key));
  };

  const handleClearAllFilters = () => {
    setActiveFilters([]);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH': return <DollarSign className="h-4 w-4" />;
      case 'MOBILE_MONEY': return <Smartphone className="h-4 w-4" />;
      case 'BANK': return <Building2 className="h-4 w-4" />;
      case 'CARD': return <CreditCard className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const paymentColumns: Column<Payment>[] = [
    {
      key: 'receiptNumber',
      header: 'Receipt',
      primary: true,
      render: (_, row) => (
        <div>
          <p className="font-medium">{row.receiptNumber}</p>
          <p className="text-sm" style={createThemeStyle.text('secondary')}>
            {new Date(row.receivedAt).toLocaleDateString()}
          </p>
        </div>
      )
    },
    {
      key: 'studentName',
      header: 'Student',
      render: (_, row) => (
        <div>
          <p className="font-medium">{row.studentName}</p>
          <p className="text-sm" style={createThemeStyle.text('secondary')}>{row.studentClass}</p>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (_, row) => (
        <div>
          <p className="font-bold text-lg">KES {row.amount.toLocaleString()}</p>
        </div>
      )
    },
    {
      key: 'method',
      header: 'Method',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          {getPaymentMethodIcon(row.method as string)}
          <Badge variant="outline">{row.method}</Badge>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => (
        <Badge variant="outline" style={createThemeStyle.alert('success')}>
          <CheckCircle className="h-3 w-3 mr-1" />
          {row.status}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Payment Tracking</h2>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-8 w-8" style={{ color: 'var(--success)' }} />
              <div>
                <p className="text-sm" style={createThemeStyle.text('secondary')}>Total Payments</p>
                <p className="text-2xl font-bold">{summary.totalPayments}</p>
                <p className="text-sm" style={{ color: 'var(--success)' }}>KES {summary.totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8" style={{ color: 'var(--warning)' }} />
              <div>
                <p className="text-sm" style={createThemeStyle.text('secondary')}>Pending</p>
                <p className="text-2xl font-bold">{summary.pendingCount}</p>
                <p className="text-sm" style={{ color: 'var(--warning)' }}>KES {summary.pendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8" style={{ color: 'var(--info)' }} />
              <div>
                <p className="text-sm" style={createThemeStyle.text('secondary')}>Today</p>
                <p className="text-2xl font-bold">{summary.todayCount}</p>
                <p className="text-sm" style={{ color: 'var(--info)' }}>KES {summary.todayAmount.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-8 w-8" style={{ color: 'var(--danger)' }} />
              <div>
                <p className="text-sm" style={createThemeStyle.text('secondary')}>Issues</p>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm" style={{ color: 'var(--danger)' }}>Need attention</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Payment Records</h3>
            <div className="flex space-x-4">
              <SearchInput
                placeholder="Search payments..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>
          </div>
          
          <MultiFilter
            filters={filterConfigs}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onFilterRemove={handleFilterRemove}
            onClearAll={handleClearAllFilters}
            className="mb-4"
          />
          
          <DataTable
            columns={paymentColumns}
            data={payments}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyMessage="No payments found"
          />
        </div>
      </Card>
    </div>
  );
}