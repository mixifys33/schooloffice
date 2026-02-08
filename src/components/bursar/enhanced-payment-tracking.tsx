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
  Download, 
  Upload, 
  CreditCard,
  Smartphone,
  Banknote,
  Building,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Eye,
  Edit,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
  Settings,
  Send,
  Receipt,
  DollarSign,
  Users,
  Target,
  Zap,
  Shield,
  AlertTriangle,
  FileText,
  Search
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  feeId: string;
  feeName: string;
  amount: number;
  paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD';
  transactionReference: string;
  paymentDate: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED';
  reconciliationStatus: 'RECONCILED' | 'PENDING' | 'DISCREPANCY';
  receiptNumber: string;
  notes?: string;
  processedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentSummary {
  totalPayments: number;
  totalAmount: number;
  pendingReconciliation: number;
  failedPayments: number;
  averagePaymentAmount: number;
  paymentsByMethod: Array<{
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
  dailyTrend: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
  recentPayments: Payment[];
}

interface ReconciliationItem {
  id: string;
  paymentId: string;
  studentName: string;
  expectedAmount: number;
  recordedAmount: number;
  difference: number;
  paymentMethod: string;
  transactionReference: string;
  status: 'PENDING' | 'RESOLVED' | 'DISPUTED';
  notes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

interface PaymentAnalytics {
  collectionEfficiency: number;
  reconciliationRate: number;
  averageProcessingTime: number;
}
