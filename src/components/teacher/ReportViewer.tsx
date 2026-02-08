/**
 * Report Viewer Component
 * 
 * A unified component that displays the appropriate report type based on selection.
 * Supports all three report types: CA-Only, Exam-Only, and Final Term reports.
 * 
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 19.1, 19.2
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  BarChart3, 
  Award,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { teacherColors } from '@/lib/teacher-ui-standards';

import { 
  CAOnlyReport, 
  ExamOnlyReport, 
  FinalTermReport,
  type ReportType,
  type BaseReportProps 
} from './reports';

interface ReportViewerProps extends BaseReportProps {
  defaultReportType?: ReportType;
  showReportTypeSelector?: boolean;
  className?: string;
}

const reportTypes = [
  {
    value: 'CA_ONLY' as const,
    label: 'CA-Only Report',
    description: 'Continuous Assessment activities and contributions',
    icon: BarChart3,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
  },
  {
    value: 'EXAM_ONLY' as const,
    label: 'Exam-Only Report',
    description: 'Examination scores with CA pending status',
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
  },
  {
    value: 'FINAL_TERM' as const,
    label: 'Final Term Report',
    description: 'Complete report with CA and Exam combined',
    icon: Award,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/20',
  },
];

export function ReportViewer({
  classId,
  subjectId,
  termId,
  studentId,
  defaultReportType = 'FINAL_TERM',
  showReportTypeSelector = true,
  onPrint,
  onExport,
  className,
}: ReportViewerProps) {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>(defaultReportType);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleReportTypeChange = (value: string) => {
    setSelectedReportType(value as ReportType);
    setRefreshKey(prev => prev + 1); // Refresh the report when type changes
  };

  const currentReportType = reportTypes.find(type => type.value === selectedReportType);

  const renderReport = () => {
    const commonProps = {
      classId,
      subjectId,
      termId,
      studentId,
      onPrint,
      onExport,
      key: refreshKey, // Force re-render when refreshKey changes
    };

    switch (selectedReportType) {
      case 'CA_ONLY':
        return <CAOnlyReport {...commonProps} />;
      case 'EXAM_ONLY':
        return <ExamOnlyReport {...commonProps} />;
      case 'FINAL_TERM':
        return <FinalTermReport {...commonProps} />;
      default:
        return <FinalTermReport {...commonProps} />;
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Report Type Selector */}
      {showReportTypeSelector && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {currentReportType && <currentReportType.icon className="h-5 w-5" />}
                Report Type Selection
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedReportType === type.value;
                
                return (
                  <div
                    key={type.value}
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all",
                      isSelected 
                        ? `border-primary ${type.bgColor}` 
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                    onClick={() => handleReportTypeChange(type.value)}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className={cn("h-5 w-5", type.color)} />
                      <span className="font-medium">{type.label}</span>
                      {isSelected && (
                        <Badge variant="default" className="ml-auto">
                          Selected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Alternative Dropdown Selector for Mobile */}
            <div className="md:hidden">
              <Select value={selectedReportType} onValueChange={handleReportTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className={cn("h-4 w-4", type.color)} />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Report */}
      <div className="report-content">
        {renderReport()}
      </div>
    </div>
  );
}

// Export individual report components for direct use
export { CAOnlyReport, ExamOnlyReport, FinalTermReport };
export type { ReportType, BaseReportProps };