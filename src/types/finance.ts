/**
 * Finance Module Types
 * Comprehensive type definitions for the finance system
 * Requirements: 1.1, 1.2, 2.2, 4.1
 */
  
// ============================================
// ENUMS - Match Prisma schema exactly
// ============================================

export type FeeCategory = 'TUITION' | 'BOARDING' | 'TRANSPORT' | 'MEALS' | 'UNIFORM' | 'BOOKS' | 'EXAMINATION' | 'ACTIVITY' | 'OTHER'
export type StudentType = 'DAY' | 'BOARDING'
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT'
export type DiscountStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'
export type PaymentRecordStatus = 'PENDING' | 'CONFIRMED' | 'REVERSED' | 'CANCELLED'
// Note: PaymentMethod in Prisma schema is CASH | MOBILE_MONEY | BANK (no CHEQUE)
// Adding CHEQUE for design compatibility - ensure Prisma schema is updated if needed
export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'BANK' | 'CHEQUE'

// Finance Audit Actions
export type FinanceAuditAction =
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_REVERSED'
  | 'DISCOUNT_APPLIED'
  | 'DISCOUNT_APPROVED'
  | 'DISCOUNT_REJECTED'
  | 'DISCOUNT_REMOVED'
  | 'PENALTY_APPLIED'
  | 'PENALTY_WAIVED'
  | 'FEE_STRUCTURE_CREATED'
  | 'FEE_STRUCTURE_UPDATED'
  | 'RECEIPT_CANCELLED'
  | 'SETTINGS_UPDATED'
  | 'INVOICE_GENERATED'
  | 'INVOICE_CANCELLED'

// Payment Status for balance monitoring
export type PaymentStatusCategory = 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERPAID'

// ============================================
// FEE STRUCTURE TYPES
// ============================================

// Fee Structure
export interface FeeStructureItem {
  id: string
  name: string
  category: FeeCategory
  amount: number
  isOptional: boolean
  isOneTime: boolean
  description?: string
}

export interface FeeStructure {
  id: string
  schoolId: string
  classId: string
  className: string
  termId: string
  termName: string
  studentType: StudentType
  totalAmount: number
  dueDate?: string
  isActive: boolean
  items: FeeStructureItem[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Fee Structure Service Input Types
export interface CreateFeeStructureInput {
  schoolId: string
  classId: string
  termId: string
  studentType: StudentType
  dueDate?: Date
  items: FeeItemInput[]
  createdBy: string
}

export interface FeeItemInput {
  name: string
  category: FeeCategory
  amount: number
  isOptional: boolean
  isOneTime: boolean
  description?: string
}

export interface UpdateFeeStructureInput {
  dueDate?: Date
  isActive?: boolean
  items?: FeeItemInput[]
}

export interface FeeStructureFilters {
  academicYearId?: string
  termId?: string
  classId?: string
  studentType?: StudentType
  isActive?: boolean
}

// ============================================
// STUDENT ACCOUNT TYPES
// ============================================

// Student Account
export interface StudentAccount {
  id: string
  studentId: string
  studentName: string
  admissionNumber: string
  className: string
  streamName?: string
  studentType: StudentType
  totalFees: number
  totalPaid: number
  totalDiscounts: number
  totalPenalties: number
  balance: number
  lastPaymentDate?: string
  lastPaymentAmount?: number
  paymentStatus: PaymentStatusCategory
  createdAt: string
  updatedAt: string
}

// Balance Breakdown for calculations
export interface BalanceBreakdown {
  totalFees: number
  totalPaid: number
  totalDiscounts: number
  totalPenalties: number
  balance: number // totalFees - totalPaid - totalDiscounts + totalPenalties
}

// Student Account Details with full history
export interface StudentAccountDetails extends StudentAccount {
  paymentHistory: PaymentRecord[]
  discounts: StudentDiscount[]
  penalties: StudentPenalty[]
  invoices: Invoice[]
}

// ============================================
// PAYMENT TYPES
// ============================================

// Payment
export interface PaymentRecord {
  id: string
  schoolId: string
  studentId: string
  studentName: string
  admissionNumber: string
  guardianId?: string
  guardianName?: string
  termId: string
  termName: string
  amount: number
  method: PaymentMethod
  reference: string
  bankName?: string
  chequeNumber?: string
  mobileNumber?: string
  notes?: string
  status: PaymentRecordStatus
  receivedBy: string
  receivedByName: string
  receivedAt: string
  receiptId?: string
  receiptNumber?: string
  reversedBy?: string
  reversedByName?: string
  reversedAt?: string
  reversalReason?: string
  createdAt: string
  updatedAt: string
}

// Payment Service Input Types
export interface RecordPaymentInput {
  schoolId: string
  studentId: string
  guardianId?: string
  termId: string
  amount: number
  method: PaymentMethod
  reference: string
  bankName?: string
  chequeNumber?: string
  mobileNumber?: string
  notes?: string
  receivedBy: string
  receivedByName: string
  receivedAt: Date // Must not be future date
}

export interface PaymentResult {
  payment: PaymentRecord
  receipt: Receipt
  updatedBalance: number
}

export interface PaymentFilters {
  studentId?: string
  guardianId?: string
  termId?: string
  method?: PaymentMethod
  status?: PaymentRecordStatus
  dateFrom?: Date
  dateTo?: Date
}

export interface PaymentWithReceipt extends PaymentRecord {
  receipt?: Receipt
}

// ============================================
// RECEIPT TYPES
// ============================================

// Receipt
export interface Receipt {
  id: string
  receiptNumber: string
  schoolId: string
  schoolName?: string
  schoolAddress?: string
  schoolPhone?: string
  studentId: string
  studentName: string
  admissionNumber?: string
  guardianId?: string
  guardianName?: string
  className: string
  termName: string
  amount: number
  amountInWords: string
  method: PaymentMethod
  reference: string
  balanceBefore: number
  balanceAfter: number
  issuedBy: string
  issuedByName: string
  issuedAt: string
  // Receipts are immutable - no updatedAt
}

export interface ReceiptSearchFilters {
  receiptNumber?: string
  studentName?: string
  studentId?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface CancellationRequest {
  id: string
  receiptId: string
  requestedBy: string
  requestedAt: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedBy?: string
  approvedAt?: string
}

// ============================================
// INVOICE TYPES
// ============================================

// Invoice
export interface Invoice {
  id: string
  invoiceNumber: string
  schoolId: string
  studentId: string
  studentName: string
  admissionNumber: string
  guardianId?: string
  guardianName?: string
  className: string
  termId: string
  termName: string
  feeStructureId: string
  subtotal: number
  discountAmount: number
  penaltyAmount: number
  totalAmount: number
  paidAmount: number
  balance: number
  dueDate: string
  status: InvoiceStatus
  items: InvoiceItem[]
  issuedAt?: string
  issuedBy?: string
  createdAt: string
  updatedAt: string
}

export interface InvoiceItem {
  id: string
  invoiceId?: string
  description: string
  category: FeeCategory
  amount: number
  isOptional: boolean
}

export interface InvoiceFilters {
  studentId?: string
  guardianId?: string
  termId?: string
  classId?: string
  status?: InvoiceStatus
  dueDateFrom?: Date
  dueDateTo?: Date
}

// ============================================
// DISCOUNT TYPES
// ============================================

// Discount
export interface DiscountRule {
  id: string
  schoolId: string
  name: string
  description?: string
  type: DiscountType
  value: number
  maxAmount?: number
  isActive: boolean
  requiresApproval: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface StudentDiscount {
  id: string
  studentAccountId: string
  studentId: string
  studentName: string
  discountRuleId?: string
  discountRuleName?: string
  termId: string
  termName: string
  name: string
  type: DiscountType
  value: number
  calculatedAmount: number
  reason?: string
  sponsorName?: string
  status: DiscountStatus
  appliedBy: string
  appliedByName?: string
  appliedAt: string
  approvedBy?: string
  approvedByName?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedByName?: string
  rejectedAt?: string
  rejectionReason?: string
}

export interface ApplyDiscountInput {
  studentAccountId: string
  termId: string
  name: string
  type: DiscountType
  value: number
  reason?: string
  sponsorName?: string
  appliedBy: string
}

// ============================================
// PENALTY TYPES
// ============================================

// Penalty
export interface PenaltyRule {
  id: string
  schoolId: string
  name: string
  description?: string
  type: DiscountType // PERCENTAGE or FIXED_AMOUNT
  value: number
  gracePeriodDays: number
  isAutomatic: boolean
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface StudentPenalty {
  id: string
  studentAccountId: string
  studentId: string
  studentName: string
  penaltyRuleId?: string
  penaltyRuleName?: string
  termId: string
  termName: string
  name: string
  amount: number
  reason?: string
  isWaived: boolean
  waivedBy?: string
  waivedByName?: string
  waivedAt?: string
  waiverReason?: string
  appliedBy: string
  appliedByName?: string
  appliedAt: string
}

export interface ApplyPenaltyInput {
  studentAccountId: string
  termId: string
  name: string
  amount: number
  reason?: string
  appliedBy: string
}

export interface ApplyPenaltiesResult {
  appliedCount: number
  skippedCount: number
  totalPenaltyAmount: number
  penalties: StudentPenalty[]
}

// ============================================
// REPORT TYPES
// ============================================

// Finance Reports
export interface DailyCollectionReport {
  date: string
  schoolId: string
  totalAmount: number
  transactionCount: number
  byMethod: PaymentMethodBreakdown[]
  byClass: ClassCollectionBreakdown[]
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod
  amount: number
  count: number
  percentage?: number
}

export interface ClassCollectionBreakdown {
  classId: string
  className: string
  amount: number
  count: number
}

export interface TermCollectionReport {
  termId: string
  termName: string
  schoolId: string
  totalExpected: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number // (totalCollected / totalExpected) * 100
  byClass: ClassTermCollection[]
  byMethod: PaymentMethodBreakdown[]
}

export interface ClassTermCollection {
  classId: string
  className: string
  expected: number
  collected: number
  outstanding: number
  studentCount: number
  paidCount: number
  partialCount: number
  unpaidCount: number
  collectionRate: number
}

export interface ClassCollectionReport {
  classId: string
  className: string
  termId: string
  termName: string
  totalExpected: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number
  students: StudentPaymentSummary[]
}

export interface StudentPaymentSummary {
  studentId: string
  studentName: string
  admissionNumber: string
  totalFees: number
  totalPaid: number
  balance: number
  status: PaymentStatusCategory
  lastPaymentDate?: string
  daysOverdue?: number
}

export interface PaymentMethodReport {
  termId: string
  termName: string
  totalAmount: number
  methods: PaymentMethodBreakdown[]
}

export interface OutstandingBalancesReport {
  termId: string
  termName: string
  totalOutstanding: number
  studentCount: number
  students: OutstandingStudent[]
  byAging: AgingBucket[]
}

export interface OutstandingStudent {
  studentId: string
  studentName: string
  admissionNumber: string
  className: string
  guardianName?: string
  guardianPhone?: string
  balance: number
  dueDate?: string
  daysOverdue: number
  lastPaymentDate?: string
}

export interface AgingBucket {
  label: string // e.g., "0-30 days", "31-60 days", "61-90 days", "90+ days"
  minDays: number
  maxDays?: number
  amount: number
  count: number
}

export interface DiscountsPenaltiesReport {
  termId: string
  termName: string
  totalDiscounts: number
  totalPenalties: number
  discountCount: number
  penaltyCount: number
  discounts: DiscountSummary[]
  penalties: PenaltySummary[]
}

export interface DiscountSummary {
  name: string
  type: DiscountType
  count: number
  totalAmount: number
}

export interface PenaltySummary {
  name: string
  count: number
  totalAmount: number
  waivedCount: number
  waivedAmount: number
}

export interface DefaultersReport {
  termId?: string
  termName?: string
  students: DefaulterStudent[]
  totalOutstanding: number
  studentCount: number
}

export interface DefaulterStudent {
  id: string
  name: string
  admissionNumber: string
  className: string
  guardianName?: string
  guardianPhone?: string
  totalFees: number
  totalPaid: number
  balance: number
  lastPaymentDate?: string
  daysOverdue: number
}

// ============================================
// STATEMENT TYPES
// ============================================

// Statement Types
export interface StudentStatement {
  studentId: string
  studentName: string
  admissionNumber: string
  className: string
  schoolName: string
  dateFrom?: string
  dateTo?: string
  transactions: TransactionEntry[]
  openingBalance: number
  closingBalance: number
  totalDebits: number
  totalCredits: number
  generatedAt: string
}

export interface TransactionEntry {
  id: string
  date: string
  description: string
  type: 'DEBIT' | 'CREDIT'
  amount: number
  runningBalance: number
  reference?: string
  category?: string // Fee category or payment method
}

export interface GuardianStatement {
  guardianId: string
  guardianName: string
  phone?: string
  email?: string
  dateFrom?: string
  dateTo?: string
  students: GuardianStudentSummary[]
  totalDebits: number
  totalCredits: number
  totalBalance: number
  generatedAt: string
}

export interface GuardianStudentSummary {
  studentId: string
  studentName: string
  admissionNumber: string
  className: string
  totalFees: number
  totalPaid: number
  balance: number
  transactions: TransactionEntry[]
}

export interface ClassSummary {
  classId: string
  className: string
  termId: string
  termName: string
  totalExpected: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number
  studentCount: number
  paidCount: number
  partialCount: number
  unpaidCount: number
  generatedAt: string
}

// ============================================
// FINANCE SETTINGS TYPES
// ============================================

// Finance Settings
export interface FinanceSettings {
  id?: string
  schoolId: string
  currency: string
  currencySymbol: string
  receiptPrefix: string
  invoicePrefix: string
  receiptNumberFormat: string
  invoiceNumberFormat: string
  nextReceiptNumber?: number
  nextInvoiceNumber?: number
  paymentMethods: PaymentMethod[]
  defaultDueDays: number
  enableAutoPenalty: boolean
  latePenaltyPercentage: number
  gracePeriodDays: number
  enableDiscountApproval: boolean
  createdAt?: string
  updatedAt?: string
}

// ============================================
// AUDIT LOG TYPES
// ============================================

// Finance Audit Log
export interface FinanceAuditEntry {
  id: string
  schoolId: string
  userId: string
  userName?: string
  action: FinanceAuditAction
  resource: "Payment" | 'Invoice' | 'Receipt' | 'Discount' | 'Penalty' | 'FeeStructure' | 'Settings'
  resourceId: string
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  reason?: string
  ipAddress?: string
  timestamp: string
}

export interface AuditLogInput {
  schoolId: string
  userId: string
  action: FinanceAuditAction
  resource: "Payment" | 'Invoice' | 'Receipt' | 'Discount' | 'Penalty' | 'FeeStructure' | 'Settings'
  resourceId: string
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  reason?: string
  ipAddress?: string
}

export interface AuditLogFilters {
  userId?: string
  action?: FinanceAuditAction
  resourceType?: string
  resourceId?: string
  dateFrom?: Date
  dateTo?: Date
}

// ============================================
// DASHBOARD & API RESPONSE TYPES
// ============================================

// API Response Types
export interface FinanceDashboardSummary {
  schoolId: string
  termId?: string
  termName?: string
  totalExpected: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number
  paidStudents: number
  partialStudents: number
  unpaidStudents: number
  overpaidStudents: number
  totalStudents: number
  recentPayments: PaymentRecord[]
  topDefaulters: StudentAccount[]
  generatedAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// Paginated types for specific entities
export type PaginatedPayments = PaginatedResponse<PaymentRecord>
export type PaginatedInvoices = PaginatedResponse<Invoice>
export type PaginatedAuditLogs = PaginatedResponse<FinanceAuditEntry>
export type PaginatedReceipts = PaginatedResponse<Receipt>

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface FinanceNotification {
  id: string
  schoolId: string
  guardianId: string
  studentId?: string
  type: 'PAYMENT_CONFIRMATION' | 'FEE_REMINDER' | 'PENALTY_NOTICE' | 'BALANCE_SUMMARY'
  channel: 'SMS' | 'EMAIL' | 'WHATSAPP'
  message: string
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED'
  sentAt?: string
  deliveredAt?: string
  createdAt: string
}

export interface SendNotificationInput {
  schoolId: string
  guardianId: string
  studentId?: string
  type: 'PAYMENT_CONFIRMATION' | 'FEE_REMINDER' | 'PENALTY_NOTICE' | 'BALANCE_SUMMARY'
  channel?: 'SMS' | 'EMAIL' | 'WHATSAPP'
  customMessage?: string
}

// ============================================
// BALANCE MONITOR TYPES
// ============================================

export interface BalanceMonitorSummary {
  schoolId: string
  termId?: string
  totalExpected: number
  totalCollected: number
  totalOutstanding: number
  collectionRate: number
  studentsByStatus: {
    paid: number
    partial: number
    unpaid: number
    overpaid: number
  }
  overdueCount: number
  totalOverdueAmount: number
}

export interface BalanceMonitorFilters {
  classId?: string
  termId?: string
  guardianId?: string
  status?: PaymentStatusCategory
  minBalance?: number
  maxBalance?: number
  overdueOnly?: boolean
}

// ============================================
// ERROR TYPES
// ============================================

export interface FinanceError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export type FinanceErrorCode =
  | 'FEE_STRUCTURE_DUPLICATE'
  | 'PAYMENT_FUTURE_DATE'
  | 'PAYMENT_INVALID_AMOUNT'
  | 'PAYMENT_MISSING_FIELDS'
  | 'DISCOUNT_INVALID_TYPE'
  | 'DISCOUNT_MISSING_FIELDS'
  | 'PENALTY_INVALID_AMOUNT'
  | 'FINANCE_ACCESS_DENIED'
  | 'REVERSAL_NOT_AUTHORIZED'
  | 'RECEIPT_CANCEL_NOT_AUTHORIZED'
  | 'PARENT_DATA_ACCESS_DENIED'
  | 'PAYMENT_ALREADY_REVERSED'
  | 'RECEIPT_IMMUTABLE'
  | 'AUDIT_LOG_IMMUTABLE'
  | 'DISCOUNT_ALREADY_APPROVED'
  | 'DISCOUNT_ALREADY_REJECTED'
  | 'STUDENT_NOT_FOUND'
  | 'FEE_STRUCTURE_NOT_FOUND'
