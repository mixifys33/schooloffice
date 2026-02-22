'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Users,
  Eye,
  Send,
  Loader2
} from 'lucide-react';

interface FinancialSummaryData {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  unpaidStudents: Array<{
    id: string;
    name: string;
    class: string;
    balance: number;
    phone?: string;
  }>;
}

interface FinancialSummaryProps {
  schoolId?: string;
  termId?: string;
  className?: string;
  showActions?: boolean;
}

export function FinancialSummary({ 
  schoolId, 
  termId, 
  className = "",
  showActions = true 
}: FinancialSummaryProps) {
  const router = useRouter()
  const [data, setData] = useState<FinancialSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    fetchFinancialSummary();
  }, [schoolId, termId]);

  const fetchFinancialSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (schoolId) params.append('schoolId', schoolId);
      if (termId) params.append('termId', termId);
      
      const response = await fetch(`/api/finance/summary?${params.toString()}`);
      
      if (!response.ok) {
        // Try to get error details
        let errorMessage = 'Failed to fetch financial summary';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      
      // Ensure we have valid data structure
      const validatedResult = {
        totalExpected: result.totalExpected || 0,
        totalCollected: result.totalCollected || 0,
        totalOutstanding: result.totalOutstanding || 0,
        collectionRate: result.collectionRate || 0,
        unpaidStudents: result.unpaidStudents || []
      };
      
      setData(validatedResult);
    } catch (err) {
      console.error('Error fetching financial summary:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unable to load financial data';
      setError(errorMessage);
      
      // Set empty data as fallback
      setData({
        totalExpected: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        collectionRate: 0,
        unpaidStudents: []
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`;
  };

  const getCollectionRateColor = (rate: number) => {
    if (rate >= 90) return 'text-[var(--chart-green)] bg-[var(--success-light)]';
    if (rate >= 70) return 'text-[var(--chart-yellow)] bg-[var(--warning-light)]';
    return 'text-[var(--chart-red)] bg-[var(--danger-light)]';
  };

  const handleViewDetails = () => {
    setNavigating(true)
    // Navigate to admin-specific financial overview page
    router.push('/dashboard/school-admin/financial-overview')
  }

  const handleSendReminders = async () => {
    if (!displayData.unpaidStudents.length) {
      alert('No unpaid students to send reminders to')
      return
    }

    if (!confirm(`Send payment reminders to ${displayData.unpaidStudents.length} students with outstanding fees?`)) {
      return
    }

    try {
      setSendingReminders(true)

      const response = await fetch('/api/bursar/send-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentIds: displayData.unpaidStudents.map(s => s.id)
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send reminders')
      }

      const result = await response.json()
      
      alert(`Successfully sent ${result.sent || 0} payment reminders!`)
    } catch (err) {
      console.error('Error sending reminders:', err)
      alert(err instanceof Error ? err.message : 'Failed to send reminders')
    } finally {
      setSendingReminders(false)
    }
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-[var(--bg-surface)] rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-[var(--bg-surface)] rounded w-2/3"></div>
                <div className="h-8 bg-[var(--bg-surface)] rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (error && !data) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center">
          <AlertTriangle 
            className="h-8 w-8 mx-auto mb-2" 
            style={{ color: 'var(--danger)' }}
          />
          <p 
            className="mb-4"
            style={{ color: 'var(--danger-dark)' }}
          >
            {error}
          </p>
          <Button onClick={fetchFinancialSummary} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  // Show the component even if there was an error but we have fallback data
  const displayData = data || {
    totalExpected: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    collectionRate: 0,
    unpaidStudents: []
  };

  return (
    <Card className={`p-6 ${className}`}>
      {/* Show error banner if there was an error but we're displaying fallback data */}
      {error && (
        <div 
          className="mb-4 p-3 border rounded-lg"
          style={{
            backgroundColor: 'var(--warning-light)',
            borderColor: 'var(--warning)',
            color: 'var(--warning-dark)'
          }}
        >
          <div className="flex items-center">
            <AlertTriangle 
              className="h-4 w-4 mr-2" 
              style={{ color: 'var(--warning)' }}
            />
            <p 
              className="text-sm"
              style={{ color: 'var(--warning-dark)' }}
            >
              {error}
            </p>
            <Button onClick={fetchFinancialSummary} variant="outline" size="sm" className="ml-auto">
              Retry
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Financial Overview</h3>
        {showActions && (
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleViewDetails}
              disabled={navigating}
            >
              {navigating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Details
                </>
              )}
            </Button>
            {displayData.unpaidStudents.length > 0 && (
              <Button 
                size="sm"
                onClick={handleSendReminders}
                disabled={sendingReminders}
              >
                {sendingReminders ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Reminders
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Key Financial Metrics - The 4 Essential Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-[var(--info-light)] rounded-lg">
          <DollarSign className="h-6 w-6 text-[var(--chart-blue)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-secondary)] mb-1">Total Expected</p>
          <p className="text-xl font-bold text-[var(--info-dark)]">
            {formatCurrency(displayData.totalExpected)}
          </p>
        </div>

        <div className="text-center p-4 bg-[var(--success-light)] rounded-lg">
          <TrendingUp className="h-6 w-6 text-[var(--chart-green)] mx-auto mb-2" />
          <p className="text-sm text-[var(--text-secondary)] mb-1">Total Collected</p>
          <p className="text-xl font-bold text-[var(--success-dark)]">
            {formatCurrency(displayData.totalCollected)}
          </p>
        </div>

        <div 
          className="text-center p-4 rounded-lg"
          style={{
            backgroundColor: 'var(--warning-light)',
            color: 'var(--warning-dark)'
          }}
        >
          <AlertTriangle 
            className="h-6 w-6 mx-auto mb-2" 
            style={{ color: 'var(--warning)' }}
          />
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Total Outstanding</p>
          <p 
            className="text-xl font-bold"
            style={{ color: 'var(--warning-dark)' }}
          >
            {formatCurrency(displayData.totalOutstanding)}
          </p>
        </div>

        <div className="text-center p-4 bg-[var(--bg-surface)] rounded-lg">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCollectionRateColor(displayData.collectionRate)}`}>
            {displayData.collectionRate.toFixed(1)}%
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-2">Collection Rate</p>
        </div>
      </div>

      {/* Unpaid Students List - Critical for Action */}
      {displayData.unpaidStudents.length > 0 && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-[var(--text-primary)] flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Students with Outstanding Fees ({displayData.unpaidStudents.length})
            </h4>
            <Badge variant="outline" className="text-[var(--chart-red)] border-[var(--danger-light)]">
              Action Required
            </Badge>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {displayData.unpaidStudents.slice(0, 10).map((student) => (
              <div key={student.id} className="flex items-center justify-between p-3 bg-[var(--danger-light)] rounded-lg">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{student.name}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{student.class}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[var(--chart-red)]">
                    {formatCurrency(student.balance)}
                  </p>
                  {student.phone && (
                    <p className="text-xs text-[var(--text-muted)]">{student.phone}</p>
                  )}
                </div>
              </div>
            ))}
            
            {displayData.unpaidStudents.length > 10 && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm">
                  View All {displayData.unpaidStudents.length} Students
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {displayData.unpaidStudents.length === 0 && (
        <div className="border-t pt-4 text-center">
          <div className="text-[var(--chart-green)] bg-[var(--success-light)] rounded-lg p-4">
            <TrendingUp className="h-6 w-6 mx-auto mb-2" />
            <p className="font-medium">All fees collected!</p>
            <p className="text-sm text-[var(--chart-green)] mt-1">No outstanding balances</p>
          </div>
        </div>
      )}
    </Card>
  );
}