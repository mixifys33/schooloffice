# Design Document: SMS Communication System

## Overview

The SMS Communication System provides cost-effective school-wide communication through SMS messaging at UGX 45 per message for the Ugandan education market. The system prioritizes SMS over email and WhatsApp due to infrastructure limitations and cost considerations, ensuring all parents can receive communications regardless of their device type or internet connectivity.

The system implements a sophisticated subscription-based SMS allocation model where schools receive SMS credits based on their payment status (full, half, or quarter payment), with strict enforcement of usage limits and access restrictions. SMS counts and costs are hidden from school administrators to prevent pricing disputes, with full visibility reserved for super administrators only.

**Key Design Principles:**

- **Cost Transparency Control**: Hide actual SMS costs and counts from schools to prevent pricing disputes
- **Subscription-Based Allocation**: SMS credits allocated as 9x student count, scaled by payment tier
- **Strict Access Control**: Complete feature lockout for non-paying schools
- **Template-Based Messaging**: Ensure consistent, professional communication
- **Role-Based Permissions**: Control who can send which types of messages
- **Automated Triggers**: Reduce manual intervention for routine communications
- **Comprehensive Audit Trail**: Track all SMS usage for accountability

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     SMS Communication System                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Template   │  │   Credit     │  │   Auto       │     │
│  │   Manager    │  │   Manager    │  │   Trigger    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                   ┌────────▼────────┐                       │
│                   │  SMS Orchestrator│                      │
│                   └────────┬────────┘                       │
│                            │                                │
│         ┌──────────────────┼──────────────────┐            │
│         │                  │                  │             │
│  ┌──────▼──────┐  ┌────────▼────────┐  ┌─────▼─────┐     │
│  │  Permission │  │  Subscription   │  │  Message  │     │
│  │  Validator  │  │  Enforcer       │  │  Logger   │     │
│  └─────────────┘  └─────────────────┘  └───────────┘     │
│                            │                                │
│                   ┌────────▼────────┐                       │
│                   │  SMS Gateway    │                       │
│                   │  (Africa's      │                       │
│                   │   Talking)      │                       │
│                   └─────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
User Action → Permission Check → Subscription Check → Template Render →
Credit Check → SMS Send → Cost Log → Audit Trail
```

## Components and Interfaces

### 1. Template Manager

**Purpose**: Manage SMS message templates with variable substitution and validation.

**Responsibilities:**

- Create and edit SMS templates
- Validate template variables
- Enforce character limits (320 characters max)
- Provide live preview with sample data
- Manage role-based template access

**Interface:**

```typescript
interface TemplateManager {
  // Template CRUD
  createTemplate(
    schoolId: string,
    template: TemplateCreate,
  ): Promise<MessageTemplate>;
  updateTemplate(
    templateId: string,
    updates: TemplateUpdate,
  ): Promise<MessageTemplate>;
  deleteTemplate(templateId: string): Promise<void>;
  getTemplate(templateId: string): Promise<MessageTemplate>;
  listTemplates(
    schoolId: string,
    filters?: TemplateFilters,
  ): Promise<MessageTemplate[]>;

  // Template validation
  validateTemplate(content: string): ValidationResult;
  validateVariables(content: string): string[]; // Returns list of variables
  previewTemplate(
    templateId: string,
    sampleData: Record<string, string>,
  ): string;

  // Character counting
  getCharacterCount(content: string): { characters: number; segments: number };
}

interface TemplateCreate {
  schoolId: string;
  type: MessageTemplateType;
  channel: MessageChannel;
  content: string;
  allowedRoles: Role[];
  isActive: boolean;
}

interface TemplateUpdate {
  content?: string;
  allowedRoles?: Role[];
  isActive?: boolean;
}

interface TemplateFilters {
  type?: MessageTemplateType;
  channel?: MessageChannel;
  isActive?: boolean;
  allowedRole?: Role;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  characterCount: number;
  segmentCount: number;
}
```

**Design Rationale:**

- Click-based variable insertion prevents typos and ensures valid variables
- 320-character limit prevents accidental multi-segment messages
- Live preview helps users see exactly what parents will receive
- Role-based template access ensures appropriate messaging by user type

### 2. Credit Manager

**Purpose**: Track and control SMS credit usage with subscription-based allocation.

**Responsibilities:**

- Calculate SMS allocation based on payment tier and student count
- Track SMS usage per school
- Enforce credit limits
- Hide actual costs from school users
- Provide visibility to super admins only
- Block messaging when credits exhausted

**Interface:**

```typescript
interface CreditManager {
  // Credit allocation (Super Admin only)
  calculateAllocation(
    schoolId: string,
    studentCount: number,
    paymentTier: PaymentTier,
  ): number;
  allocateCredits(schoolId: string, credits: number): Promise<void>;

  // Credit checking
  getAvailableCredits(schoolId: string): Promise<number>; // Hidden from schools
  hasCredits(schoolId: string, required: number): Promise<boolean>;
  checkCreditStatus(schoolId: string): Promise<CreditStatus>;

  // Credit usage
  deductCredits(
    schoolId: string,
    amount: number,
    messageId: string,
  ): Promise<void>;

  // Reporting (Super Admin only)
  getCreditReport(schoolId: string): Promise<CreditReport>;
  getSystemWideCreditUsage(): Promise<SystemCreditReport>;
}

enum PaymentTier {
  FULL = "FULL", // 100% payment → 9x student count
  HALF = "HALF", // 50% payment → 4.5x student count, 1 month access
  QUARTER = "QUARTER", // 25% payment → 2.25x student count, 1 month access
  NONE = "NONE", // No payment → 0 credits, no access
}

interface CreditStatus {
  hasAccess: boolean;
  reason?: string; // Only for denied access
  // Actual credit count hidden from schools
}

interface CreditReport {
  schoolId: string;
  totalAllocated: number;
  totalUsed: number;
  remaining: number;
  paymentTier: PaymentTier;
  studentCount: number;
  accessExpiresAt?: Date;
}

interface SystemCreditReport {
  totalSchools: number;
  totalCreditsAllocated: number;
  totalCreditsUsed: number;
  byPaymentTier: Record<
    PaymentTier,
    {
      schools: number;
      creditsAllocated: number;
      creditsUsed: number;
    }
  >;
}
```

**Design Rationale:**

- **9x multiplier**: Provides generous SMS allocation (9 messages per student per term)
- **Payment tier scaling**: Incentivizes full payment while allowing partial access
- **Cost hiding**: Prevents schools from calculating actual SMS costs (UGX 45) vs. their subscription fee
- **Super admin visibility**: Allows platform monitoring without exposing costs to schools
- **Strict enforcement**: Complete lockout for non-paying schools prevents unauthorized usage

### 3. Subscription Enforcer

**Purpose**: Enforce subscription-based access control and feature restrictions.

**Responsibilities:**

- Validate school payment status before any SMS operation
- Block all features for non-paying schools
- Enforce time-based access limits for partial payments
- Provide clear error messages for access denial

**Interface:**

```typescript
interface SubscriptionEnforcer {
  // Access validation
  validateAccess(schoolId: string): Promise<AccessValidation>;
  canSendSMS(schoolId: string): Promise<boolean>;
  canAccessFeature(schoolId: string, feature: Feature): Promise<boolean>;

  // Subscription management
  updateSubscription(
    schoolId: string,
    subscription: SubscriptionUpdate,
  ): Promise<void>;
  checkSubscriptionExpiry(schoolId: string): Promise<ExpiryStatus>;

  // Enforcement actions
  lockSchool(schoolId: string, reason: string): Promise<void>;
  unlockSchool(schoolId: string): Promise<void>;
}

interface AccessValidation {
  allowed: boolean;
  paymentTier: PaymentTier;
  reason?: string;
  expiresAt?: Date;
  daysRemaining?: number;
}

interface SubscriptionUpdate {
  paymentTier: PaymentTier;
  paymentAmount: number;
  studentCount: number;
  accessDuration?: number; // months
}

interface ExpiryStatus {
  isExpired: boolean;
  expiresAt?: Date;
  daysRemaining?: number;
  autoRenewal: boolean;
}

enum Feature {
  SMS_MESSAGING = "SMS_MESSAGING",
  TEMPLATE_MANAGEMENT = "TEMPLATE_MANAGEMENT",
  AUTO_TRIGGERS = "AUTO_TRIGGERS",
  REPORTS = "REPORTS",
  STUDENT_MANAGEMENT = "STUDENT_MANAGEMENT",
  // ... other features
}
```

**Design Rationale:**

- **Strict validation**: Every SMS operation checks subscription status first
- **Time-based access**: Partial payments get limited-time access to encourage full payment
- **Feature-level control**: Can selectively enable/disable features based on subscription
- **Clear messaging**: Users understand why access is denied and how to restore it

### 4. Auto Trigger Engine

**Purpose**: Automatically send SMS notifications based on school events.

**Responsibilities:**

- Monitor school events (fees, payments, reports)
- Trigger SMS notifications based on configured rules
- Respect credit limits and subscription status
- Track trigger execution and prevent duplicates

**Interface:**

```typescript
interface AutoTriggerEngine {
  // Trigger configuration
  configureTrigger(schoolId: string, config: TriggerConfig): Promise<void>;
  updateTrigger(triggerId: string, updates: TriggerUpdate): Promise<void>;
  deleteTrigger(triggerId: string): Promise<void>;
  getTrigger(triggerId: string): Promise<TriggerConfig>;
  listTriggers(schoolId: string): Promise<TriggerConfig[]>;

  // Trigger execution
  evaluateTriggers(
    schoolId: string,
    event: SchoolEvent,
  ): Promise<TriggerExecution[]>;
  executeTrigger(
    triggerId: string,
    context: TriggerContext,
  ): Promise<MessageResult>;

  // Trigger management
  enableTrigger(triggerId: string): Promise<void>;
  disableTrigger(triggerId: string): Promise<void>;
}

interface TriggerConfig {
  id: string;
  schoolId: string;
  name: string;
  eventType: TriggerEventType;
  conditions: TriggerCondition[];
  templateId: string;
  enabled: boolean;
  maxPerTerm?: number; // Limit reminders per term
  intervalDays?: number; // Days between reminders
  createdAt: Date;
  updatedAt: Date;
}

enum TriggerEventType {
  FEES_OVERDUE = "FEES_OVERDUE",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  REPORT_PUBLISHED = "REPORT_PUBLISHED",
  ATTENDANCE_ABSENT = "ATTENDANCE_ABSENT",
  EXAM_SCHEDULED = "EXAM_SCHEDULED",
}

interface TriggerCondition {
  field: string;
  operator: "equals" | "greater_than" | "less_than" | "contains";
  value: string | number | boolean;
}

interface TriggerContext {
  studentId: string;
  eventData: Record<string, any>;
  triggeredAt: Date;
}

interface TriggerExecution {
  triggerId: string;
  studentId: string;
  executed: boolean;
  messageId?: string;
  error?: string;
}
```

**Design Rationale:**

- **Event-driven**: Responds to actual school events rather than polling
- **Configurable**: Schools can customize trigger conditions and intervals
- **Credit-aware**: Checks credits before sending automated messages
- **Duplicate prevention**: Tracks executions to avoid sending same message multiple times

### 5. Permission Validator

**Purpose**: Enforce role-based SMS sending permissions.

**Responsibilities:**

- Validate user permissions before SMS operations
- Enforce template restrictions by role
- Block unauthorized access attempts
- Log permission violations

**Interface:**

```typescript
interface PermissionValidator {
  // Permission checking
  canSendSMS(userId: string, schoolId: string): Promise<boolean>;
  canUseTemplate(userId: string, templateId: string): Promise<boolean>;
  canSendEmergency(userId: string, schoolId: string): Promise<boolean>;
  canManageTemplates(userId: string, schoolId: string): Promise<boolean>;

  // Permission validation
  validateSendPermission(request: SendRequest): Promise<PermissionResult>;

  // Permission queries
  getAllowedTemplates(
    userId: string,
    schoolId: string,
  ): Promise<MessageTemplate[]>;
  getUserPermissions(userId: string, schoolId: string): Promise<SMSPermissions>;
}

interface SendRequest {
  userId: string;
  schoolId: string;
  templateId: string;
  recipientCount: number;
  isEmergency: boolean;
}

interface PermissionResult {
  allowed: boolean;
  reason?: string;
  violations: string[];
}

interface SMSPermissions {
  canSend: boolean;
  canSendEmergency: boolean;
  canManageTemplates: boolean;
  allowedTemplateTypes: MessageTemplateType[];
  restrictions: string[];
}
```

**Design Rationale:**

- **Role-based**: Different roles have different messaging capabilities
- **Template-level control**: Restrict sensitive templates (fees, emergency) to authorized roles
- **Audit trail**: Log all permission checks for security review
- **Clear feedback**: Users understand what they can and cannot do

### 6. Message Logger

**Purpose**: Maintain comprehensive audit trail of all SMS communications.

**Responsibilities:**

- Log every SMS sent with full details
- Track costs per message (hidden from schools)
- Enable filtering and searching of message history
- Generate usage reports
- Support dispute resolution

**Interface:**

```typescript
interface MessageLogger {
  // Logging
  logMessage(log: MessageLog): Promise<void>;
  logCost(
    schoolId: string,
    messageId: string,
    cost: number,
    segments: number,
  ): Promise<void>;

  // Querying
  getMessageHistory(
    schoolId: string,
    filters: MessageFilters,
  ): Promise<Message[]>;
  getMessageById(messageId: string): Promise<Message>;
  searchMessages(schoolId: string, query: string): Promise<Message[]>;

  // Reporting
  generateUsageReport(
    schoolId: string,
    period: DateRange,
  ): Promise<UsageReport>;
  generateCostReport(schoolId: string, period: DateRange): Promise<CostReport>; // Super Admin only
  exportLogs(
    schoolId: string,
    filters: MessageFilters,
    format: "CSV" | "PDF",
  ): Promise<Buffer>;
}

interface MessageLog {
  schoolId: string;
  studentId: string;
  guardianId: string;
  templateType: MessageTemplateType;
  channel: MessageChannel;
  content: string;
  status: MessageStatus;
  cost?: number; // Hidden from schools
  sentBy: string; // User ID
  sentAt: Date;
}

interface MessageFilters {
  startDate?: Date;
  endDate?: Date;
  templateType?: MessageTemplateType;
  status?: MessageStatus;
  studentId?: string;
  guardianId?: string;
  sentBy?: string;
}

interface UsageReport {
  schoolId: string;
  period: DateRange;
  totalMessages: number;
  byTemplateType: Record<MessageTemplateType, number>;
  byStatus: Record<MessageStatus, number>;
  byUser: Record<string, number>;
  // Cost details hidden from schools
}

interface CostReport {
  schoolId: string;
  period: DateRange;
  totalCost: number;
  totalMessages: number;
  averageCostPerMessage: number;
  byTemplateType: Record<
    MessageTemplateType,
    {
      count: number;
      cost: number;
    }
  >;
}
```

**Design Rationale:**

- **Complete audit trail**: Every SMS logged for accountability
- **Cost tracking**: Accurate cost data for super admin reporting
- **Searchable**: Quick access to specific messages for dispute resolution
- **Export capability**: Schools can export logs for their records (without cost data)
- **Retention**: Maintain logs for at least one academic year

### 7. SMS Gateway Integration

**Purpose**: Interface with Africa's Talking SMS gateway for message delivery.

**Responsibilities:**

- Send SMS messages via Africa's Talking API
- Handle delivery status callbacks
- Implement retry logic for failed messages
- Validate phone numbers for Ugandan networks
- Track delivery status

**Interface:**

```typescript
interface SMSGateway {
  // Sending
  sendSMS(request: SMSSendRequest): Promise<SMSSendResult>;
  sendBulkSMS(recipients: string[], message: string): Promise<SMSBatchResult>;

  // Status tracking
  getDeliveryStatus(messageId: string): Promise<SMSDeliveryStatus>;
  processDeliveryCallback(payload: Record<string, any>): SMSDeliveryStatus;

  // Validation
  validatePhoneNumber(phone: string): PhoneValidation;

  // Cost estimation
  estimateCost(messageCount: number): number;
  getMessageInfo(message: string): MessageInfo;
}

interface SMSSendRequest {
  to: string | string[];
  message: string;
  from?: string; // Sender ID
}

interface SMSSendResult {
  success: boolean;
  messageId?: string;
  cost?: number;
  status: MessageStatus;
  error?: string;
  recipient: string;
}

interface SMSBatchResult {
  totalSent: number;
  totalFailed: number;
  totalCost: number;
  results: SMSSendResult[];
}

interface SMSDeliveryStatus {
  messageId: string;
  status: "Success" | "Sent" | "Buffered" | "Rejected" | "Failed";
  failureReason?: string;
  deliveredAt?: Date;
}

interface PhoneValidation {
  valid: boolean;
  formatted: string;
  error?: string;
}

interface MessageInfo {
  characters: number;
  segments: number;
  encoding: "GSM" | "Unicode";
  maxPerSegment: number;
}
```

**Design Rationale:**

- **Gateway abstraction**: Easy to switch SMS providers if needed
- **Ugandan focus**: Phone validation specific to Ugandan number formats
- **Delivery tracking**: Monitor message delivery for reliability
- **Cost calculation**: Accurate cost tracking based on message segments

## Data Models

### Core Models

```typescript
// SMS Template
interface MessageTemplate {
  id: string;
  schoolId: string;
  type: MessageTemplateType;
  channel: MessageChannel;
  content: string; // With {{variable}} placeholders
  allowedRoles: Role[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

enum MessageTemplateType {
  FEES_REMINDER = "FEES_REMINDER",
  PAYMENT_CONFIRMATION = "PAYMENT_CONFIRMATION",
  REPORT_AVAILABLE = "REPORT_AVAILABLE",
  ATTENDANCE_ABSENT = "ATTENDANCE_ABSENT",
  EXAM_SCHEDULE = "EXAM_SCHEDULE",
  GENERAL_ANNOUNCEMENT = "GENERAL_ANNOUNCEMENT",
  EMERGENCY_ALERT = "EMERGENCY_ALERT",
}

// SMS Message
interface Message {
  id: string;
  schoolId: string;
  studentId: string;
  guardianId: string;
  templateType: MessageTemplateType;
  channel: MessageChannel;
  content: string; // Rendered content
  shortUrl?: string;
  status: MessageStatus;
  cost?: number; // Hidden from schools
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  retryCount: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

enum MessageStatus {
  QUEUED = "QUEUED",
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  FAILED = "FAILED",
  READ = "READ",
}

// SMS Credit Allocation (Super Admin only)
interface SMSCreditAllocation {
  id: string;
  schoolId: string;
  paymentTier: PaymentTier;
  studentCount: number;
  creditsAllocated: number; // 9x, 4.5x, or 2.25x student count
  creditsUsed: number;
  creditsRemaining: number;
  accessExpiresAt?: Date; // For HALF and QUARTER tiers
  createdAt: Date;
  updatedAt: Date;
}

// SMS Cost Log (Super Admin only)
interface SMSCostLog {
  id: string;
  schoolId: string;
  messageId: string;
  studentId: string;
  cost: number; // Actual cost in UGX
  recipient: string;
  segments: number;
  createdAt: Date;
}

// School Subscription Status
interface SchoolSubscription {
  id: string;
  schoolId: string;
  paymentTier: PaymentTier;
  paymentAmount: number;
  studentCount: number;
  isActive: boolean;
  accessExpiresAt?: Date;
  lastPaymentDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Auto Trigger Configuration
interface AutoTrigger {
  id: string;
  schoolId: string;
  name: string;
  eventType: TriggerEventType;
  conditions: TriggerCondition[];
  templateId: string;
  enabled: boolean;
  maxPerTerm?: number;
  intervalDays?: number;
  lastExecutedAt?: Date;
  executionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Trigger Execution Log
interface TriggerExecutionLog {
  id: string;
  triggerId: string;
  schoolId: string;
  studentId: string;
  eventData: Record<string, any>;
  messageId?: string;
  success: boolean;
  error?: string;
  executedAt: Date;
}
```

### Database Schema Extensions

The following models need to be added to the Prisma schema:

```prisma
// SMS Credit Allocation (Super Admin visibility only)
model SMSCreditAllocation {
  id                String      @id @default(auto()) @map("_id") @db.ObjectId
  schoolId          String      @db.ObjectId
  paymentTier       PaymentTier
  studentCount      Int
  creditsAllocated  Int
  creditsUsed       Int         @default(0)
  creditsRemaining  Int
  accessExpiresAt   DateTime?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  @@unique([schoolId])
  @@index([schoolId])
  @@index([paymentTier])
}

// School Subscription Status
model SchoolSubscription {
  id              String      @id @default(auto()) @map("_id") @db.ObjectId
  schoolId        String      @db.ObjectId
  paymentTier     PaymentTier
  paymentAmount   Float
  studentCount    Int
  isActive        Boolean     @default(true)
  accessExpiresAt DateTime?
  lastPaymentDate DateTime
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@unique([schoolId])
  @@index([schoolId])
  @@index([isActive])
  @@index([accessExpiresAt])
}

// Auto Trigger Configuration
model AutoTrigger {
  id              String            @id @default(auto()) @map("_id") @db.ObjectId
  schoolId        String            @db.ObjectId
  name            String
  eventType       TriggerEventType
  conditions      Json              // Array of TriggerCondition
  templateId      String            @db.ObjectId
  enabled         Boolean           @default(true)
  maxPerTerm      Int?
  intervalDays    Int?
  lastExecutedAt  DateTime?
  executionCount  Int               @default(0)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([schoolId])
  @@index([eventType])
  @@index([enabled])
}

// Trigger Execution Log
model TriggerExecutionLog {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  triggerId   String   @db.ObjectId
  schoolId    String   @db.ObjectId
  studentId   String   @db.ObjectId
  eventData   Json
  messageId   String?  @db.ObjectId
  success     Boolean
  error       String?
  executedAt  DateTime @default(now())

  @@index([triggerId])
  @@index([schoolId])
  @@index([studentId])
  @@index([executedAt])
}

enum PaymentTier {
  FULL
  HALF
  QUARTER
  NONE
}

enum TriggerEventType {
  FEES_OVERDUE
  PAYMENT_RECEIVED
  REPORT_PUBLISHED
  ATTENDANCE_ABSENT
  EXAM_SCHEDULED
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property Reflection

After analyzing all acceptance criteria, I've identified the following consolidations:

**Redundancy Analysis:**

- Properties 1.1-1.6 (template management) can be consolidated into fewer comprehensive properties
- Properties 2.1, 2.4, 2.5 (credit checking) overlap and can be combined
- Properties 3.1-3.3 (auto triggers) follow the same pattern and can be generalized
- Properties 4.1-4.5 (role permissions) can be consolidated into role-based access properties
- Properties 5.1-5.3 (logging) can be combined into comprehensive audit trail properties
- Properties 6.1-6.4 (contact management) can be consolidated
- Properties 8.1-8.3 (integration triggers) follow the same pattern
- Properties 9.1-9.3 (gateway integration) can be consolidated
- Properties 10.1, 10.4, 10.5 (emergency handling) overlap

**Consolidated Properties:**
After reflection, we'll create comprehensive properties that cover multiple related criteria rather than one property per criterion. This reduces redundancy while maintaining complete coverage.

### Correctness Properties

#### Property 1: Template Variable Validation

_For any_ SMS template content, all variables must be properly formatted (enclosed in {{}}), and only predefined variables should be accepted. Invalid or undefined variables should cause validation to fail.

**Validates: Requirements 1.2, 1.4**

#### Property 2: Template Character Limit Enforcement

_For any_ SMS template, if the rendered content exceeds 320 characters, the system should reject the template and prevent saving.

**Validates: Requirements 1.6**

#### Property 3: Template Preview Consistency

_For any_ SMS template and sample data, the preview function should correctly substitute all variables with the provided sample values, producing the same output as would be sent to recipients.

**Validates: Requirements 1.3**

#### Property 4: Role-Based Template Access

_For any_ user and template, the user should only be able to edit or use templates that their role is authorized to access. Unauthorized access attempts should be denied and logged.

**Validates: Requirements 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**

#### Property 5: Credit Limit Enforcement

_For any_ school and message type, when SMS credits are insufficient, non-emergency messages should be blocked, while emergency messages with configured reserves should be allowed to proceed.

**Validates: Requirements 2.1, 2.4, 10.1**

#### Property 6: SMS Cost Calculation

_For any_ message content, the cost calculation should count each 160-character segment (GSM encoding) or 70-character segment (Unicode encoding) as one SMS unit at UGX 45 per unit.

**Validates: Requirements 2.3**

#### Property 7: Credit Threshold Notifications

_For any_ school, when SMS credits fall below a configured threshold percentage, the system should generate and send a notification to administrators.

**Validates: Requirements 2.2**

#### Property 8: Limit Reset Enforcement

_For any_ school, when daily or term limits are reached, the system should block further SMS sending until the appropriate reset occurs (daily at midnight, term at term end).

**Validates: Requirements 2.5, 8.6**

#### Property 9: Auto Trigger Execution

_For any_ configured auto trigger and matching event, when the trigger conditions are met and credits are available, the system should execute the trigger and send the associated message.

**Validates: Requirements 3.1, 3.2, 3.3, 3.6, 8.1, 8.2, 8.3**

#### Property 10: Trigger Configuration Validation

_For any_ auto trigger configuration, the system should accept and store reminder intervals and maximum reminders per term, and enforce these limits during execution.

**Validates: Requirements 3.4**

#### Property 11: Manual Approval Requirement

_For any_ school with automation disabled, all messages should require manual approval before sending, regardless of trigger conditions.

**Validates: Requirements 3.5**

#### Property 12: Comprehensive Message Logging

_For any_ SMS sent, the message log should record all required fields: sender ID, template type, cost, recipient, timestamp, status, and content. No message should be sent without creating a log entry.

**Validates: Requirements 5.1, 5.3**

#### Property 13: Log Query Correctness

_For any_ log query with filters (date range, template type, status, etc.), the returned results should match all specified filter criteria and be sorted by timestamp.

**Validates: Requirements 5.2**

#### Property 14: Cost Report Accuracy

_For any_ reporting period and school, the total cost calculation should equal the sum of individual message costs, and costs should be correctly grouped by template type.

**Validates: Requirements 5.4**

#### Property 15: Data Retention Compliance

_For any_ message log entry, records should be retained for at least one academic year from the creation date and should not be deleted before this period expires.

**Validates: Requirements 5.5**

#### Property 16: Export Format Validity

_For any_ log export request, the system should generate valid CSV or PDF files containing all requested log entries with proper formatting.

**Validates: Requirements 5.6**

#### Property 17: Phone Number Validation

_For any_ phone number input, the system should validate the format against Ugandan network patterns (+256[37][0-9]{8}) and reject invalid formats.

**Validates: Requirements 6.1, 6.2, 6.6**

#### Property 18: Primary Contact Selection

_For any_ student with multiple guardian contacts, when sending a message without explicit recipient override, the system should use the primary contact's phone number.

**Validates: Requirements 6.3, 6.4**

#### Property 19: Communication Preference Enforcement

_For any_ guardian with opt-out preferences for specific message types, the system should not send messages of those types to that guardian.

**Validates: Requirements 6.5**

#### Property 20: Payment Confirmation Completeness

_For any_ payment confirmation message, the rendered content should include both the receipt number and the remaining balance amount.

**Validates: Requirements 7.2**

#### Property 21: Report Notification Content Restriction

_For any_ report availability notification, the message content should not contain actual marks or grades, only notification that reports are available.

**Validates: Requirements 7.3**

#### Property 22: Announcement Character Limit

_For any_ announcement message, the system should enforce the character limit and reject announcements that exceed the maximum length.

**Validates: Requirements 7.4**

#### Property 23: Short URL Generation

_For any_ report card notification, the system should generate and include a valid shortened URL that links to the online report access page.

**Validates: Requirements 8.5**

#### Property 24: Timetable Change Broadcasting

_For any_ timetable change event, when broadcasting is enabled, the system should allow sending schedule update messages to affected students' guardians.

**Validates: Requirements 8.4**

#### Property 25: Gateway Provider Support

_For any_ Ugandan phone number from major providers (MTN, Airtel, Africell), the SMS gateway should successfully deliver messages to that provider's network.

**Validates: Requirements 9.1**

#### Property 26: Retry with Exponential Backoff

_For any_ failed SMS send attempt, the system should retry with exponentially increasing delays (5min, 15min, 30min) up to a maximum of 2 retries before marking as permanently failed.

**Validates: Requirements 9.2**

#### Property 27: Delivery Status Tracking

_For any_ sent SMS, when delivery reports are received from the gateway, the system should update the message status to reflect the current delivery state (sent, delivered, failed).

**Validates: Requirements 9.3**

#### Property 28: Gateway Cost Configuration

_For any_ SMS cost configuration update, the new cost should be applied to all subsequent cost calculations without requiring system restart.

**Validates: Requirements 9.4**

#### Property 29: Gateway Failover

_For any_ bulk send operation, when the primary gateway fails, the system should automatically attempt to send through the configured backup gateway.

**Validates: Requirements 9.5**

#### Property 30: Rate Limiting Enforcement

_For any_ bulk SMS send operation, the system should enforce rate limits (maximum messages per second) to prevent gateway blocking, spacing sends appropriately.

**Validates: Requirements 9.6**

#### Property 31: Emergency Two-Factor Confirmation

_For any_ emergency alert send request, the system should require two-factor confirmation (e.g., password re-entry or OTP) before allowing the send to proceed.

**Validates: Requirements 10.2**

#### Property 32: Emergency Broadcast to All Contacts

_For any_ emergency message, the system should send to all registered guardian contacts (primary and secondary) for all students simultaneously.

**Validates: Requirements 10.3**

#### Property 33: Emergency Message Permanent Logging

_For any_ emergency message, the log entry should be marked as permanent and excluded from any automated log cleanup or archival processes.

**Validates: Requirements 10.4**

#### Property 34: Emergency Credit Pool Separation

_For any_ school with emergency reserves configured, emergency credits should be tracked separately from regular credits and should not be depleted by non-emergency messages.

**Validates: Requirements 10.5**

#### Property 35: Emergency Protocol Notification

_For any_ emergency protocol activation, the system should immediately send notifications to all school administrators (head teacher, deputies, super admin).

**Validates: Requirements 10.6**

#### Property 36: Subscription-Based Credit Allocation

_For any_ school with a given payment tier and student count, the allocated SMS credits should equal: FULL tier = 9 × student count, HALF tier = 4.5 × student count, QUARTER tier = 2.25 × student count, NONE tier = 0 credits.

**Validates: Requirements 2 (subscription model from requirements intro)**

#### Property 37: Access Restriction by Payment Status

_For any_ school with payment tier NONE, all SMS features and other system features should be completely blocked and inaccessible.

**Validates: Requirements 2 (subscription model from requirements intro)**

#### Property 38: Time-Limited Access for Partial Payment

_For any_ school with HALF or QUARTER payment tier, system access should be automatically revoked after one month from the payment date.

**Validates: Requirements 2 (subscription model from requirements intro)**

#### Property 39: Cost Visibility Restriction

_For any_ school user (non-super-admin), SMS cost information and actual credit counts should be hidden from all UI displays and API responses. Only super admins should see actual costs and credit counts.

**Validates: Requirements 2 (subscription model from requirements intro)**

## Error Handling

### Error Categories

**1. Validation Errors**

- Invalid template variables
- Character limit exceeded
- Invalid phone number format
- Missing required fields

**Response**: Return clear error messages to user, do not send message, log validation failure.

**2. Permission Errors**

- Unauthorized template access
- Insufficient role permissions
- Emergency alert without authorization

**Response**: Deny access, log permission violation, notify administrators for security review.

**3. Credit Errors**

- Insufficient credits
- Subscription expired
- Daily/term limit reached

**Response**: Block message send, display clear error to user explaining credit status, suggest contacting admin or making payment.

**4. Gateway Errors**

- Network timeout
- Invalid recipient
- Gateway service unavailable

**Response**: Retry with exponential backoff, attempt failover gateway if configured, log error details, notify administrators if persistent.

**5. System Errors**

- Database connection failure
- Template rendering error
- Trigger execution failure

**Response**: Log error with full stack trace, alert system administrators, return generic error to user, queue for retry if applicable.

### Error Handling Strategies

**Retry Logic:**

- SMS send failures: Retry up to 2 times with exponential backoff (5min, 15min, 30min)
- Gateway timeouts: Immediate retry once, then exponential backoff
- Database errors: Retry up to 3 times with 1-second delays

**Fallback Mechanisms:**

- Primary gateway failure → Secondary gateway (if configured)
- SMS failure → WhatsApp fallback (if available)
- WhatsApp failure → Email fallback (if available)

**User Feedback:**

- Validation errors: Immediate feedback with specific field errors
- Permission errors: Clear explanation of required permissions
- Credit errors: Display remaining credits (for super admin) or generic "insufficient credits" message (for schools)
- Gateway errors: "Message queued for retry" or "Delivery delayed"

**Logging:**

- All errors logged with timestamp, user ID, school ID, error type, error message
- Permission violations logged separately for security audit
- Gateway errors include full request/response details for debugging

## Testing Strategy

### Dual Testing Approach

The SMS Communication System will be validated using both unit tests and property-based tests:

**Unit Tests** will verify:

- Specific examples of template rendering
- Edge cases (empty templates, maximum character limits)
- Error conditions (invalid phone numbers, missing data)
- Integration points between components
- Example scenarios from requirements (14-day overdue fees, payment confirmation)

**Property-Based Tests** will verify:

- Universal properties across all inputs (see Correctness Properties section)
- Template validation with randomly generated content
- Credit calculations with various message lengths and student counts
- Permission checks with random user/role combinations
- Cost calculations with random message segments

### Property-Based Testing Configuration

**Framework**: fast-check (TypeScript/JavaScript property-based testing library)

**Test Configuration:**

- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: sms-communication-system, Property N: [property description]`

**Example Test Structure:**

```typescript
import fc from "fast-check";

describe("SMS Communication System Properties", () => {
  it("Property 6: SMS Cost Calculation", () => {
    // Feature: sms-communication-system, Property 6: SMS cost calculation
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 1000 }),
        (messageContent) => {
          const info = getMessageInfo(messageContent);
          const cost = calculateCost(info.segments);

          // Each segment costs UGX 45
          expect(cost).toBe(info.segments * 45);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("Property 17: Phone Number Validation", () => {
    // Feature: sms-communication-system, Property 17: Phone number validation
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant("+256772123456"), // Valid MTN
          fc.constant("+256752123456"), // Valid Airtel
          fc.constant("+256392123456"), // Valid Africell
          fc.constant("0772123456"), // Valid local format
          fc.constant("+254712345678"), // Invalid (Kenya)
          fc.constant("123456"), // Invalid (too short)
        ),
        (phoneNumber) => {
          const result = validatePhoneNumber(phoneNumber);

          if (phoneNumber.startsWith("+256") && phoneNumber.length === 13) {
            expect(result.valid).toBe(true);
          } else if (phoneNumber.startsWith("0") && phoneNumber.length === 10) {
            expect(result.valid).toBe(true);
            expect(result.formatted).toMatch(/^\+256/);
          } else {
            expect(result.valid).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
```

### Test Coverage Goals

- **Unit Test Coverage**: Minimum 80% code coverage
- **Property Test Coverage**: All 39 correctness properties implemented
- **Integration Test Coverage**: All component interactions tested
- **End-to-End Test Coverage**: Critical user flows (send SMS, configure trigger, view logs)

### Testing Priorities

**High Priority** (must pass before deployment):

1. Credit limit enforcement (Properties 5, 8, 36, 37, 38)
2. Cost calculation accuracy (Property 6)
3. Permission validation (Property 4)
4. Phone number validation (Property 17)
5. Message logging completeness (Property 12)

**Medium Priority** (should pass before deployment):

1. Template validation (Properties 1, 2, 3)
2. Auto trigger execution (Properties 9, 10, 11)
3. Retry and failover logic (Properties 26, 29)
4. Emergency message handling (Properties 31-35)

**Low Priority** (can be fixed post-deployment):

1. Export format validation (Property 16)
2. UI-specific validations (Properties 21, 22)
3. Report generation (Property 14)

## Implementation Notes

### Technology Stack

**Backend:**

- Node.js with TypeScript
- Prisma ORM for database access
- Africa's Talking SDK for SMS gateway
- Bull queue for background job processing

**Database:**

- MongoDB (existing schema)
- New collections: SMSCreditAllocation, SchoolSubscription, AutoTrigger, TriggerExecutionLog

**Testing:**

- Vitest for unit tests
- fast-check for property-based tests
- Supertest for API integration tests

### Security Considerations

**1. Cost Data Protection:**

- Actual SMS costs and credit counts stored in separate tables with restricted access
- API endpoints for cost data require SUPER_ADMIN role
- School-facing APIs return only boolean "has access" status, never actual counts

**2. Permission Enforcement:**

- Every SMS operation validates user permissions before execution
- Template access controlled at database level with role checks
- Emergency alerts require two-factor authentication

**3. Audit Trail:**

- All SMS sends logged with sender identity
- Permission violations logged separately for security review
- Logs immutable (no updates or deletes allowed)

**4. Rate Limiting:**

- Per-school rate limits to prevent abuse
- Per-user rate limits for template management
- Gateway-level rate limiting to prevent blocking

### Performance Considerations

**1. Bulk Sending:**

- Process in batches of 100 messages
- Use background job queue (Bull) for large sends
- Implement progress tracking for user feedback

**2. Database Optimization:**

- Index on schoolId, studentId, status for message queries
- Index on eventType, enabled for trigger lookups
- Compound index on schoolId + createdAt for log queries

**3. Caching:**

- Cache template content for 5 minutes
- Cache school subscription status for 1 minute
- Cache user permissions for 5 minutes

**4. Background Processing:**

- Auto trigger evaluation runs every 5 minutes
- Delivery status polling runs every 10 minutes
- Credit threshold checks run every hour

### Deployment Considerations

**1. Migration Strategy:**

- Add new database models without breaking existing functionality
- Migrate existing Message and MessageTemplate data to new schema
- Backfill SMSCreditAllocation for existing schools based on current student counts

**2. Feature Flags:**

- Enable subscription enforcement gradually (start with warnings, then hard blocks)
- Enable auto triggers per school (opt-in initially)
- Enable emergency reserves per school (opt-in)

**3. Monitoring:**

- Track SMS send success rate (target: >95%)
- Monitor gateway response times (target: <2 seconds)
- Alert on credit depletion (80% threshold)
- Alert on permission violations (potential security issues)

**4. Rollback Plan:**

- Keep old SMS sending code path available
- Feature flag to disable subscription enforcement
- Database migration rollback scripts prepared

### Integration Points

**1. Finance System:**

- Listen for payment events to trigger confirmation SMS
- Query outstanding fees for reminder triggers
- Update payment status in SMS logs

**2. Academic System:**

- Listen for report publication events
- Query student marks for report availability
- Generate secure links for report access

**3. Attendance System:**

- Listen for absence events
- Query attendance patterns for escalation
- Send absence notifications to guardians

**4. User Management:**

- Query user roles for permission validation
- Validate user identity for audit logs
- Check user status (active/suspended) before allowing sends

## Appendix

### Template Variable Reference

**Student Variables:**

- `{{student_name}}` - Full name of student
- `{{student_class}}` - Class and stream
- `{{admission_number}}` - Student admission number

**Guardian Variables:**

- `{{guardian_name}}` - Guardian full name
- `{{guardian_title}}` - Mr./Mrs./Ms.

**School Variables:**

- `{{school_name}}` - School name
- `{{school_phone}}` - School contact number
- `{{school_address}}` - School address

**Financial Variables:**

- `{{amount}}` - Payment or fee amount
- `{{balance}}` - Remaining balance
- `{{receipt_number}}` - Payment receipt number
- `{{due_date}}` - Fee due date

**Academic Variables:**

- `{{term}}` - Current term name
- `{{report_url}}` - Shortened URL for report access
- `{{exam_name}}` - Examination name
- `{{exam_date}}` - Examination date

**System Variables:**

- `{{date}}` - Current date
- `{{time}}` - Current time

### Default Template Examples

**Fees Reminder (Polite):**

```
Dear {{guardian_title}} {{guardian_name}}, this is a gentle reminder that {{student_name}} ({{student_class}}) has an outstanding balance of UGX {{balance}}. We kindly request payment by {{due_date}}. Thank you. - {{school_name}}
```

**Payment Confirmation:**

```
Dear {{guardian_title}} {{guardian_name}}, we confirm receipt of UGX {{amount}} for {{student_name}} ({{student_class}}). Receipt #{{receipt_number}}. Remaining balance: UGX {{balance}}. Thank you. - {{school_name}}
```

**Report Available:**

```
Dear {{guardian_title}} {{guardian_name}}, {{student_name}}'s {{term}} report is ready. View online: {{report_url}}. Contact school for printed copy. - {{school_name}}
```

**Emergency Alert:**

```
URGENT: {{school_name}} - {{emergency_message}}. Please contact {{school_phone}} immediately for more information.
```

### API Endpoint Reference

**Template Management:**

- `POST /api/sms/templates` - Create template
- `GET /api/sms/templates` - List templates
- `GET /api/sms/templates/:id` - Get template
- `PUT /api/sms/templates/:id` - Update template
- `DELETE /api/sms/templates/:id` - Delete template
- `POST /api/sms/templates/:id/preview` - Preview template

**Message Sending:**

- `POST /api/sms/send` - Send single SMS
- `POST /api/sms/send-bulk` - Send bulk SMS
- `GET /api/sms/messages` - List messages
- `GET /api/sms/messages/:id` - Get message details

**Credit Management (Super Admin only):**

- `GET /api/sms/credits/:schoolId` - Get credit allocation
- `POST /api/sms/credits/:schoolId` - Allocate credits
- `GET /api/sms/credits/reports/system` - System-wide credit report

**Auto Triggers:**

- `POST /api/sms/triggers` - Create trigger
- `GET /api/sms/triggers` - List triggers
- `GET /api/sms/triggers/:id` - Get trigger
- `PUT /api/sms/triggers/:id` - Update trigger
- `DELETE /api/sms/triggers/:id` - Delete trigger
- `POST /api/sms/triggers/:id/enable` - Enable trigger
- `POST /api/sms/triggers/:id/disable` - Disable trigger

**Reporting:**

- `GET /api/sms/logs` - Get message logs
- `GET /api/sms/reports/usage` - Usage report
- `GET /api/sms/reports/costs` - Cost report (Super Admin only)
- `POST /api/sms/logs/export` - Export logs (CSV/PDF)

### Glossary

- **SMS Segment**: A 160-character unit (GSM encoding) or 70-character unit (Unicode) that counts as one SMS for billing
- **Credit**: A unit representing one SMS segment worth UGX 45
- **Payment Tier**: The level of payment (FULL, HALF, QUARTER, NONE) determining SMS allocation
- **Auto Trigger**: An automated rule that sends SMS based on school events
- **Template Variable**: A placeholder in template content (e.g., {{student_name}}) replaced with actual data
- **Emergency Reserve**: Separate pool of SMS credits reserved for emergency alerts
- **Primary Contact**: The default guardian phone number used for SMS delivery
- **Delivery Status**: The current state of an SMS (queued, sent, delivered, failed, read)
- **Exponential Backoff**: Retry strategy with increasing delays between attempts
- **Rate Limiting**: Restriction on number of messages sent per time period
