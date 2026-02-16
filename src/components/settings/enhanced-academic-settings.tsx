'use client';

import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Trash2, Save, AlertCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

// Types
interface AcademicYear {
  id: string;
  name: string;
  startDate: string; // Using string for API compatibility
  endDate: string;
  isActive: boolean;
  terms?: Term[]; // Making terms optional to handle cases where API doesn't return it
}

interface Term {
  id: string;
  name: string;
  startDate: string; // Using string for API compatibility
  endDate: string;
  weekCount: number;
  academicYearId: string;
  holidayInfo?: {
    startDate: string;
    endDate: string;
    weekCount: number;
  };
}

const EnhancedAcademicSettings = () => {
  const { toast } = useToast();
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [newYearName, setNewYearName] = useState('');
  const [newYearStart, setNewYearStart] = useState('');
  const [newYearEnd, setNewYearEnd] = useState('');
  const [viewDate, setViewDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarField, setCalendarField] = useState<'start' | 'end' | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingYearIds, setDeletingYearIds] = useState<Set<string>>(new Set());
  const [deletingTermIds, setDeletingTermIds] = useState<Set<string>>(new Set());

  // Load academic years from API
  useEffect(() => {
    const fetchAcademicYears = async () => {
      try {
        setLoading(true);
        setErrors(prev => ({ ...prev, fetch: '' })); // Clear previous fetch errors
        
        const response = await fetch('/api/settings/academic-years');
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
          
          // More specific error messages based on status
          let userFriendlyMessage = 'Failed to load academic years. ';
          if (response.status === 401) {
            userFriendlyMessage += 'Please log in again.';
          } else if (response.status === 403) {
            userFriendlyMessage += 'You do not have permission to view academic years.';
          } else if (response.status === 500) {
            userFriendlyMessage += 'Server error. Please contact support.';
          } else {
            userFriendlyMessage += 'Please try again.';
          }
          
          throw new Error(userFriendlyMessage);
        }
        
        const data = await response.json();
        setAcademicYears(data.academicYears || []);

        // Select the active year or the first one if available
        const activeYear = data.academicYears?.find((year: AcademicYear) => year.isActive);
        if (activeYear) {
          setSelectedYear(activeYear.id);
        } else if (data.academicYears && data.academicYears.length > 0) {
          setSelectedYear(data.academicYears[0].id);
        }
      } catch (error) {
        console.error('Error fetching academic years:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        setErrors({ fetch: errorMessage });
      } finally {
        setLoading(false);
      }
    };

    fetchAcademicYears();
  }, []);

  // Calculate week count between two dates
  const calculateWeekCount = (startDate: string, endDate: string): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const diffMs = end.getTime() - start.getTime();
    return Math.ceil(diffMs / msPerWeek);
  };

  // Check if two date ranges overlap
  const datesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
    const s1 = new Date(start1);
    const e1 = new Date(end1);
    const s2 = new Date(start2);
    const e2 = new Date(end2);
    
    // Two intervals overlap if one starts before the other ends and ends after the other starts
    return s1 <= e2 && s2 <= e1;
  };

  // Check if a new academic year would overlap with existing ones
  const checkAcademicYearOverlap = (newStart: string, newEnd: string, excludeId?: string): boolean => {
    return academicYears.some(year => {
      if (excludeId && year.id === excludeId) return false; // Skip the year being edited
      return datesOverlap(newStart, newEnd, year.startDate, year.endDate);
    });
  };

  // Check if a new term would overlap with existing terms in the same academic year
  const checkTermOverlap = (yearId: string, newStart: string, newEnd: string, excludeId?: string): boolean => {
    const year = academicYears.find(y => y.id === yearId);
    if (!year || !year.terms) return false;
    
    return year.terms.some(term => {
      if (excludeId && term.id === excludeId) return false; // Skip the term being edited
      return datesOverlap(newStart, newEnd, term.startDate, term.endDate);
    });
  };

  // Handle date selection from calendar
  const handleDateSelect = (date: Date) => {
    if (calendarField === 'start') {
      setNewYearStart(date.toISOString().split('T')[0]);
    } else if (calendarField === 'end') {
      setNewYearEnd(date.toISOString().split('T')[0]);
    }
    setShowCalendar(false);
    setCalendarField(null);
  };

  // Render calendar component
  const renderCalendar = () => {
    if (!showCalendar) return null;

    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
      <div className="absolute z-50 mt-2 p-4 bg-white border rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={() => setViewDate(subMonths(viewDate, 1))}
            className="p-1 rounded hover:bg-gray-100"
          >
            &lt;
          </button>
          <h3 className="font-semibold">
            {format(viewDate, 'MMMM yyyy')}
          </h3>
          <button 
            onClick={() => setViewDate(addMonths(viewDate, 1))}
            className="p-1 rounded hover:bg-gray-100"
          >
            &gt;
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 p-1">
              {day}
            </div>
          ))}
          {days.map(day => (
            <button
              key={day.toString()}
              onClick={() => handleDateSelect(day)}
              className={`p-2 text-center text-sm rounded ${
                isSameDay(day, new Date()) 
                  ? 'bg-blue-100 border border-blue-300' 
                  : 'hover:bg-gray-100'
              }`}
            >
              {format(day, 'd')}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Add a new academic year
  const handleAddAcademicYear = async () => {
    // Basic validation
    const newErrors: Record<string, string> = {};

    if (!newYearName.trim()) {
      newErrors.name = 'Academic year name is required';
    }

    if (!newYearStart) {
      newErrors.start = 'Start date is required';
    }

    if (!newYearEnd) {
      newErrors.end = 'End date is required';
    }

    if (newYearStart && newYearEnd) {
      const start = new Date(newYearStart);
      const end = new Date(newYearEnd);

      if (start >= end) {
        newErrors.dateRange = 'End date must be after start date';
      } else if (checkAcademicYearOverlap(newYearStart, newYearEnd)) {
        newErrors.dateRange = 'Academic year dates overlap with an existing academic year';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      setErrors(prev => ({ ...prev, addYear: '' })); // Clear previous add year errors
      
      const response = await fetch('/api/settings/academic-years', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newYearName,
          startDate: newYearStart,
          endDate: newYearEnd,
          isActive: academicYears.length === 0, // Make first year active by default
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
        
        // More specific error messages based on status
        let userFriendlyMessage = '';
        if (response.status === 401) {
          userFriendlyMessage = 'Please log in again.';
        } else if (response.status === 403) {
          userFriendlyMessage = 'You do not have permission to create academic years.';
        } else if (response.status === 400) {
          // Check for specific validation errors from the backend
          if (errorData.error && typeof errorData.error === 'string') {
            if (errorData.error.toLowerCase().includes('overlap')) {
              userFriendlyMessage = 'Academic year dates overlap with an existing academic year. Please adjust the dates.';
            } else {
              userFriendlyMessage = errorData.error;
            }
          } else {
            userFriendlyMessage = 'Invalid data provided.';
          }
        } else if (response.status === 500) {
          userFriendlyMessage = 'Server error. Please contact support.';
        } else {
          userFriendlyMessage = 'Failed to create academic year. Please try again.';
        }

        // Show user-friendly toast instead of throwing error
        toast({
          title: 'Error',
          description: userFriendlyMessage,
          variant: 'destructive'
        });
        return;
      }

      const result = await response.json();

      // Show success toast
      toast({
        title: 'Success',
        description: `Academic year "${newYearName}" created successfully!`
      });

      // Refresh the list
      const refreshResponse = await fetch('/api/settings/academic-years');
      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP error! status: ${refreshResponse.status}`;
        
        let userFriendlyMessage = 'Failed to refresh academic years. ';
        if (refreshResponse.status === 401) {
          userFriendlyMessage += 'Please log in again.';
        } else if (refreshResponse.status === 403) {
          userFriendlyMessage += 'You do not have permission to view academic years.';
        } else if (refreshResponse.status === 500) {
          userFriendlyMessage += 'Server error. Please contact support.';
        } else {
          userFriendlyMessage += 'Please try again.';
        }
        
        // Show toast instead of throwing error
        toast({
          title: 'Warning',
          description: userFriendlyMessage
        });
        return;
      }
      
      const data = await refreshResponse.json();
      setAcademicYears(data.academicYears || []);

      // Reset form
      setNewYearName('');
      setNewYearStart('');
      setNewYearEnd('');
      setErrors({});
    } catch (error) {
      console.error('Error creating academic year:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while creating the academic year';
      
      // Show user-friendly toast instead of setting error state
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // State for term form
  const [showTermForm, setShowTermForm] = useState(false);
  const [termFormData, setTermFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  // Handle term form input changes
  const handleTermFormChange = (field: string, value: string) => {
    setTermFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle term form submission
  const handleSubmitTerm = async (yearId: string) => {
    if (!termFormData.name || !termFormData.startDate || !termFormData.endDate) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    const startDate = new Date(termFormData.startDate);
    const endDate = new Date(termFormData.endDate);

    if (startDate >= endDate) {
      toast({
        title: 'Error',
        description: 'Start date must be before end date',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);
      setErrors(prev => ({ ...prev, addTerm: '' }));

      // First refresh academic years to ensure we have latest data
      console.log('[DEBUG] Refreshing academic years before term creation...');
      const refreshResponse = await fetch('/api/settings/academic-years');
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        setAcademicYears(refreshData.academicYears || []);
        console.log('[DEBUG] Academic years refreshed successfully');
      }

      console.log('[DEBUG] Creating term with data:', {
        name: termFormData.name,
        academicYearId: yearId,
        startDate: termFormData.startDate,
        endDate: termFormData.endDate,
      });

      const response = await fetch('/api/settings/terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: termFormData.name,
          academicYearId: yearId,
          startDate: termFormData.startDate,
          endDate: termFormData.endDate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
        
        console.log('[DEBUG] Term creation failed:', errorData);
        
        let userFriendlyMessage = '';
        if (response.status === 401) {
          userFriendlyMessage = 'Please log in again.';
        } else if (response.status === 403) {
          userFriendlyMessage = 'You do not have permission to create terms.';
        } else if (response.status === 400) {
          if (errorData.error && typeof errorData.error === 'string') {
            if (errorData.error.toLowerCase().includes('overlap')) {
              // Enhanced error message with details if available
              if (errorData.details) {
                userFriendlyMessage = `Term dates overlap with existing term "${errorData.details.conflictingTerm}" (${errorData.details.conflictingDates.start} to ${errorData.details.conflictingDates.end}). Please adjust the dates.`;
              } else {
                userFriendlyMessage = 'Term dates overlap with an existing term in the same academic year. Please adjust the dates.';
              }
            } else if (errorData.error.toLowerCase().includes('within the academic year period')) {
              // Handle the specific "Term dates must be within the academic year period" error
              if (errorData.details) {
                const { academicYear, academicYearDates, attemptedDates } = errorData.details;
                userFriendlyMessage = `Term dates must be within the academic year "${academicYear}" period (${academicYearDates.start} to ${academicYearDates.end}). Your selected dates (${attemptedDates.start} to ${attemptedDates.end}) are outside this range.`;
              } else {
                userFriendlyMessage = 'Term dates must be within the academic year period. Please adjust the dates to fall within the academic year.';
              }
            } else {
              userFriendlyMessage = errorData.error;
            }
          } else {
            userFriendlyMessage = 'Invalid data provided.';
          }
        } else if (response.status === 500) {
          userFriendlyMessage = 'Server error. Please contact support.';
        } else {
          userFriendlyMessage = 'Failed to create term. Please try again.';
        }

        // Show user-friendly toast instead of throwing error
        toast({
          title: 'Error',
          description: userFriendlyMessage,
          variant: 'destructive'
        });
        return;
      }

      console.log('[DEBUG] Term created successfully');

      // Show success toast
      toast({
        title: 'Success',
        description: `Term "${termFormData.name}" created successfully!`
      });

      // Refresh the list again after successful creation
      const finalRefreshResponse = await fetch('/api/settings/academic-years');
      if (finalRefreshResponse.ok) {
        const data = await finalRefreshResponse.json();
        setAcademicYears(data.academicYears || []);
        
        // Reset form and close it
        setTermFormData({ name: '', startDate: '', endDate: '' });
        setShowTermForm(false);
        
        // Select the updated year
        setSelectedYear(yearId);
        
        console.log('[DEBUG] Academic years refreshed after term creation');
      }

    } catch (error) {
      console.error('Error creating term:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while creating the term';
      
      // Show user-friendly toast instead of setting error state
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel term form
  const handleCancelTermForm = () => {
    setTermFormData({ name: '', startDate: '', endDate: '' });
    setShowTermForm(false);
    setErrors(prev => ({ ...prev, addTerm: '' }));
  };

  // Add a new term to an academic year (legacy function - keeping for backward compatibility)
  const handleAddTerm = async (yearId: string) => {
    // Show the form instead of auto-creating
    setShowTermForm(true);
    setErrors(prev => ({ ...prev, addTerm: '' }));
    
    // Pre-populate form with suggested values
    const year = academicYears.find(y => y.id === yearId);
    if (year) {
      const termNumber = (year.terms?.length || 0) + 1;
      const termName = `Term ${termNumber}`;
      
      // Default dates - first term starts at year start, others follow previous
      let startDate: string;
      if ((year.terms?.length || 0) === 0) {
        startDate = year.startDate;
      } else {
        const lastTerm = year.terms && year.terms.length > 0 ? year.terms[year.terms.length - 1] : null;
        if (lastTerm) {
          const nextDate = new Date(lastTerm.endDate);
          nextDate.setDate(nextDate.getDate() + 1);
          startDate = nextDate.toISOString().split('T')[0];
        } else {
          startDate = year.startDate;
        }
      }
      
      // Default end date - 12 weeks later
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (12 * 7) - 1);
      
      // Adjust if going past year end
      const yearEndDate = new Date(year.endDate);
      if (endDate > yearEndDate) {
        endDate.setTime(yearEndDate.getTime());
      }
      
      setTermFormData({
        name: termName,
        startDate: startDate,
        endDate: endDate.toISOString().split('T')[0],
      });
    }
  };

  // Original handleAddTerm logic (now unused but kept for reference)
  const handleAddTermLegacy = async (yearId: string) => {
    try {
      setSaving(true);
      setErrors(prev => ({ ...prev, addTerm: '' })); // Clear previous add term errors

      // Determine term name and dates
      const year = academicYears.find(y => y.id === yearId);
      if (!year) {
        throw new Error('Academic year not found');
      }

      const termNumber = (year.terms?.length || 0) + 1;
      const termName = `Term ${termNumber}`;

      // Default dates - first term starts at year start, others follow previous
      let startDate: string;
      if ((year.terms?.length || 0) === 0) {
        startDate = year.startDate;
      } else {
        const lastTerm = year.terms && year.terms.length > 0 ? year.terms[year.terms.length - 1] : null;
        // Add 1 day after last term for holiday
        if (lastTerm) {
          const nextDate = new Date(lastTerm.endDate);
          nextDate.setDate(nextDate.getDate() + 1);
          startDate = nextDate.toISOString().split('T')[0];
        } else {
          // If no terms exist, start from year start date
          startDate = year.startDate;
        }
      }

      // Default end date - 12 weeks later
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (12 * 7) - 1); // 12 weeks minus 1 day

      // Adjust if going past year end
      const yearEndDate = new Date(year.endDate);
      if (endDate > yearEndDate) {
        endDate.setTime(yearEndDate.getTime());
      }

      const response = await fetch('/api/settings/terms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: termName,
          academicYearId: yearId,
          startDate: startDate,
          endDate: endDate.toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
        
        // More specific error messages based on status
        let userFriendlyMessage = '';
        if (response.status === 401) {
          userFriendlyMessage = 'Please log in again.';
        } else if (response.status === 403) {
          userFriendlyMessage = 'You do not have permission to create terms.';
        } else if (response.status === 400) {
          // Check for specific validation errors from the backend
          if (errorData.error && typeof errorData.error === 'string') {
            if (errorData.error.toLowerCase().includes('overlap')) {
              userFriendlyMessage = 'Term dates overlap with an existing term in the same academic year. Please adjust the dates.';
            } else {
              userFriendlyMessage = errorData.error;
            }
          } else {
            userFriendlyMessage = 'Invalid data provided.';
          }
        } else if (response.status === 500) {
          userFriendlyMessage = 'Server error. Please contact support.';
        } else {
          userFriendlyMessage = 'Failed to create term. Please try again.';
        }

        throw new Error(userFriendlyMessage);
      }

      const result = await response.json();

      // Refresh the list
      const refreshResponse = await fetch('/api/settings/academic-years');
      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP error! status: ${refreshResponse.status}`;
        
        let userFriendlyMessage = 'Failed to refresh academic years. ';
        if (refreshResponse.status === 401) {
          userFriendlyMessage += 'Please log in again.';
        } else if (refreshResponse.status === 403) {
          userFriendlyMessage += 'You do not have permission to view academic years.';
        } else if (refreshResponse.status === 500) {
          userFriendlyMessage += 'Server error. Please contact support.';
        } else {
          userFriendlyMessage += 'Please try again.';
        }
        
        throw new Error(userFriendlyMessage);
      }
      
      const data = await refreshResponse.json();
      setAcademicYears(data.academicYears || []);

      // Select the updated year
      setSelectedYear(yearId);
    } catch (error) {
      console.error('Error creating term:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrors({ addTerm: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  // Update term dates
  const handleUpdateTermDates = async (yearId: string, termId: string, field: 'startDate' | 'endDate', value: string) => {
    try {
      setSaving(true);
      setErrors(prev => ({ ...prev, updateTerm: '' })); // Clear previous update term errors

      const term = academicYears
        .find(y => y.id === yearId)
        ?.terms?.find(t => t.id === termId);

      if (!term) {
        toast({
          title: 'Error',
          description: 'Term not found. Please refresh the page and try again.',
          variant: 'destructive'
        });
        return;
      }

      console.log(`[DEBUG] Updating term ${term.name} - ${field}: ${value}`);

      // Prepare complete update data with all required fields
      const updateData = {
        id: termId,
        name: term.name,
        startDate: field === 'startDate' ? value : term.startDate,
        endDate: field === 'endDate' ? value : term.endDate,
        academicYearId: yearId,
      };

      console.log('[DEBUG] Sending update data:', updateData);

      const response = await fetch('/api/settings/terms', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
        
        console.log('[DEBUG] Term update failed:', errorData);
        
        // More specific error messages based on status
        let userFriendlyMessage = 'Failed to update term. ';
        if (response.status === 401) {
          userFriendlyMessage = 'Please log in again.';
        } else if (response.status === 403) {
          userFriendlyMessage = 'You do not have permission to update terms.';
        } else if (response.status === 400) {
          if (errorData.error && typeof errorData.error === 'string') {
            if (errorData.error.toLowerCase().includes('overlap')) {
              // Enhanced error message with details if available
              if (errorData.details) {
                userFriendlyMessage = `Term dates would overlap with existing term "${errorData.details.conflictingTerm}" (${errorData.details.conflictingDates.start} to ${errorData.details.conflictingDates.end}). Please adjust the dates.`;
              } else {
                userFriendlyMessage = 'Term dates would overlap with an existing term in the same academic year. Please adjust the dates.';
              }
            } else if (errorData.error.toLowerCase().includes('within the academic year period')) {
              // Handle the specific "Term dates must be within the academic year period" error
              if (errorData.details) {
                const { academicYear, academicYearDates, attemptedDates } = errorData.details;
                userFriendlyMessage = `Term dates must be within the academic year "${academicYear}" period (${academicYearDates.start} to ${academicYearDates.end}). Your selected dates (${attemptedDates.start} to ${attemptedDates.end}) are outside this range.`;
              } else {
                userFriendlyMessage = 'Term dates must be within the academic year period. Please adjust the dates to fall within the academic year.';
              }
            } else {
              userFriendlyMessage = errorData.error;
            }
          } else {
            userFriendlyMessage = 'Invalid data provided.';
          }
        } else if (response.status === 500) {
          userFriendlyMessage = 'Server error. Please contact support.';
        } else {
          userFriendlyMessage = 'Please try again.';
        }
        
        // Show user-friendly toast instead of throwing error
        toast({
          title: 'Error',
          description: userFriendlyMessage,
          variant: 'destructive'
        });
        return;
      }

      console.log('[DEBUG] Term updated successfully');

      // Show success toast
      toast({
        title: 'Success',
        description: `Term "${term.name}" updated successfully!`
      });

      const result = await response.json();

      // Refresh the list
      const refreshResponse = await fetch('/api/settings/academic-years');
      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP error! status: ${refreshResponse.status}`;
        
        let userFriendlyMessage = 'Failed to refresh academic years. ';
        if (refreshResponse.status === 401) {
          userFriendlyMessage += 'Please log in again.';
        } else if (refreshResponse.status === 403) {
          userFriendlyMessage += 'You do not have permission to view academic years.';
        } else if (refreshResponse.status === 500) {
          userFriendlyMessage += 'Server error. Please contact support.';
        } else {
          userFriendlyMessage += 'Please try again.';
        }
        
        // Show toast instead of throwing error
        toast({
          title: 'Warning',
          description: userFriendlyMessage
        });
        return;
      }
      
      const data = await refreshResponse.json();
      setAcademicYears(data.academicYears || []);
      
      console.log('[DEBUG] Academic years refreshed after term update');
    } catch (error) {
      console.error('Error updating term:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred while updating the term';
      
      // Show user-friendly toast instead of setting error state
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete a term
  const handleDeleteTerm = async (yearId: string, termId: string) => {
    // Get term name for better confirmation message
    const term = academicYears
      .find(y => y.id === yearId)
      ?.terms?.find(t => t.id === termId);
    
    const termName = term?.name || 'this term';
    
    // Professional confirmation dialog
    const confirmed = window.confirm(
      `Delete ${termName}?\n\n` +
      `This will permanently delete the term. If the term has associated records ` +
      `(CA entries, exam entries, payments, etc.), you'll need to remove those first.\n\n` +
      `Are you sure you want to continue?`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      // Add to deleting set to show loading indicator
      setDeletingTermIds(prev => new Set(prev).add(termId));
      setErrors(prev => ({ ...prev, deleteTerm: '' })); // Clear previous delete term errors

      const response = await fetch(`/api/settings/terms?id=${termId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle different error scenarios professionally
        if (response.status === 401) {
          setErrors({ deleteTerm: 'Your session has expired. Please log in again to continue.' });
          return;
        } else if (response.status === 403) {
          setErrors({ deleteTerm: 'You do not have permission to delete terms. Please contact your administrator.' });
          return;
        } else if (response.status === 400) {
          // This is the "has associated data" error - make it user-friendly
          const errorMsg = errorData.error || 'Invalid data provided.';
          
          // Check if it's a dependency error
          if (errorMsg.includes('associated data')) {
            setErrors({ 
              deleteTerm: errorMsg // Use the detailed message from API
            });
          } else {
            setErrors({ deleteTerm: errorMsg });
          }
          return;
        } else if (response.status === 500) {
          setErrors({ deleteTerm: 'A server error occurred. Our team has been notified. Please try again later or contact support if the issue persists.' });
          return;
        } else {
          setErrors({ deleteTerm: 'Unable to delete term. Please try again or contact support if the issue persists.' });
          return;
        }
      }

      const result = await response.json();

      // Refresh the list
      const refreshResponse = await fetch('/api/settings/academic-years');
      if (!refreshResponse.ok) {
        setErrors({ deleteTerm: 'Term deleted, but failed to refresh the list. Please refresh the page manually.' });
        return;
      }
      
      const data = await refreshResponse.json();
      setAcademicYears(data.academicYears || []);
      
      // Show success message
      toast({
        title: 'Success',
        description: 'Term deleted successfully'
      });
    } catch (error) {
      // Only log to console for debugging, don't show raw error to user
      console.error('[Academic Settings] Error deleting term:', error);
      setErrors({ 
        deleteTerm: 'An unexpected error occurred while deleting the term. Please try again or contact support if the issue persists.' 
      });
    } finally {
      // Remove from deleting set to hide loading indicator
      setDeletingTermIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(termId);
        return newSet;
      });
    }
  };

  // Set an academic year as active
  const handleSetActiveYear = async (yearId: string) => {
    try {
      setSaving(true);
      setErrors(prev => ({ ...prev, setActive: '' })); // Clear previous set active errors

      // Get the year to update
      const year = academicYears.find(y => y.id === yearId);
      if (!year) {
        throw new Error('Academic year not found');
      }

      const response = await fetch('/api/settings/academic-years', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: yearId,
          isActive: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP error! status: ${response.status}`;
        
        // More specific error messages based on status
        let userFriendlyMessage = 'Failed to set active year. ';
        if (response.status === 401) {
          userFriendlyMessage += 'Please log in again.';
        } else if (response.status === 403) {
          userFriendlyMessage += 'You do not have permission to update academic years.';
        } else if (response.status === 400) {
          userFriendlyMessage += errorData.error || 'Invalid data provided.';
        } else if (response.status === 500) {
          userFriendlyMessage += 'Server error. Please contact support.';
        } else {
          userFriendlyMessage += 'Please try again.';
        }
        
        throw new Error(userFriendlyMessage);
      }

      const result = await response.json();

      // Refresh the list
      const refreshResponse = await fetch('/api/settings/academic-years');
      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP error! status: ${refreshResponse.status}`;
        
        let userFriendlyMessage = 'Failed to refresh academic years. ';
        if (refreshResponse.status === 401) {
          userFriendlyMessage += 'Please log in again.';
        } else if (refreshResponse.status === 403) {
          userFriendlyMessage += 'You do not have permission to view academic years.';
        } else if (refreshResponse.status === 500) {
          userFriendlyMessage += 'Server error. Please contact support.';
        } else {
          userFriendlyMessage += 'Please try again.';
        }
        
        throw new Error(userFriendlyMessage);
      }
      
      const data = await refreshResponse.json();
      setAcademicYears(data.academicYears || []);
    } catch (error) {
      console.error('Error setting active year:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrors({ setActive: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  // Delete an academic year
  const handleDeleteAcademicYear = async (yearId: string) => {
    const year = academicYears.find(y => y.id === yearId);
    if (!year) return;

    const termCount = year?.terms?.length || 0;
    
    let confirmationMessage = `Are you sure you want to delete the academic year "${year?.name || 'Unknown'}"?`;
    
    if (termCount > 0) {
      confirmationMessage += `\n\nWARNING: This academic year has ${termCount} term(s).`;
      confirmationMessage += `\n\nYou have two options:`;
      confirmationMessage += `\n1. Cancel and delete terms individually first`;
      confirmationMessage += `\n2. Delete the academic year and ALL associated terms automatically`;
      confirmationMessage += `\n\nChoose "OK" to delete everything, or "Cancel" to abort.`;
    }
    
    confirmationMessage += `\n\nThis action cannot be undone. Do you want to proceed?`;
    
    if (!window.confirm(confirmationMessage)) {
      return;
    }

    try {
      // Add to deleting set to show loading indicator
      setDeletingYearIds(prev => new Set(prev).add(yearId));
      setErrors(prev => ({ ...prev, deleteYear: '' })); // Clear previous delete year errors

      // Try cascade delete if there are terms
      const cascade = termCount > 0;
      const response = await fetch(`/api/settings/academic-years?id=${yearId}${cascade ? '&cascade=true' : ''}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : (errorData.message || `HTTP error! status: ${response.status}`);

        // More specific error messages based on status
        let userFriendlyMessage = '';
        if (response.status === 401) {
          userFriendlyMessage = 'Please log in again.';
        } else if (response.status === 403) {
          userFriendlyMessage = 'You do not have permission to delete academic years.';
        } else if (response.status === 400) {
          // Check for specific validation errors from the backend
          if (errorData.error && typeof errorData.error === 'string') {
            if (errorData.canCascade && errorData.termsCount) {
              // Offer cascade delete option
              const cascadeConfirm = window.confirm(
                `This academic year has ${errorData.termsCount} associated term(s).\n\n` +
                `Would you like to delete the academic year AND all its terms?\n\n` +
                `Click "OK" to delete everything, or "Cancel" to abort.`
              );
              
              if (cascadeConfirm) {
                // Retry with cascade
                const cascadeResponse = await fetch(`/api/settings/academic-years?id=${yearId}&cascade=true`, {
                  method: 'DELETE',
                });
                
                if (!cascadeResponse.ok) {
                  const cascadeErrorData = await cascadeResponse.json().catch(() => ({}));
                  const errorMessage = typeof cascadeErrorData.error === 'string' 
                    ? cascadeErrorData.error 
                    : (cascadeErrorData.message || 'Failed to delete with cascade');
                  throw new Error(errorMessage);
                }
                
                const cascadeResult = await cascadeResponse.json();
                
                // Refresh the list
                const refreshResponse = await fetch('/api/settings/academic-years');
                if (refreshResponse.ok) {
                  const data = await refreshResponse.json();
                  setAcademicYears(data.academicYears || []);
                  
                  // If the deleted year was selected, clear the selection
                  if (selectedYear === yearId) {
                    setSelectedYear('');
                  }
                  
                  // Show success message
                  alert(cascadeResult.message || 'Academic year and associated terms deleted successfully');
                  return;
                }
              } else {
                return; // User cancelled cascade delete
              }
            } else if (errorData.error.toLowerCase().includes('cannot delete') && errorData.error.toLowerCase().includes('associated terms')) {
              userFriendlyMessage = 'Cannot delete academic year with associated terms. You need to delete all terms first.';
              // Show alert with instructions
              alert(userFriendlyMessage + '\n\nPlease navigate to the term management section, delete all terms for this academic year, and then try deleting the academic year again.');
            } else if (errorData.dependencies) {
              // Show detailed dependency information
              const deps = errorData.dependencies;
              let depMessage = `Cannot delete term "${errorData.termName || 'Unknown'}" because it has:\n`;
              if (deps.exams > 0) depMessage += `- ${deps.exams} associated exam(s)\n`;
              if (deps.results > 0) depMessage += `- ${deps.results} associated result(s)\n`;
              if (deps.payments > 0) depMessage += `- ${deps.payments} associated payment(s)\n`;
              if (deps.feeStructures > 0) depMessage += `- ${deps.feeStructures} associated fee structure(s)\n`;
              if (deps.timetables > 0) depMessage += `- ${deps.timetables} associated timetable(s)\n`;
              depMessage += '\nPlease clean up these dependencies first.';
              userFriendlyMessage = depMessage;
            } else {
              userFriendlyMessage = errorData.error;
            }
          } else {
            userFriendlyMessage = 'Invalid data provided.';
          }
        } else if (response.status === 500) {
          userFriendlyMessage = 'Server error. Please contact support.';
        } else {
          userFriendlyMessage = 'Failed to delete academic year. Please try again.';
        }

        throw new Error(userFriendlyMessage);
      }

      const result = await response.json();

      // Refresh the list
      const refreshResponse = await fetch('/api/settings/academic-years');
      if (!refreshResponse.ok) {
        const errorData = await refreshResponse.json().catch(() => ({}));
        const errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : (errorData.message || `HTTP error! status: ${refreshResponse.status}`);

        let userFriendlyMessage = 'Failed to refresh academic years. ';
        if (refreshResponse.status === 401) {
          userFriendlyMessage += 'Please log in again.';
        } else if (refreshResponse.status === 403) {
          userFriendlyMessage += 'You do not have permission to view academic years.';
        } else if (refreshResponse.status === 500) {
          userFriendlyMessage += 'Server error. Please contact support.';
        } else {
          userFriendlyMessage += 'Please try again.';
        }

        throw new Error(userFriendlyMessage);
      }

      const data = await refreshResponse.json();
      setAcademicYears(data.academicYears || []);

      // If the deleted year was selected, clear the selection
      if (selectedYear === yearId) {
        setSelectedYear('');
      }

      // Show success message
      alert(result.message || 'Academic year deleted successfully');

    } catch (error) {
      console.error('Error deleting academic year:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrors({ deleteYear: errorMessage });
    } finally {
      // Remove from deleting set to hide loading indicator
      setDeletingYearIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(yearId);
        return newSet;
      });
    }
  };

  // Get selected year data
  const selectedYearData = academicYears.find(year => year.id === selectedYear);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading academic years...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errors.fetch && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.fetch}</AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Academic Year Management</CardTitle>
          <CardDescription>Create and manage academic years and terms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Add Academic Year Form */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Add New Academic Year</h3>
              
              <div className="space-y-2">
                <Label htmlFor="yearName">Academic Year Name</Label>
                <Input
                  id="yearName"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  placeholder="e.g., 2026/2027"
                  disabled={saving}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                  <Label htmlFor="yearStart">Start Date</Label>
                  <Input
                    id="yearStart"
                    type="date"
                    value={newYearStart}
                    onChange={(e) => setNewYearStart(e.target.value)}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-8 p-1"
                    onClick={() => {
                      setCalendarField('start');
                      setShowCalendar(!showCalendar);
                    }}
                    disabled={saving}
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </button>
                  {errors.start && <p className="text-sm text-red-500">{errors.start}</p>}
                </div>
                
                <div className="space-y-2 relative">
                  <Label htmlFor="yearEnd">End Date</Label>
                  <Input
                    id="yearEnd"
                    type="date"
                    value={newYearEnd}
                    onChange={(e) => setNewYearEnd(e.target.value)}
                    disabled={saving}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-8 p-1"
                    onClick={() => {
                      setCalendarField('end');
                      setShowCalendar(!showCalendar);
                    }}
                    disabled={saving}
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </button>
                  {errors.end && <p className="text-sm text-red-500">{errors.end}</p>}
                </div>
              </div>
              
              {errors.dateRange && <p className="text-sm text-red-500">{errors.dateRange}</p>}
              
              <Button onClick={handleAddAcademicYear} className="w-full" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add Academic Year
              </Button>
            </div>
            
            {/* Academic Years List */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Existing Academic Years</h3>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {academicYears.map(year => (
                  <div 
                    key={year.id} 
                    className={`p-3 border rounded-lg ${
                      selectedYear === year.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{year.name}</h4>
                        <p className="text-sm text-gray-500">
                          {format(new Date(year.startDate), 'MMM d, yyyy')} - {format(new Date(year.endDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={year.isActive ? "default" : "outline"}
                          onClick={() => handleSetActiveYear(year.id)}
                          disabled={saving}
                        >
                          {year.isActive ? 'Active' : 'Set Active'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedYear(year.id)}
                          disabled={saving}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteAcademicYear(year.id)}
                          disabled={saving || deletingYearIds.has(year.id)}
                        >
                          {deletingYearIds.has(year.id) ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Delete'
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm">
                      <p>Terms: {year.terms?.length ?? 0}</p>
                      <p>Weeks: {calculateWeekCount(year.startDate, year.endDate)}</p>
                    </div>
                  </div>
                ))}
                
                {academicYears.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No academic years created yet</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Term Management for Selected Year */}
      {selectedYearData && (
        <Card>
          <CardHeader>
            <CardTitle>Term Management: {selectedYearData.name}</CardTitle>
            <CardDescription>Manage terms for the selected academic year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Add Term Form */}
              {showTermForm && (
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50 mb-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium text-lg text-blue-800">Add New Term</h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelTermForm}
                      disabled={saving}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="termName" className="text-sm font-medium">Term Name *</Label>
                      <Input
                        id="termName"
                        value={termFormData.name}
                        onChange={(e) => handleTermFormChange('name', e.target.value)}
                        placeholder="e.g., Term 1, First Term, Fall Semester"
                        disabled={saving}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-600 mt-1">Enter a descriptive name for this term</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="termStartDate" className="text-sm font-medium">Start Date *</Label>
                        <Input
                          id="termStartDate"
                          type="date"
                          value={termFormData.startDate}
                          onChange={(e) => handleTermFormChange('startDate', e.target.value)}
                          disabled={saving}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-600 mt-1">When does this term begin?</p>
                      </div>
                      
                      <div>
                        <Label htmlFor="termEndDate" className="text-sm font-medium">End Date *</Label>
                        <Input
                          id="termEndDate"
                          type="date"
                          value={termFormData.endDate}
                          onChange={(e) => handleTermFormChange('endDate', e.target.value)}
                          disabled={saving}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-600 mt-1">When does this term end?</p>
                      </div>
                    </div>
                    
                    {termFormData.startDate && termFormData.endDate && (
                      <div className="bg-white p-3 rounded border">
                        <p className="text-sm text-gray-700">
                          <strong>Duration:</strong> {Math.ceil((new Date(termFormData.endDate).getTime() - new Date(termFormData.startDate).getTime()) / (7 * 24 * 60 * 60 * 1000))} weeks
                        </p>
                      </div>
                    )}
                    
                    {errors.addTerm && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{errors.addTerm}</AlertDescription>
                      </Alert>
                    )}
                    
                    <div className="flex gap-2 justify-end pt-2">
                      <Button
                        variant="outline"
                        onClick={handleCancelTermForm}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleSubmitTerm(selectedYearData.id)}
                        disabled={saving || !termFormData.name || !termFormData.startDate || !termFormData.endDate}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Term...
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Term
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Add Term Button */}
              {!showTermForm && (
                <div className="flex justify-center mb-6">
                  <Button 
                    onClick={() => handleAddTerm(selectedYearData.id)} 
                    disabled={saving}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Add New Term
                  </Button>
                </div>
              )}
            </div>
            
            {selectedYearData.terms && selectedYearData.terms.length > 0 ? (
              <div className="space-y-4">
                {selectedYearData.terms?.map((term, index) => (
                  <div key={term.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{term.name}</h4>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteTerm(selectedYearData.id, term.id)}
                        disabled={saving || deletingTermIds.has(term.id)}
                      >
                        {deletingTermIds.has(term.id) ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div className="space-y-2 relative">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={(() => {
                            try {
                              const date = new Date(term.startDate);
                              if (isNaN(date.getTime())) {
                                console.warn(`Invalid startDate for term ${term.id}:`, term.startDate);
                                return '';
                              }
                              return format(date, 'yyyy-MM-dd');
                            } catch (error) {
                              console.warn(`Error formatting startDate for term ${term.id}:`, error);
                              return '';
                            }
                          })()}
                          onChange={(e) => handleUpdateTermDates(selectedYearData.id, term.id, 'startDate', e.target.value)}
                          disabled={saving}
                        />
                      </div>
                      
                      <div className="space-y-2 relative">
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={format(new Date(term.endDate), 'yyyy-MM-dd')}
                          onChange={(e) => handleUpdateTermDates(selectedYearData.id, term.id, 'endDate', e.target.value)}
                          disabled={saving}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">Weeks: {term.weekCount}</Badge>
                      {term.holidayInfo && (
                        <Badge variant="outline">
                          Holiday: {format(new Date(term.holidayInfo.startDate), 'MMM d')} - {format(new Date(term.holidayInfo.endDate), 'MMM d')} ({term.holidayInfo.weekCount} weeks)
                        </Badge>
                      )}
                    </div>
                    
                    {selectedYearData.terms && index < selectedYearData.terms.length - 1 && (
                      <Alert className="mt-3 bg-blue-50 border-blue-200">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Next term starts after this one ends. Holiday period: {format(new Date(term.endDate), 'MMM d, yyyy')} to {selectedYearData.terms && selectedYearData.terms[index + 1] ? format(new Date(selectedYearData.terms[index + 1].startDate), 'MMM d, yyyy') : 'End of year'}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No terms created for this academic year</p>
                {!showTermForm && (
                  <Button 
                    onClick={() => handleAddTerm(selectedYearData.id)}
                    disabled={saving}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Add First Term
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Calendar Popup */}
      {showCalendar && renderCalendar()}
      
      {/* Error Messages */}
      {(errors.addYear || errors.addTerm || errors.updateTerm || errors.deleteTerm || errors.setActive) && (
        <Alert variant="destructive" className="border-l-4">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="ml-2">
            <div className="space-y-2">
              <p className="font-medium">
                {errors.addYear && 'Unable to Add Academic Year'}
                {errors.addTerm && 'Unable to Add Term'}
                {errors.updateTerm && 'Unable to Update Term'}
                {errors.deleteTerm && 'Unable to Delete Term'}
                {errors.setActive && 'Unable to Set Active Year'}
              </p>
              <p className="text-sm">
                {errors.addYear || errors.addTerm || errors.updateTerm || errors.deleteTerm || errors.setActive}
              </p>
              {errors.deleteTerm && errors.deleteTerm.includes('associated data') && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                    💡 What you can do:
                  </p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>Delete or move the CA entries to another term first</li>
                    <li>Or edit the term dates instead of deleting it</li>
                    <li>Contact your administrator if you need assistance</li>
                  </ul>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default EnhancedAcademicSettings;