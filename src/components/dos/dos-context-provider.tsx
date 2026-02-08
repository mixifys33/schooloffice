'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DoSContextData {
  currentTerm: {
    id: string;
    name: string;
    academicYear: string;
    startDate: string;
    endDate: string;
  } | null;
  schoolStatus: 'OPEN' | 'EXAM_PERIOD' | 'REPORTING' | 'CLOSED';
  permissions: {
    canApproveCurriculum: boolean;
    canLockAssessments: boolean;
    canApproveExams: boolean;
    canGenerateReports: boolean;
    canMakePromotionDecisions: boolean;
  };
  refreshContext: () => void;
}

const DoSContext = createContext<DoSContextData | undefined>(undefined);

export function useDoSContext() {
  const context = useContext(DoSContext);
  if (context === undefined) {
    throw new Error('useDoSContext must be used within a DoSContextProvider');
  }
  return context;
}

interface DoSContextProviderProps {
  children: ReactNode;
}

export function DoSContextProvider({ children }: DoSContextProviderProps) {
  const [contextData, setContextData] = useState<DoSContextData>({
    currentTerm: null,
    schoolStatus: 'OPEN',
    permissions: {
      canApproveCurriculum: true,
      canLockAssessments: true,
      canApproveExams: true,
      canGenerateReports: true,
      canMakePromotionDecisions: true,
    },
    refreshContext: () => {},
  });

  const fetchContextData = async () => {
    try {
      const response = await fetch('/api/dos/context');
      const data = await response.json();
      
      setContextData(prev => ({
        ...prev,
        currentTerm: data.currentTerm,
        schoolStatus: data.schoolStatus,
        permissions: data.permissions,
      }));
    } catch (error) {
      console.error('Error fetching DoS context:', error);
    }
  };

  const refreshContext = () => {
    fetchContextData();
  };

  useEffect(() => {
    fetchContextData();
  }, []);

  const value: DoSContextData = {
    ...contextData,
    refreshContext,
  };

  return (
    <DoSContext.Provider value={value}>
      {children}
    </DoSContext.Provider>
  );
}