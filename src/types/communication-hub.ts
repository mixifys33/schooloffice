/**
 * Communication Hub Types
 * Super Admin Communication Hub interfaces and types
 * Requirements: 1.1-1.9, 2.1-2.9, 3.1-3.7, 4.1-4.8, 5.1-5.7, 6.1-6.8, 7.1-7.7, 8.1-8.8, 9.1-9.7
 */

// ============================================
// ENUMS
// ============================================

export enum MessageChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

export enum HubAlertType {
  DELIVERY_FAILURE = 'DELIVERY_FAILURE',
  QUEUE_STUCK = 'QUEUE_STUCK',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  LOW_BALANCE = 'LOW_BALANCE',
  ABNORMAL_USAGE = 'ABNORMAL_USAGE',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export enum HubAlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum HubAuditActionType {
  PAUSE_SCHOOL_MESSAGING = 'PAUSE_SCHOOL_MESSAGING',
  RESUME_SCHOOL_MESSAGING = 'RESUME_SCHOOL_MESSAGING',
  UPDATE_QUOTA = 'UPDATE_QUOTA',
  ADD_CREDITS = 'ADD_CREDITS',
  CANCEL_MESSAGES = 'CANCEL_MESSAGES',
  RETRY_MESSAGES = 'RETRY_MESSAGES',
  PAUSE_QUEUE = 'PAUSE_QUEUE',
  RESUME_QUEUE = 'RESUME_QUEUE',
  CREATE_TEMPLATE = 'CREATE_TEMPLATE',
  UPDATE_TEMPLATE = 'UPDATE_TEMPLATE',
  ACKNOWLEDGE_ALERT = 'ACKNOWLEDGE_ALERT',
  EMERGENCY_OVERRIDE = 'EMERGENCY_OVERRIDE',
}

export enum QueueHealthStatus {
  HEALTHY = 'HEALTHY',
  SLOW = 'SLOW',
  STUCK = 'STUCK',
}

export enum ReportFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum HubReportType {
  USAGE = 'USAGE',
  DELIVERY = 'DELIVERY',
  COST = 'COST',
}

export enum QueuedMessageStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  FAILED = 'FAILED',
}

export enum MessagePriority {
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ============================================
// DASHBOARD INTERFACES - Requirements 1.1-1.9
// ============================================

export interface ChannelStats {
  sentToday: number;
  sentThisMonth: number;
  failedToday: number;
  deliveryRate: number;
}

export interface DashboardOverview {
  sms: ChannelStats;
  whatsapp: ChannelStats;
  email: ChannelStats;
  pendingInQueue: number;
  deliveryFailureRate: number;
  bounceRate: number;
  alerts: HubAlert[];
  lastUpdated: Date;
}

export interface ActiveAlert {
  id: string;
  type: HubAlertType;
  severity: HubAlertSeverity;
  title: string;
  message: string;
  schoolId?: string;
  schoolName?: string;
  channel?: MessageChannel;
  createdAt: Date;
}

// ============================================
// SCHOOL MONITORING INTERFACES - Requirements 2.1-2.9
// ============================================

export interface ChannelUsage {
  sent: number;
  limit: number | null;
  remaining: number;
}

export interface SchoolMessagingStats {
  schoolId: string;
  schoolName: string;
  schoolCode: string;
  isActive: boolean;
  isPaused: boolean;
  sms: ChannelUsage;
  whatsapp: ChannelUsage;
  email: ChannelUsage;
  failureCount: number;
  lastMessageAt: Date | null;
}

export interface SchoolQuotas {
  schoolId: string;
  smsLimitDaily: number | null;
  smsLimitMonthly: number | null;
  whatsappLimitDaily: number | null;
  whatsappLimitMonthly: number | null;
  emailLimitDaily: number | null;
  emailLimitMonthly: number | null;
  smsCredits: number;
  whatsappCredits: number;
  emailCredits: number;
  emergencyOverride: boolean;
}

export interface QuotaUpdate {
  smsLimitDaily?: number | null;
  smsLimitMonthly?: number | null;
  whatsappLimitDaily?: number | null;
  whatsappLimitMonthly?: number | null;
  emailLimitDaily?: number | null;
  emailLimitMonthly?: number | null;
}


// ============================================
// MESSAGE LOG INTERFACES - Requirements 3.1-3.7
// ============================================

export interface MessageLogEntry {
  id: string;
  timestamp: Date;
  schoolId: string;
  schoolName: string;
  recipient: string;
  channel: MessageChannel;
  content: string;
  templateType?: string;
  status: string;
  deliveredAt?: Date;
  errorMessage?: string;
}

export interface MessageLogFilters {
  schoolId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  channel?: MessageChannel;
  status?: string;
  searchQuery?: string;
}

export interface PaginatedMessageLogs {
  data: MessageLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// QUOTA MANAGEMENT INTERFACES - Requirements 4.1-4.8
// ============================================

export interface CreditAddition {
  schoolId: string;
  channel: MessageChannel;
  amount: number;
  reason?: string;
}

// ============================================
// TEMPLATE INTERFACES - Requirements 5.1-5.7
// ============================================

export interface HubTemplate {
  id: string;
  name: string;
  channel: MessageChannel;
  content: string;
  variables: string[];
  isMandatory: boolean;
  assignedSchools: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface TemplateVersion {
  id: string;
  templateId: string;
  version: number;
  content: string;
  createdAt: Date;
  createdBy: string;
}

export interface CreateTemplateInput {
  name: string;
  channel: MessageChannel;
  content: string;
  isMandatory?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  content?: string;
  isMandatory?: boolean;
}

export interface TemplateFilters {
  channel?: MessageChannel;
  isMandatory?: boolean;
  searchQuery?: string;
}

// ============================================
// ALERT INTERFACES - Requirements 6.1-6.8
// ============================================

export interface HubAlert {
  id: string;
  type: HubAlertType;
  severity: HubAlertSeverity;
  title: string;
  message: string;
  schoolId?: string;
  schoolName?: string;
  channel?: MessageChannel;
  metadata: Record<string, unknown>;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  dismissedAt?: Date;
}

export interface AlertFilters {
  type?: HubAlertType;
  severity?: HubAlertSeverity;
  schoolId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  acknowledged?: boolean;
}

export interface AlertSettings {
  id: string;
  deliveryFailureThreshold: number;
  queueStuckThreshold: number;
  lowBalanceThreshold: number;
  abnormalUsageMultiplier: number;
  emailNotifications: boolean;
  slackNotifications: boolean;
  slackWebhookUrl?: string;
  notificationEmails: string[];
}

export interface AlertSettingsUpdate {
  deliveryFailureThreshold?: number;
  queueStuckThreshold?: number;
  lowBalanceThreshold?: number;
  abnormalUsageMultiplier?: number;
  emailNotifications?: boolean;
  slackNotifications?: boolean;
  slackWebhookUrl?: string;
  notificationEmails?: string[];
}

// ============================================
// QUEUE INTERFACES - Requirements 7.1-7.7
// ============================================

export interface QueueStatus {
  channel: MessageChannel;
  messageCount: number;
  oldestMessageAge: number; // seconds
  processingRate: number; // messages per minute
  health: QueueHealthStatus;
  isPaused: boolean;
}

export interface QueuedMessage {
  id: string;
  schoolId: string;
  schoolName: string;
  channel: MessageChannel;
  recipient: string;
  status: QueuedMessageStatus;
  priority: MessagePriority;
  createdAt: Date;
  attempts: number;
  lastError?: string;
}

export interface QueueFilters {
  channel?: MessageChannel;
  schoolId?: string;
  priority?: MessagePriority;
  status?: QueuedMessageStatus;
}

export interface CancelResult {
  success: boolean;
  canceledCount: number;
  failedIds: string[];
}

export interface RetryResult {
  success: boolean;
  retriedCount: number;
  failedIds: string[];
}


// ============================================
// REPORT INTERFACES - Requirements 8.1-8.8
// ============================================

export interface ReportParams {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  schoolIds?: string[];
  channels?: MessageChannel[];
}

export interface SchoolUsageSummary {
  schoolId: string;
  schoolName: string;
  sms: number;
  whatsapp: number;
  email: number;
  total: number;
}

export interface TrendData {
  date: Date;
  sms: number;
  whatsapp: number;
  email: number;
}

export interface UsageReport {
  id: string;
  period: { start: Date; end: Date };
  summary: {
    totalMessages: number;
    byChannel: Record<MessageChannel, number>;
    bySchool: SchoolUsageSummary[];
  };
  trends: TrendData[];
  generatedAt: Date;
}

export interface DeliveryStats {
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
  successRate: number;
}

export interface SchoolDeliveryStats {
  schoolId: string;
  schoolName: string;
  stats: DeliveryStats;
}

export interface DeliveryReport {
  id: string;
  period: { start: Date; end: Date };
  overall: DeliveryStats;
  byChannel: Record<MessageChannel, DeliveryStats>;
  bySchool: SchoolDeliveryStats[];
  generatedAt: Date;
}

export interface CostSummary {
  totalCost: number;
  byChannel: Record<MessageChannel, number>;
}

export interface SchoolCostSummary {
  schoolId: string;
  schoolName: string;
  cost: CostSummary;
}

export interface CostReport {
  id: string;
  period: { start: Date; end: Date };
  overall: CostSummary;
  bySchool: SchoolCostSummary[];
  generatedAt: Date;
}

export interface ScheduledReportConfig {
  id?: string;
  name: string;
  reportType: HubReportType;
  frequency: ReportFrequency;
  recipients: string[];
  filters: ReportParams;
  isActive: boolean;
  nextRunAt?: Date;
}

// ============================================
// AUDIT INTERFACES - Requirements 9.1-9.7
// ============================================

export interface AuditLog {
  id: string;
  timestamp: Date;
  adminId: string;
  adminEmail: string;
  action: HubAuditActionType;
  targetType: 'school' | 'queue' | 'template' | 'quota' | 'alert';
  targetId: string;
  targetName?: string;
  details: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    reason?: string;
  };
  ipAddress: string;
}

export interface AuditFilters {
  adminId?: string;
  action?: HubAuditActionType;
  targetType?: string;
  targetId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface AuditAction {
  adminId: string;
  adminEmail: string;
  action: HubAuditActionType;
  targetType: 'school' | 'queue' | 'template' | 'quota' | 'alert';
  targetId: string;
  targetName?: string;
  details: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    reason?: string;
  };
  ipAddress: string;
}

// ============================================
// SERVICE INTERFACES
// ============================================

export interface CommunicationHubService {
  // Dashboard Overview
  getDashboardOverview(): Promise<DashboardOverview>;

  // School Monitoring
  getSchoolMessagingStats(schoolId?: string): Promise<SchoolMessagingStats[]>;
  pauseSchoolMessaging(
    schoolId: string, 
    reason: string,
    adminContext?: {
      adminId: string
      adminEmail: string
      ipAddress: string
    }
  ): Promise<void>;
  resumeSchoolMessaging(
    schoolId: string,
    adminContext?: {
      adminId: string
      adminEmail: string
      ipAddress: string
    }
  ): Promise<void>;

  // Quota Management
  getSchoolQuotas(schoolId: string): Promise<SchoolQuotas>;
  updateSchoolQuotas(
    schoolId: string, 
    quotas: QuotaUpdate,
    adminContext?: {
      adminId: string
      adminEmail: string
      ipAddress: string
    }
  ): Promise<void>;
  addCredits(
    schoolId: string, 
    channel: MessageChannel, 
    amount: number,
    adminContext?: {
      adminId: string
      adminEmail: string
      ipAddress: string
    }
  ): Promise<void>;
  setEmergencyOverride(
    schoolId: string, 
    enabled: boolean,
    adminContext?: {
      adminId: string
      adminEmail: string
      ipAddress: string
      reason?: string
    }
  ): Promise<void>;
}

export interface QueueMonitorService {
  // Queue Monitoring
  getQueueStatus(): Promise<QueueStatus[]>;
  getQueuedMessages(filters: QueueFilters): Promise<QueuedMessage[]>;

  // Queue Control
  pauseQueue(channel: MessageChannel): Promise<void>;
  resumeQueue(channel: MessageChannel): Promise<void>;
  cancelMessages(messageIds: string[]): Promise<CancelResult>;
  retryFailedMessages(messageIds: string[]): Promise<RetryResult>;
}

export interface HubAlertService {
  // Alert Management
  getActiveAlerts(): Promise<HubAlert[]>;
  getAlertHistory(filters: AlertFilters): Promise<HubAlert[]>;
  acknowledgeAlert(alertId: string): Promise<void>;
  dismissAlert(alertId: string): Promise<void>;

  // Alert Configuration
  getAlertSettings(): Promise<AlertSettings>;
  updateAlertSettings(settings: AlertSettingsUpdate): Promise<void>;

  // Internal
  checkAndGenerateAlerts(): Promise<void>;
  sendAlertNotification(alert: HubAlert): Promise<void>;
}

export interface HubReportService {
  // Report Generation
  generateUsageReport(params: ReportParams): Promise<UsageReport>;
  generateDeliveryReport(params: ReportParams): Promise<DeliveryReport>;
  generateCostReport(params: ReportParams): Promise<CostReport>;

  // Export
  exportReport(reportId: string, format: 'csv' | 'pdf'): Promise<Buffer>;

  // Scheduled Reports
  scheduleReport(config: ScheduledReportConfig): Promise<void>;
  getScheduledReports(): Promise<ScheduledReportConfig[]>;
}

export interface TemplateManagementService {
  // Template CRUD
  createTemplate(template: CreateTemplateInput): Promise<HubTemplate>;
  updateTemplate(id: string, updates: UpdateTemplateInput): Promise<HubTemplate>;
  getTemplate(id: string): Promise<HubTemplate>;
  listTemplates(filters: TemplateFilters): Promise<HubTemplate[]>;

  // Version Management
  getTemplateVersions(templateId: string): Promise<TemplateVersion[]>;
  revertToVersion(templateId: string, versionId: string): Promise<HubTemplate>;

  // Template Assignment
  assignTemplateToSchools(templateId: string, schoolIds: string[]): Promise<void>;
  setTemplateMandatory(templateId: string, mandatory: boolean): Promise<void>;

  // Preview
  previewTemplate(templateId: string, sampleData: Record<string, string>): Promise<string>;
}

export interface HubAuditService {
  // Logging
  logAction(action: AuditAction): Promise<void>;

  // Query
  getAuditLogs(filters: AuditFilters): Promise<AuditLog[]>;
  exportAuditLogs(filters: AuditFilters): Promise<Buffer>;
}


// ============================================
// API ERROR TYPES
// ============================================

export enum HubErrorCode {
  // Authentication/Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_SUPER_ADMIN = 'NOT_SUPER_ADMIN',

  // Resource Errors
  SCHOOL_NOT_FOUND = 'SCHOOL_NOT_FOUND',
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  ALERT_NOT_FOUND = 'ALERT_NOT_FOUND',

  // Operation Errors
  SCHOOL_ALREADY_PAUSED = 'SCHOOL_ALREADY_PAUSED',
  SCHOOL_NOT_PAUSED = 'SCHOOL_NOT_PAUSED',
  QUEUE_ALREADY_PAUSED = 'QUEUE_ALREADY_PAUSED',
  MESSAGE_NOT_CANCELLABLE = 'MESSAGE_NOT_CANCELLABLE',
  INVALID_QUOTA_VALUE = 'INVALID_QUOTA_VALUE',

  // System Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  QUEUE_SERVICE_ERROR = 'QUEUE_SERVICE_ERROR',
  GATEWAY_ERROR = 'GATEWAY_ERROR',
}

export interface HubApiError {
  code: HubErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================
// UI COMPONENT PROPS - Requirements 10.1-10.20
// ============================================

export interface DashboardTabProps {
  overview: DashboardOverview;
  onRefresh: () => void;
  refreshInterval: number;
}

export interface StatsCardProps {
  title: string;
  channel: MessageChannel;
  sentToday: number;
  sentThisMonth: number;
  failedToday: number;
  deliveryRate: number;
}

export interface AlertCardProps {
  alert: HubAlert;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
}

export interface SchoolsTabProps {
  schools: SchoolMessagingStats[];
  onPause: (schoolId: string, reason: string) => void;
  onResume: (schoolId: string) => void;
  onUpdateQuota: (schoolId: string, quotas: QuotaUpdate) => void;
  onAddCredits: (schoolId: string, channel: MessageChannel, amount: number) => void;
}

export interface SchoolRowActionsProps {
  school: SchoolMessagingStats;
  onPause: () => void;
  onResume: () => void;
  onManageQuota: () => void;
}

export interface LogsTabProps {
  filters: MessageLogFilters;
  onFilterChange: (filters: MessageLogFilters) => void;
  onExport: () => void;
  onSearch: (query: string) => void;
}

export interface QueuesTabProps {
  queues: QueueStatus[];
  onPauseQueue: (channel: MessageChannel) => void;
  onResumeQueue: (channel: MessageChannel) => void;
  onCancelMessages: (messageIds: string[]) => void;
  onRetryMessages: (messageIds: string[]) => void;
}

export interface QueueHealthIndicatorProps {
  health: QueueHealthStatus;
  isPaused: boolean;
}

export interface AlertsTabProps {
  activeAlerts: HubAlert[];
  alertHistory: HubAlert[];
  settings: AlertSettings;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
  onUpdateSettings: (settings: AlertSettingsUpdate) => void;
}

export interface TemplatesTabProps {
  templates: HubTemplate[];
  onCreateTemplate: (template: CreateTemplateInput) => void;
  onUpdateTemplate: (id: string, updates: UpdateTemplateInput) => void;
  onPreview: (id: string, sampleData: Record<string, string>) => void;
  onAssignSchools: (templateId: string, schoolIds: string[]) => void;
}

export interface TemplateEditorProps {
  template?: HubTemplate;
  onSave: (template: CreateTemplateInput | UpdateTemplateInput) => void;
  onPreview: (content: string, sampleData: Record<string, string>) => void;
}

export interface ReportsTabProps {
  onGenerateUsageReport: (params: ReportParams) => void;
  onGenerateDeliveryReport: (params: ReportParams) => void;
  onGenerateCostReport: (params: ReportParams) => void;
  onExportReport: (reportId: string, format: 'csv' | 'pdf') => void;
  onScheduleReport: (config: ScheduledReportConfig) => void;
}

export interface UsageTrendChartProps {
  data: TrendData[];
  period: 'daily' | 'weekly' | 'monthly';
}

export interface AuditTabProps {
  logs: AuditLog[];
  filters: AuditFilters;
  onFilterChange: (filters: AuditFilters) => void;
  onExport: () => void;
}

// ============================================
// STATE MANAGEMENT - React Query Keys
// ============================================

export const hubQueryKeys = {
  overview: ['hub', 'overview'] as const,
  schools: ['hub', 'schools'] as const,
  schoolQuotas: (schoolId: string) => ['hub', 'schools', schoolId, 'quotas'] as const,
  logs: (filters: MessageLogFilters) => ['hub', 'logs', filters] as const,
  queues: ['hub', 'queues'] as const,
  queueMessages: (filters: QueueFilters) => ['hub', 'queues', 'messages', filters] as const,
  alerts: ['hub', 'alerts'] as const,
  alertHistory: (filters: AlertFilters) => ['hub', 'alerts', 'history', filters] as const,
  alertSettings: ['hub', 'alerts', 'settings'] as const,
  templates: ['hub', 'templates'] as const,
  templateVersions: (templateId: string) => ['hub', 'templates', templateId, 'versions'] as const,
  reports: ['hub', 'reports'] as const,
  scheduledReports: ['hub', 'reports', 'scheduled'] as const,
  audit: (filters: AuditFilters) => ['hub', 'audit', filters] as const,
};

// ============================================
// LOADING AND ERROR STATES
// ============================================

export interface LoadingStateProps {
  message?: string;
}

export interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
}

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
