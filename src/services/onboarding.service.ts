/**
 * Onboarding Service
 * Requirements: 35.1, 35.2, 35.3, 35.4, 35.5
 * 
 * Manages user onboarding state, welcome tours, and help content
 */

import { Role } from '@/types/enums'

// ============================================
// TYPES
// ============================================

export interface TourStep {
  id: string
  target: string // CSS selector for the element to highlight
  title: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center'
  order: number
}

export interface RoleTour {
  role: Role
  steps: TourStep[]
}

export interface TooltipContent {
  id: string
  featureKey: string
  title: string
  description: string
  learnMoreUrl?: string
}

export interface QuickAction {
  id: string
  label: string
  description: string
  href: string
  icon: string
  roles: Role[]
  priority: number
}

export interface OnboardingState {
  userId: string
  hasCompletedTour: boolean
  tourCompletedAt?: Date
  dismissedTooltips: string[]
  lastLoginAt?: Date
  isFirstLogin: boolean
}

export interface ErrorMessage {
  code: string
  title: string
  message: string
  suggestedActions: string[]
  severity: 'info' | 'warning' | 'error' | 'critical'
}

export interface SuccessConfirmation {
  action: string
  title: string
  message: string
  nextSteps?: NextStep[]
}

export interface NextStep {
  label: string
  href?: string
  action?: string
  isPrimary?: boolean
}

// ============================================
// TOUR DEFINITIONS BY ROLE
// ============================================

const SUPER_ADMIN_TOUR: TourStep[] = [
  {
    id: 'super-admin-welcome',
    target: '[data-tour="dashboard"]',
    title: 'Welcome to SchoolOffice',
    content: 'This is your command center for managing all schools on the platform. Let\'s take a quick tour!',
    placement: 'center',
    order: 1,
  },
  {
    id: 'super-admin-schools',
    target: '[data-tour="schools-list"]',
    title: 'School Management',
    content: 'View and manage all schools here. You can create new schools, assign licenses, and toggle features.',
    placement: 'right',
    order: 2,
  },
  {
    id: 'super-admin-metrics',
    target: '[data-tour="metrics"]',
    title: 'System Metrics',
    content: 'Monitor active users, engagement rates, and communication metrics across all schools.',
    placement: 'bottom',
    order: 3,
  },
  {
    id: 'super-admin-alerts',
    target: '[data-tour="alerts"]',
    title: 'Alerts & Anomalies',
    content: 'Schools with issues like high failure rates or low engagement are highlighted here for your attention.',
    placement: 'left',
    order: 4,
  },
]

const SCHOOL_ADMIN_TOUR: TourStep[] = [
  {
    id: 'school-admin-welcome',
    target: '[data-tour="dashboard"]',
    title: 'Welcome to Your School Dashboard',
    content: 'This is your central hub for managing your school. Let\'s explore the key features!',
    placement: 'center',
    order: 1,
  },
  {
    id: 'school-admin-students',
    target: '[data-tour="students"]',
    title: 'Student Management',
    content: 'Enroll students, manage profiles, and track their academic journey here.',
    placement: 'right',
    order: 2,
  },
  {
    id: 'school-admin-staff',
    target: '[data-tour="staff"]',
    title: 'Staff Management',
    content: 'Add teachers and staff, assign roles, and manage their class assignments.',
    placement: 'right',
    order: 3,
  },
  {
    id: 'school-admin-academics',
    target: '[data-tour="academics"]',
    title: 'Academic Structure',
    content: 'Configure academic years, terms, classes, and subjects for your school.',
    placement: 'bottom',
    order: 4,
  },
  {
    id: 'school-admin-communications',
    target: '[data-tour="communications"]',
    title: 'Communications',
    content: 'Send announcements and track message delivery to parents and students.',
    placement: 'left',
    order: 5,
  },
]


const TEACHER_TOUR: TourStep[] = [
  {
    id: 'teacher-welcome',
    target: '[data-tour="dashboard"]',
    title: 'Welcome to SchoolOffice',
    content: 'Your teaching dashboard is ready! Let\'s see what you can do here.',
    placement: 'center',
    order: 1,
  },
  {
    id: 'teacher-classes',
    target: '[data-tour="my-classes"]',
    title: 'Your Classes',
    content: 'View your assigned classes and access student lists, attendance, and marks entry.',
    placement: 'right',
    order: 2,
  },
  {
    id: 'teacher-attendance',
    target: '[data-tour="attendance"]',
    title: 'Attendance',
    content: 'Record daily attendance for your classes. Parents are automatically notified of absences.',
    placement: 'bottom',
    order: 3,
  },
  {
    id: 'teacher-marks',
    target: '[data-tour="marks-entry"]',
    title: 'Marks Entry',
    content: 'Enter exam marks for your subjects. The system validates entries and calculates grades automatically.',
    placement: 'left',
    order: 4,
  },
  {
    id: 'teacher-timetable',
    target: '[data-tour="timetable"]',
    title: 'Your Timetable',
    content: 'View your teaching schedule with assigned periods and rooms.',
    placement: 'bottom',
    order: 5,
  },
]

const ACCOUNTANT_TOUR: TourStep[] = [
  {
    id: 'accountant-welcome',
    target: '[data-tour="dashboard"]',
    title: 'Welcome to Finance Dashboard',
    content: 'Manage school finances efficiently. Let\'s explore the key features!',
    placement: 'center',
    order: 1,
  },
  {
    id: 'accountant-fees',
    target: '[data-tour="fee-structure"]',
    title: 'Fee Structure',
    content: 'Configure fees per class and term, including optional fees and discounts.',
    placement: 'right',
    order: 2,
  },
  {
    id: 'accountant-payments',
    target: '[data-tour="payments"]',
    title: 'Payment Recording',
    content: 'Record payments and generate receipts. Balances update automatically.',
    placement: 'bottom',
    order: 3,
  },
  {
    id: 'accountant-reports',
    target: '[data-tour="financial-reports"]',
    title: 'Financial Reports',
    content: 'Generate daily collections, term summaries, and arrears reports.',
    placement: 'left',
    order: 4,
  },
]

const PARENT_TOUR: TourStep[] = [
  {
    id: 'parent-welcome',
    target: '[data-tour="dashboard"]',
    title: 'Welcome to Parent Portal',
    content: 'Stay connected with your child\'s education. Let\'s show you around!',
    placement: 'center',
    order: 1,
  },
  {
    id: 'parent-children',
    target: '[data-tour="children"]',
    title: 'Your Children',
    content: 'View all your linked children and their summary information.',
    placement: 'right',
    order: 2,
  },
  {
    id: 'parent-academics',
    target: '[data-tour="academics"]',
    title: 'Academic Performance',
    content: 'View report cards, exam results, and track academic progress.',
    placement: 'bottom',
    order: 3,
  },
  {
    id: 'parent-fees',
    target: '[data-tour="fees"]',
    title: 'Fees Status',
    content: 'Check fee balances, payment history, and outstanding amounts.',
    placement: 'left',
    order: 4,
  },
  {
    id: 'parent-messages',
    target: '[data-tour="messages"]',
    title: 'Messages',
    content: 'Communicate directly with teachers and receive school announcements.',
    placement: 'bottom',
    order: 5,
  },
]

const STUDENT_TOUR: TourStep[] = [
  {
    id: 'student-welcome',
    target: '[data-tour="dashboard"]',
    title: 'Welcome to Student Portal',
    content: 'Access your academic information easily. Let\'s explore!',
    placement: 'center',
    order: 1,
  },
  {
    id: 'student-timetable',
    target: '[data-tour="timetable"]',
    title: 'Your Timetable',
    content: 'View your class schedule and upcoming lessons.',
    placement: 'right',
    order: 2,
  },
  {
    id: 'student-results',
    target: '[data-tour="results"]',
    title: 'Results & Report Cards',
    content: 'Check your exam results and download report cards.',
    placement: 'bottom',
    order: 3,
  },
  {
    id: 'student-fees',
    target: '[data-tour="fees"]',
    title: 'Fees Status',
    content: 'View your fee balance and payment history.',
    placement: 'left',
    order: 4,
  },
]

// ============================================
// TOOLTIP DEFINITIONS
// ============================================

const TOOLTIPS: TooltipContent[] = [
  {
    id: 'tooltip-attendance-status',
    featureKey: 'attendance-status',
    title: 'Attendance Status',
    description: 'Mark students as Present, Absent, or Late. Absent students\' parents are automatically notified.',
  },
  {
    id: 'tooltip-pilot-type',
    featureKey: 'pilot-type',
    title: 'Pilot Type',
    description: 'FREE pilot students receive 2 SMS per term. PAID students receive 20 SMS per term.',
  },
  {
    id: 'tooltip-sms-limit',
    featureKey: 'sms-limit',
    title: 'SMS Limit',
    description: 'When SMS limit is reached, messages are sent via WhatsApp or Email instead.',
  },
  {
    id: 'tooltip-exam-status',
    featureKey: 'exam-status',
    title: 'Exam Status',
    description: 'Open exams allow marks entry. Closed exams require admin override to modify.',
  },
  {
    id: 'tooltip-arrears',
    featureKey: 'arrears',
    title: 'Arrears',
    description: 'Outstanding fee balance. Students with arrears are flagged and parents are notified.',
  },
  {
    id: 'tooltip-grading-system',
    featureKey: 'grading-system',
    title: 'Grading System',
    description: 'Defines how marks are converted to grades (A, B, C, etc.) for each subject.',
  },
  {
    id: 'tooltip-secure-link',
    featureKey: 'secure-link',
    title: 'Secure Report Link',
    description: 'Time-limited link (7 days) tied to your account for accessing reports securely.',
  },
  {
    id: 'tooltip-bulk-message',
    featureKey: 'bulk-message',
    title: 'Bulk Messaging',
    description: 'Send messages to multiple recipients. Messages are queued and processed in batches.',
  },
]


// ============================================
// QUICK ACTIONS BY ROLE
// ============================================

const QUICK_ACTIONS: QuickAction[] = [
  // Super Admin actions
  {
    id: 'qa-create-school',
    label: 'Create School',
    description: 'Add a new school to the platform',
    href: '/dashboard/super-admin/schools/new',
    icon: 'building',
    roles: [Role.SUPER_ADMIN],
    priority: 1,
  },
  {
    id: 'qa-view-metrics',
    label: 'View Metrics',
    description: 'System-wide analytics and reports',
    href: '/dashboard/super-admin/metrics',
    icon: 'chart',
    roles: [Role.SUPER_ADMIN],
    priority: 2,
  },
  // School Admin actions
  {
    id: 'qa-enroll-student',
    label: 'Enroll Student',
    description: 'Add a new student to the school',
    href: '/dashboard/students/new',
    icon: 'user-plus',
    roles: [Role.SCHOOL_ADMIN, Role.DEPUTY],
    priority: 1,
  },
  {
    id: 'qa-add-staff',
    label: 'Add Staff',
    description: 'Register a new staff member',
    href: '/dashboard/staff/new',
    icon: 'users',
    roles: [Role.SCHOOL_ADMIN],
    priority: 2,
  },
  {
    id: 'qa-send-announcement',
    label: 'Send Announcement',
    description: 'Broadcast message to school community',
    href: '/dashboard/announcements/new',
    icon: 'megaphone',
    roles: [Role.SCHOOL_ADMIN, Role.DEPUTY],
    priority: 3,
  },
  {
    id: 'qa-view-attendance',
    label: 'View Attendance',
    description: 'Real-time attendance dashboard',
    href: '/dashboard/attendance',
    icon: 'clipboard-check',
    roles: [Role.SCHOOL_ADMIN, Role.DEPUTY],
    priority: 4,
  },
  // Teacher actions
  {
    id: 'qa-record-attendance',
    label: 'Record Attendance',
    description: 'Mark attendance for your class',
    href: '/dashboard/attendance/record',
    icon: 'clipboard-check',
    roles: [Role.TEACHER],
    priority: 1,
  },
  {
    id: 'qa-enter-marks',
    label: 'Enter Marks',
    description: 'Record exam marks for your subjects',
    href: '/dashboard/marks/entry',
    icon: 'edit',
    roles: [Role.TEACHER],
    priority: 2,
  },
  {
    id: 'qa-view-timetable',
    label: 'My Timetable',
    description: 'View your teaching schedule',
    href: '/dashboard/timetable',
    icon: 'calendar',
    roles: [Role.TEACHER],
    priority: 3,
  },
  {
    id: 'qa-message-parent',
    label: 'Message Parent',
    description: 'Send a message to a student\'s parent',
    href: '/dashboard/messages/new',
    icon: 'message',
    roles: [Role.TEACHER],
    priority: 4,
  },
  // Accountant actions
  {
    id: 'qa-record-payment',
    label: 'Record Payment',
    description: 'Record a fee payment',
    href: '/dashboard/finance/payments/new',
    icon: 'credit-card',
    roles: [Role.ACCOUNTANT],
    priority: 1,
  },
  {
    id: 'qa-view-arrears',
    label: 'View Arrears',
    description: 'Students with outstanding balances',
    href: '/dashboard/finance/arrears',
    icon: 'alert-circle',
    roles: [Role.ACCOUNTANT],
    priority: 2,
  },
  {
    id: 'qa-daily-report',
    label: 'Daily Report',
    description: 'Today\'s collection summary',
    href: '/dashboard/finance/reports/daily',
    icon: 'file-text',
    roles: [Role.ACCOUNTANT],
    priority: 3,
  },
  // Parent actions
  {
    id: 'qa-view-results',
    label: 'View Results',
    description: 'Check your child\'s academic performance',
    href: '/parent/academics',
    icon: 'award',
    roles: [Role.PARENT],
    priority: 1,
  },
  {
    id: 'qa-check-fees',
    label: 'Check Fees',
    description: 'View fee balance and payment history',
    href: '/parent/fees',
    icon: 'wallet',
    roles: [Role.PARENT],
    priority: 2,
  },
  {
    id: 'qa-contact-teacher',
    label: 'Contact Teacher',
    description: 'Send a message to your child\'s teacher',
    href: '/parent/messages/new',
    icon: 'message',
    roles: [Role.PARENT],
    priority: 3,
  },
  // Student actions
  {
    id: 'qa-student-timetable',
    label: 'My Timetable',
    description: 'View your class schedule',
    href: '/student/timetable',
    icon: 'calendar',
    roles: [Role.STUDENT],
    priority: 1,
  },
  {
    id: 'qa-student-results',
    label: 'My Results',
    description: 'View your exam results and report cards',
    href: '/student/results',
    icon: 'award',
    roles: [Role.STUDENT],
    priority: 2,
  },
  {
    id: 'qa-student-fees',
    label: 'Fee Status',
    description: 'Check your fee balance',
    href: '/student/fees',
    icon: 'wallet',
    roles: [Role.STUDENT],
    priority: 3,
  },
]

// ============================================
// ERROR MESSAGES
// ============================================

const ERROR_MESSAGES: Record<string, ErrorMessage> = {
  AUTH_INVALID_CREDENTIALS: {
    code: 'AUTH_INVALID_CREDENTIALS',
    title: 'Login Failed',
    message: 'The email or password you entered is incorrect.',
    suggestedActions: [
      'Check your email address for typos',
      'Make sure Caps Lock is off',
      'Try resetting your password if you\'ve forgotten it',
    ],
    severity: 'error',
  },
  AUTH_TOKEN_EXPIRED: {
    code: 'AUTH_TOKEN_EXPIRED',
    title: 'Session Expired',
    message: 'Your session has expired for security reasons.',
    suggestedActions: [
      'Please log in again to continue',
      'Your work has been saved automatically',
    ],
    severity: 'warning',
  },
  AUTH_UNAUTHORIZED: {
    code: 'AUTH_UNAUTHORIZED',
    title: 'Access Denied',
    message: 'You don\'t have permission to perform this action.',
    suggestedActions: [
      'Contact your administrator if you need access',
      'Make sure you\'re logged in with the correct account',
    ],
    severity: 'error',
  },
  VALIDATION_FAILED: {
    code: 'VALIDATION_FAILED',
    title: 'Invalid Input',
    message: 'Some of the information you entered is not valid.',
    suggestedActions: [
      'Check the highlighted fields for errors',
      'Make sure all required fields are filled',
    ],
    severity: 'warning',
  },
  TERM_DATES_OVERLAP: {
    code: 'TERM_DATES_OVERLAP',
    title: 'Date Conflict',
    message: 'The term dates overlap with an existing term.',
    suggestedActions: [
      'Check the dates of existing terms',
      'Adjust the start or end date to avoid overlap',
    ],
    severity: 'error',
  },
  MARKS_EXCEED_MAX: {
    code: 'MARKS_EXCEED_MAX',
    title: 'Invalid Marks',
    message: 'The marks entered exceed the maximum allowed.',
    suggestedActions: [
      'Check the maximum marks for this exam',
      'Enter a value within the allowed range',
    ],
    severity: 'error',
  },
  EXAM_CLOSED: {
    code: 'EXAM_CLOSED',
    title: 'Exam Closed',
    message: 'This exam period has closed and marks cannot be modified.',
    suggestedActions: [
      'Contact your School Admin to request an override',
      'Check if there\'s another open exam period',
    ],
    severity: 'warning',
  },
  SMS_LIMIT_REACHED: {
    code: 'SMS_LIMIT_REACHED',
    title: 'SMS Limit Reached',
    message: 'The SMS limit for this student has been reached.',
    suggestedActions: [
      'Message will be sent via WhatsApp or Email instead',
      'Contact admin to upgrade to paid tier for more SMS',
    ],
    severity: 'info',
  },
  TEACHER_NOT_ASSIGNED: {
    code: 'TEACHER_NOT_ASSIGNED',
    title: 'Not Assigned',
    message: 'You are not assigned to this class or subject.',
    suggestedActions: [
      'Contact your School Admin to update your assignments',
      'Select a class or subject you are assigned to',
    ],
    severity: 'error',
  },
  SMS_DELIVERY_FAILED: {
    code: 'SMS_DELIVERY_FAILED',
    title: 'SMS Delivery Failed',
    message: 'The SMS could not be delivered.',
    suggestedActions: [
      'The system will automatically retry',
      'Message will be sent via WhatsApp or Email as backup',
    ],
    severity: 'warning',
  },
  PAYMENT_GATEWAY_ERROR: {
    code: 'PAYMENT_GATEWAY_ERROR',
    title: 'Payment Error',
    message: 'There was an issue processing the payment.',
    suggestedActions: [
      'Try again in a few minutes',
      'Contact support if the problem persists',
    ],
    severity: 'error',
  },
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred.',
    suggestedActions: [
      'Try refreshing the page',
      'Contact support if the problem persists',
    ],
    severity: 'critical',
  },
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    title: 'Service Unavailable',
    message: 'The service is temporarily unavailable.',
    suggestedActions: [
      'Please try again in a few minutes',
      'Check your internet connection',
    ],
    severity: 'critical',
  },
}


// ============================================
// SUCCESS CONFIRMATIONS
// ============================================

const SUCCESS_CONFIRMATIONS: Record<string, SuccessConfirmation> = {
  STUDENT_ENROLLED: {
    action: 'STUDENT_ENROLLED',
    title: 'Student Enrolled Successfully',
    message: 'The student has been added to the system.',
    nextSteps: [
      { label: 'Add Guardian', href: '/dashboard/guardians/new', isPrimary: true },
      { label: 'Enroll Another', href: '/dashboard/students/new' },
      { label: 'View Student', action: 'view-student' },
    ],
  },
  GUARDIAN_LINKED: {
    action: 'GUARDIAN_LINKED',
    title: 'Guardian Linked Successfully',
    message: 'The guardian has been linked to the student.',
    nextSteps: [
      { label: 'Verify Contact', action: 'verify-contact', isPrimary: true },
      { label: 'Add Another Guardian', href: '/dashboard/guardians/new' },
    ],
  },
  ATTENDANCE_RECORDED: {
    action: 'ATTENDANCE_RECORDED',
    title: 'Attendance Saved',
    message: 'Attendance has been recorded. Parents of absent students will be notified.',
    nextSteps: [
      { label: 'Record Another Class', action: 'record-another' },
      { label: 'View Attendance Report', href: '/dashboard/attendance/report' },
    ],
  },
  MARKS_SAVED: {
    action: 'MARKS_SAVED',
    title: 'Marks Saved Successfully',
    message: 'The exam marks have been recorded.',
    nextSteps: [
      { label: 'Enter More Marks', action: 'enter-more' },
      { label: 'View Class Results', action: 'view-results' },
    ],
  },
  PAYMENT_RECORDED: {
    action: 'PAYMENT_RECORDED',
    title: 'Payment Recorded',
    message: 'The payment has been recorded and the balance updated.',
    nextSteps: [
      { label: 'Print Receipt', action: 'print-receipt', isPrimary: true },
      { label: 'Record Another Payment', href: '/dashboard/finance/payments/new' },
    ],
  },
  REPORT_CARD_GENERATED: {
    action: 'REPORT_CARD_GENERATED',
    title: 'Report Card Ready',
    message: 'The report card has been generated successfully.',
    nextSteps: [
      { label: 'Download PDF', action: 'download-pdf', isPrimary: true },
      { label: 'Send to Parent', action: 'send-to-parent' },
    ],
  },
  ANNOUNCEMENT_SENT: {
    action: 'ANNOUNCEMENT_SENT',
    title: 'Announcement Sent',
    message: 'Your announcement has been delivered to the selected recipients.',
    nextSteps: [
      { label: 'View Delivery Status', action: 'view-status' },
      { label: 'Send Another', href: '/dashboard/announcements/new' },
    ],
  },
  MESSAGE_SENT: {
    action: 'MESSAGE_SENT',
    title: 'Message Sent',
    message: 'Your message has been delivered.',
    nextSteps: [
      { label: 'View Conversation', action: 'view-conversation' },
    ],
  },
  STAFF_CREATED: {
    action: 'STAFF_CREATED',
    title: 'Staff Member Added',
    message: 'The staff member has been registered successfully.',
    nextSteps: [
      { label: 'Assign Classes', action: 'assign-classes', isPrimary: true },
      { label: 'Add Another Staff', href: '/dashboard/staff/new' },
    ],
  },
  TIMETABLE_SAVED: {
    action: 'TIMETABLE_SAVED',
    title: 'Timetable Updated',
    message: 'The timetable has been saved and is now visible to teachers and students.',
    nextSteps: [
      { label: 'View Timetable', action: 'view-timetable' },
      { label: 'Add More Entries', action: 'add-entries' },
    ],
  },
  EXAM_CREATED: {
    action: 'EXAM_CREATED',
    title: 'Exam Created',
    message: 'The exam has been set up. Teachers can now enter marks.',
    nextSteps: [
      { label: 'Configure Grading', action: 'configure-grading' },
      { label: 'Notify Teachers', action: 'notify-teachers' },
    ],
  },
  RESULTS_PROCESSED: {
    action: 'RESULTS_PROCESSED',
    title: 'Results Processed',
    message: 'Grades and positions have been calculated for all students.',
    nextSteps: [
      { label: 'Generate Report Cards', action: 'generate-reports', isPrimary: true },
      { label: 'View Results Summary', action: 'view-summary' },
    ],
  },
}

// ============================================
// SERVICE CLASS
// ============================================

export class OnboardingService {
  /**
   * Get tour steps for a specific role
   * Requirements: 35.1
   */
  getTourForRole(role: Role): TourStep[] {
    switch (role) {
      case Role.SUPER_ADMIN:
        return SUPER_ADMIN_TOUR
      case Role.SCHOOL_ADMIN:
        return SCHOOL_ADMIN_TOUR
      case Role.DEPUTY:
        return SCHOOL_ADMIN_TOUR // Deputies see similar tour to School Admin
      case Role.TEACHER:
        return TEACHER_TOUR
      case Role.ACCOUNTANT:
        return ACCOUNTANT_TOUR
      case Role.PARENT:
        return PARENT_TOUR
      case Role.STUDENT:
        return STUDENT_TOUR
      default:
        return []
    }
  }

  /**
   * Get tooltip content by feature key
   * Requirements: 35.2
   */
  getTooltip(featureKey: string): TooltipContent | undefined {
    return TOOLTIPS.find(t => t.featureKey === featureKey)
  }

  /**
   * Get all tooltips
   */
  getAllTooltips(): TooltipContent[] {
    return TOOLTIPS
  }

  /**
   * Get error message with suggested actions
   * Requirements: 35.3
   */
  getErrorMessage(code: string): ErrorMessage {
    return ERROR_MESSAGES[code] || ERROR_MESSAGES.INTERNAL_ERROR
  }

  /**
   * Get success confirmation with next steps
   * Requirements: 35.4
   */
  getSuccessConfirmation(action: string): SuccessConfirmation | undefined {
    return SUCCESS_CONFIRMATIONS[action]
  }

  /**
   * Get quick actions for a role
   * Requirements: 35.5
   */
  getQuickActionsForRole(role: Role): QuickAction[] {
    return QUICK_ACTIONS
      .filter(action => action.roles.includes(role))
      .sort((a, b) => a.priority - b.priority)
  }

  /**
   * Check if user should see the welcome tour
   * Requirements: 35.1
   */
  shouldShowTour(state: OnboardingState): boolean {
    return state.isFirstLogin && !state.hasCompletedTour
  }

  /**
   * Mark tour as completed
   */
  completeTour(state: OnboardingState): OnboardingState {
    return {
      ...state,
      hasCompletedTour: true,
      tourCompletedAt: new Date(),
    }
  }

  /**
   * Dismiss a tooltip
   */
  dismissTooltip(state: OnboardingState, tooltipId: string): OnboardingState {
    if (state.dismissedTooltips.includes(tooltipId)) {
      return state
    }
    return {
      ...state,
      dismissedTooltips: [...state.dismissedTooltips, tooltipId],
    }
  }

  /**
   * Check if a tooltip should be shown
   */
  shouldShowTooltip(state: OnboardingState, tooltipId: string): boolean {
    return !state.dismissedTooltips.includes(tooltipId)
  }

  /**
   * Create initial onboarding state for a new user
   */
  createInitialState(userId: string, isFirstLogin: boolean = true): OnboardingState {
    return {
      userId,
      hasCompletedTour: false,
      dismissedTooltips: [],
      isFirstLogin,
    }
  }
}

// Export singleton instance
export const onboardingService = new OnboardingService()
