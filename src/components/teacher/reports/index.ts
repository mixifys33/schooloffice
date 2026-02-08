/**
 * Three-Tier Reporting System Components
 * 
 * Exports all three report components for the Teacher Marks Management System:
 * - CA-Only Performance Reports
 * - Exam-Only Performance Reports  
 * - Final Term Report Cards
 * 
 * Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7
 */

export { CAOnlyReport } from '../CAOnlyReport';
export { ExamOnlyReport } from '../ExamOnlyReport';
export { FinalTermReport } from '../FinalTermReport';

export type { CAOnlyReportData } from '../CAOnlyReport';
export type { ExamOnlyReportData } from '../ExamOnlyReport';
export type { FinalTermReportData } from '../FinalTermReport';

// Report type union for type safety
export type ReportType = 'CA_ONLY' | 'EXAM_ONLY' | 'FINAL_TERM';

// Common report props interface
export interface BaseReportProps {
  classId: string;
  subjectId?: string;
  termId?: string;
  studentId?: string;
  onPrint?: (reportData: any) => void;
  onExport?: (reportData: any) => void;
}

// Report data union type
export type ReportData = CAOnlyReportData | ExamOnlyReportData | FinalTermReportData;