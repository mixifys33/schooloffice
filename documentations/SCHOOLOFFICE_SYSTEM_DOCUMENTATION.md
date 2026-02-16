# SchoolOffice System - Comprehensive Architecture Documentation

## Executive Summary

SchoolOffice is a multi-tenant school management system built with Next.js, Prisma, and MongoDB. It provides comprehensive management of academic, financial, attendance, and communication operations across multiple user roles with strict permission boundaries and audit trails.

**Technology Stack:**

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: Next.js API Routes, Node.js
- Database: MongoDB with Prisma ORM
- Authentication: NextAuth v5
- UI Components: Radix UI, Lucide React

---

## 1. USER ROLES AND PERMISSIONS

### 1.1 Role Hierarchy

The system supports 7 primary user roles with hierarchical access:

| Role             | Scope          | Primary Functions                                                 |
| ---------------- | -------------- | ----------------------------------------------------------------- |
| **SUPER_ADMIN**  | Platform-wide  | School management, licensing, billing, system configuration       |
| **SCHOOL_ADMIN** | School-wide    | All school operations, staff management, settings                 |
| **DEPUTY**       | School-wide    | Academic management, mark approval, discipline                    |
| **TEACHER**      | Class-level    | Attendance, marks entry, class communication                      |
| **ACCOUNTANT**   | School-wide    | Finance, payments, fee management                                 |
| **STUDENT**      | Personal       | View timetable, results, fees, announcements                      |
| **PARENT**       | Child-specific | View child's attendance, results, fees, communicate with teachers |

### 1.2 Permission System (Requirements 19.1-19.7)

**Permission Types:**

- VIEW: Read-only access
- CREATE: Create new records
- EDIT: Modify existing records
- DELETE: Remove records
- APPROVE: Authorize/approve actions
- EXPORT: Export data

**Key Permission Boundaries:**

1. **Super Admin Restrictions (Requirement 5.5):**

   - Cannot directly enter marks
   - Cannot edit discipline records
   - Cannot modify fees
   - Cannot record attendance
   - Cannot modify student payments
   - Can only view school data, not modify

2. **Teacher Permissions:**

   - Can enter marks (not approve)
   - Can record attendance
   - Can view class list
   - Can communicate with parents
   - Cannot access finance data
   - Cannot modify class assignments

3. **Accountant Permissions:**

   - Full finance access (view, create, edit, export)
   - Cannot modify marks or attendance
   - Cannot edit discipline records
   - Can view student data (read-only)

4. **Deputy Permissions:**

   - Can approve marks and results
   - Can edit class/subject assignments
   - Can view all academic data
   - Cannot modify finance
   - Can manage discipline

5. **Parent Permissions:**
   - View child's attendance, marks, results
   - View fees and payment history
   - Send messages to teachers
   - View announcements
   - Cannot modify any data

---

## 2. CORE MODULES AND FEATURES

### 2.1 Academic Module

**Components:**

- Classes and Streams
- Subjects and Grading Systems
- Timetable Management
- Attendance Tracking
- Examination Management
- Marks Entry and Results
- Report Cards

**Key Services:**

- `class.service.ts` - Class management
- `subject.service.ts` - Subject management
- `attendance.service.ts` - Attendance recording and tracking
- `examination.service.ts` - Exam management
- `results.service.ts` - Result calculation and publication
- `timetable.service.ts` - Timetable scheduling

**Attendance Rules (Requirements 38.1-38.5):**

- Students absent in 2+ periods marked as "absent for the day"
- Daily absence notifications sent to guardians
- Weekly absence patterns detected (3+ absences = escalation)
- Absence notifications include response link for parents
- Escalation to class teacher and School Admin

### 2.2 Finance Module

**Components:**

- Fee Structures (per class, per term, per student type)
- Invoices and Payments
- Receipts (immutable)
- Discounts and Penalties
- Student Accounts
- Payment Reversals
- Finance Audit Logs

**Key Services:**

- `finance.service.ts` - Core payment operations
- `student-account.service.ts` - Student balance tracking
- `receipt.service.ts` - Receipt generation
- `invoice.service.ts` - Invoice management
- `discount.service.ts` - Discount rules and application
- `penalty.service.ts` - Penalty rules and application
- `finance-audit.service.ts` - Finance audit logging
- `finance-notification.service.ts` - Finance alerts

**Finance Properties (Property-Based Testing):**

**Property 4: Payment Recording Completeness**

- For any successfully recorded payment, system SHALL create:
  1. Payment record
  2. Immutable Receipt with unique number
  3. Updated StudentAccount balance
  4. FinanceAuditLog entry

**Property 5: Payment Date Validation**

- For any payment with future date, system SHALL reject

**Property 6: Payment Immutability**

- Confirmed payments cannot be directly modified
- Corrections only through reversal

**Property 7: Reversal Audit Trail**

- Reversals create audit entry with original details, reason, and user

**Payment Recording Requirements (4.1, 4.3, 4.4, 4.7):**

- Required fields: date, amount, method, reference, received-by
- Payment methods: CASH, MOBILE_MONEY, BANK, CHEQUE
- Future dates rejected
- Receipt number auto-generated
- Balance updated immediately
- Audit log created

### 2.3 Staff Management Module

**Components:**

- Staff Profiles
- Role and Responsibility Assignment
- Staff Subjects and Classes
- Staff Tasks and Deadlines
- Staff Documents
- Staff History and Events
- Performance Monitoring

**Key Services:**

- `staff.service.ts` - Staff profile management
- `staff-management.service.ts` - Staff operations
- `staff-history.service.ts` - Staff lifecycle tracking
- `staff-document.service.ts` - Document management
- `staff-performance.service.ts` - Performance monitoring

**Staff Dashboard Roles (Requirements 1-14):**

1. **Class Teacher Dashboard:**

   - Class snapshot (students, attendance, fees, discipline)
   - Quick actions: attendance, marks, messages, discipline
   - Alerts: absent students, chronic lateness, pending reports
   - Read-only fee information

2. **Director of Studies (DOS) Dashboard:**

   - Academic alerts: pending approvals, late submissions
   - Term control: setup, subject allocation, exam scheduling
   - Approval center for marks and reports
   - Academic overview and report generation

3. **Bursar/Finance Dashboard:**

   - Financial alerts: unpaid balances, reconciliation issues
   - Quick actions: record payment, issue receipt, view balance
   - Financial overview: collections, outstanding fees
   - Fee reports and payment summaries

4. **Hostel/Boarding Staff Dashboard:**

   - Live presence tracking
   - Discipline log
   - Emergency alert functionality
   - No marks or finance access

5. **Support Staff Dashboard:**
   - Assigned tasks and notices
   - Optional attendance tracking
   - No student records, marks, or finance access

### 2.4 Guardian and Parent Portal

**Components:**

- Guardian Management
- Guardian Portal Access Control
- Guardian Documents
- Guardian Audit Logs
- Parent-Teacher Messaging
- Fee Viewing and Payment

**Key Services:**

- `guardian.service.ts` - Guardian management
- `guardian-portal-access.service.ts` - Portal access control
- `guardian-document.service.ts` - Document management
- `guardian-audit.service.ts` - Audit logging

**Guardian Features (Requirements 5.1-5.5, 6.1-6.5, 7.1-7.3):**

- Portal access can be enabled/disabled per guardian
- Granular permissions: view attendance, results, fees, download reports
- Guardian status: ACTIVE, INACTIVE, BLOCKED, RESTRICTED
- Guardian flags: FEE_DEFAULTER, HIGH_CONFLICT, LEGAL_RESTRICTION
- Document storage with categorization
- Complete audit trail of all actions

### 2.5 Communication Module

**Components:**

- Direct Messaging (Parent-Teacher)
- Announcements
- SMS Gateway
- WhatsApp Gateway
- Email Gateway
- Message Templates
- Message Logs

**Key Services:**

- `messaging.service.ts` - Direct parent-teacher communication
- `communication.service.ts` - Multi-channel messaging
- `sms-gateway.service.ts` - SMS delivery
- `whatsapp-gateway.service.ts` - WhatsApp delivery
- `email-gateway.service.ts` - Email delivery
- `message-template.service.ts` - Template management
- `message-log.service.ts` - Message tracking

**Direct Messaging (Requirements 36.1-36.5):**

- "Message Teacher" button for each assigned teacher
- Parent sends message → teacher inbox with notification
- Teacher responds → parent notified via in-app + SMS/WhatsApp
- School Admin sends official messages with branding
- Complete conversation thread with timestamps
- Unread message tracking

**Notification Channels:**

- SMS (primary for low-bandwidth areas)
- WhatsApp (preferred where available)
- Email (backup)
- In-app notifications

### 2.6 Discipline Module

**Components:**

- Discipline Cases
- Discipline Types (MINOR, MAJOR, CRITICAL)
- Discipline Actions (WARNING, DETENTION, SUSPENSION, EXPULSION)
- Discipline Audit

**Key Services:**

- `discipline.service.ts` - Discipline management

### 2.7 Document Management

**Components:**

- Student Documents
- Staff Documents
- Guardian Documents
- Document Categories and Permissions

**Key Services:**

- `document.service.ts` - Document operations
- `student-document.service.ts` - Student documents
- `staff-document.service.ts` - Staff documents
- `guardian-document.service.ts` - Guardian documents

---

## 3. DATA MODELS AND RELATIONSHIPS

### 3.1 Core Entities

**School** (Tenant)

- Immutable code (tenant identifier)
- License type (FREE_PILOT, BASIC, PREMIUM)
- Features JSON (SMS enabled, WhatsApp enabled, etc.)
- SMS budget per term
- Legal acknowledgments

**User** (Authentication)

- Email, phone, username
- Multiple roles support
- Active role tracking
- Account lifecycle (ACTIVE, SUSPENDED, DELETED)
- Failed login tracking
- Account lockout mechanism

**Staff**

- Employee number
- Primary role (CLASS_TEACHER, DOS, HOSTEL_STAFF, SUPPORT_STAFF, BURSAR)
- Secondary roles (multiple)
- Department assignment
- Last activity timestamp
- Linked to User via one-to-one relationship

**Student**

- Admission number
- Class and Stream
- Pilot type (FREE, PAID)
- SMS limits per term
- Status (ACTIVE, TRANSFERRED, GRADUATED, SUSPENDED)
- Linked to Guardians via StudentGuardian junction

**Guardian**

- Phone, email, WhatsApp number
- Relationship type (FATHER, MOTHER, GUARDIAN, etc.)
- Preferred communication channel
- Status (ACTIVE, INACTIVE, BLOCKED, RESTRICTED)
- Flags (FEE_DEFAULTER, HIGH_CONFLICT, LEGAL_RESTRICTION)
- Consent tracking
- Portal access control

### 3.2 Academic Structure

**AcademicYear** → **Term** → **Class** → **Stream**

- Subjects linked to Classes via ClassSubject
- Grading Systems with Grade Ranges
- Timetable Entries (Class, Subject, Staff, Day, Period)

### 3.3 Finance Structure

**FeeStructure** (per class, term, student type)

- FeeItems (individual fee components)
- StudentAccount (tracks balance, payments, discounts, penalties)
- DiscountRule (school-wide rules)
- StudentDiscount (per-student discounts)
- PenaltyRule (school-wide rules)
- StudentPenalty (per-student penalties)
- Invoice (student bill)
- InvoiceItem (line items)
- Payment (recorded payment)
- PaymentAllocation (partial payment tracking)
- Receipt (immutable receipt)

### 3.4 Attendance Structure

**Attendance**

- Student, Class, Date, Period
- Status (PRESENT, ABSENT, LATE)
- Recorded by Staff
- Remarks

### 3.5 Examination Structure

**Exam** (per term)

- Type (BOT, MID, EOT, CA)
- Start/End dates
- Open/Closed status

**Mark** (per exam, student, subject)

- Score, Max Score
- Grade
- Entered by Staff

**Result** (per student, term)

- Total marks, average, position
- Grade, remarks
- Published report card

### 3.6 System Control Models

**RolePermission**

- Role, Feature, PermissionType
- Seeded from permission service

**SystemLock** (Requirements 20.3-20.7)

- Lock types: TERM_CLOSED, RESULTS_PUBLISHED, FINANCIAL_PERIOD_LOCKED
- Locked by, Unlocked by (with reason)
- Immutable audit trail

**PasswordReset**

- Unique token
- Expiration time
- Used timestamp

---

## 4. API ROUTES AND ENDPOINTS

### 4.1 Authentication Routes

- `/api/auth/*` - NextAuth endpoints
- `/api/auth/login` - Login
- `/api/auth/logout` - Logout
- `/api/auth/register` - Registration
- `/api/auth/password-reset` - Password reset

### 4.2 Admin Routes (Super Admin Only)

- `/api/admin/schools` - School management
- `/api/admin/subscriptions` - Subscription management
- `/api/admin/payments` - Platform payments
- `/api/admin/settings` - System settings
- `/api/admin/audit` - Audit logs
- `/api/admin/enforcement` - Enforcement actions
- `/api/admin/pilots` - Pilot program management
- `/api/admin/overview` - Platform overview
- `/api/admin/sms-monitoring` - SMS monitoring
- `/api/admin/impersonation` - User impersonation

### 4.3 School Admin Routes

- `/api/school-admin/*` - School administration

### 4.4 Academic Routes

- `/api/students/*` - Student management
- `/api/classes/*` - Class management
- `/api/subjects/*` - Subject management
- `/api/streams/*` - Stream management
- `/api/teachers/*` - Teacher management
- `/api/attendance/*` - Attendance recording
- `/api/marks/*` - Marks entry and management
- `/api/results/*` - Results management
- `/api/exams/*` - Exam management
- `/api/terms/*` - Term management

### 4.5 Finance Routes

- `/api/fees/*` - Fee structure management
- `/api/finance/*` - Finance operations
- `/api/payments/*` - Payment recording and tracking

### 4.6 Communication Routes

- `/api/communication/*` - Multi-channel messaging
- `/api/sms/*` - SMS operations
- `/api/announcements/*` - Announcements
- `/api/messages/*` - Direct messaging

### 4.7 Guardian/Parent Routes

- `/api/guardians/*` - Guardian management
- `/api/parent/*` - Parent portal operations

### 4.8 Student Routes

- `/api/student/*` - Student portal operations

### 4.9 Dashboard Routes

- `/api/dashboard/*` - Dashboard data

### 4.10 Settings Routes

- `/api/settings/*` - School settings

### 4.11 Reports Routes

- `/api/reports/*` - Report generation and viewing

---

## 5. PORTAL STRUCTURES

### 5.1 Student Portal (`/student`)

- Timetable view
- Results and report cards
- Fees and payment history
- Announcements
- Messages (read-only)

### 5.2 Parent Portal (`/parent`)

- Child list
- Attendance tracking
- Results and report cards
- Fees and payment history
- Direct messaging with teachers
- Announcements
- Absence response functionality

### 5.3 Teacher Portal (`/teacher`)

- Class list
- Attendance recording
- Marks entry
- Class communication
- Task management
- Announcements

### 5.4 Admin Portal (`/dashboard`)

- School overview
- Student management
- Staff management
- Finance dashboard
- Reports
- Settings
- Audit logs

---

## 6. MIDDLEWARE AND AUTHENTICATION

### 6.1 Authentication Flow (Requirements 22.4-22.6)

1. User submits credentials
2. NextAuth validates against User model
3. Session created with user role and school context
4. Middleware checks session on every request
5. Role-based route access enforced
6. API endpoints verify permissions

### 6.2 Middleware Rules (src/middleware.ts)

**Public Routes:**

- `/login`, `/register`, `/admin/login`
- `/api/auth/*`
- `/reports/view` (with token)

**Role-Based Route Access:**

- Super Admin: `/dashboard/super-admin`
- School Admin: `/dashboard`, `/dashboard/settings`, `/dashboard/reports`
- Teacher: `/dashboard/classes`, `/dashboard/attendance`
- Student: `/student/*`
- Parent: `/parent/*`

**Super Admin Restrictions:**

- Cannot POST/PUT/PATCH/DELETE to marks, discipline, fees, attendance, payments
- Can only view school data
- Restricted write operations return HTTP 403

**School Suspension Handling:**

- Non-Super Admin users blocked from most routes
- Payment integration remains accessible
- Super Admin routes always accessible

---

## 7. AUDIT AND COMPLIANCE

### 7.1 Audit Logging

**AuditLog** (per school)

- User, Action, Resource, ResourceId
- Previous and New values
- IP Address, User Agent
- Timestamp

**AuthAuditLog** (cross-school)

- User, School, Event Type
- Success/Failure
- Error codes
- Metadata

**GuardianAuditLog**

- Guardian, Action, Field
- Previous and New values
- Performed by, Timestamp
- IP Address

**FinanceAuditLog**

- School, User, Action
- Resource Type and ID
- Previous and New values
- Reason (for reversals)

### 7.2 System Locks (Requirements 20.3-20.7)

**Lock Types:**

- TERM_CLOSED: Prevents modifications to term data
- RESULTS_PUBLISHED: Prevents mark changes after publication
- FINANCIAL_PERIOD_LOCKED: Prevents payment modifications

**Lock Operations:**

- Locked by (User ID)
- Locked at (Timestamp)
- Unlocked by (User ID)
- Unlocked at (Timestamp)
- Unlock reason (required)

---

## 8. CONFIGURATION AND RESTRICTIONS

### 8.1 School Settings

**FinanceSettings** (per school)

- Receipt prefix and next number
- Invoice prefix and next number
- Payment terms
- Late fee rules
- Discount rules

**SchoolSettings**

- SMS budget per term
- Feature flags
- License type
- Active status

### 8.2 Restrictions and Enforcement

**Super Admin Restrictions (Requirement 5.5):**

- Cannot enter marks directly
- Cannot edit discipline records
- Cannot modify fees
- Cannot record attendance
- Cannot modify student payments

**Teacher Restrictions:**

- Cannot approve marks
- Cannot modify class assignments
- Cannot access finance data
- Cannot modify discipline records

**Accountant Restrictions:**

- Cannot modify marks
- Cannot modify attendance
- Cannot modify discipline
- Cannot modify class assignments

---

## 9. NOTIFICATION SYSTEMS

### 9.1 Absence Notifications (Requirements 38.1-38.5)

**Trigger:** Student absent in 2+ periods
**Recipients:** Primary guardian
**Channels:** SMS, WhatsApp, Email (based on preference)
**Content:** Student name, date, periods missed, response link
**Response:** Parent can respond via secure link

### 9.2 Finance Notifications (Requirements 8.1-8.5)

**Types:**

- Fee due reminders
- Payment received confirmations
- Overdue fee alerts
- Discount approvals
- Penalty notifications

**Recipients:** Financially responsible guardian
**Channels:** SMS, WhatsApp, Email

### 9.3 Academic Notifications

**Types:**

- Mark entry reminders
- Report submission deadlines
- Results publication
- Exam schedules
- Timetable changes

**Recipients:** Teachers, Students, Parents
**Channels:** In-app, SMS, Email

### 9.4 Administrative Notifications

**Types:**

- Staff task assignments
- Approval requests
- System alerts
- Audit alerts

**Recipients:** Relevant staff
**Channels:** In-app, Email

---

## 10. SERVICE LAYER ARCHITECTURE

### 10.1 Core Services (60+ services)

**Authentication & Authorization:**

- `auth.service.ts` - Authentication logic
- `permission.service.ts` - Permission checking
- `role-resolution.service.ts` - Role determination

**Academic:**

- `class.service.ts`, `subject.service.ts`, `attendance.service.ts`
- `examination.service.ts`, `results.service.ts`, `timetable.service.ts`

**Finance:**

- `finance.service.ts`, `student-account.service.ts`, `receipt.service.ts`
- `invoice.service.ts`, `discount.service.ts`, `penalty.service.ts`
- `finance-audit.service.ts`, `finance-notification.service.ts`

**Staff:**

- `staff.service.ts`, `staff-management.service.ts`, `staff-history.service.ts`
- `staff-document.service.ts`, `staff-performance.service.ts`

**Communication:**

- `messaging.service.ts`, `communication.service.ts`
- `sms-gateway.service.ts`, `whatsapp-gateway.service.ts`, `email-gateway.service.ts`
- `message-template.service.ts`, `message-log.service.ts`

**Guardian/Parent:**

- `guardian.service.ts`, `guardian-portal-access.service.ts`
- `guardian-document.service.ts`, `guardian-audit.service.ts`

**Utilities:**

- `audit.service.ts`, `security.service.ts`, `tenant-isolation.service.ts`
- `message-orchestrator.service.ts`, `automation.service.ts`

### 10.2 Service Patterns

**Validation:**

- Input validation before database operations
- Business rule enforcement
- Permission checking

**Error Handling:**

- Custom error classes with codes
- Detailed error messages
- Audit logging of failures

**Transactions:**

- Multi-step operations wrapped in transactions
- Rollback on failure
- Audit trail consistency

---

## 11. SECURITY CONSIDERATIONS

### 11.1 Authentication Security

- Password hashing with bcryptjs
- Failed login tracking (failedAttempts)
- Account lockout (lockedUntil)
- Session management with NextAuth
- CSRF protection

### 11.2 Authorization Security

- Role-based access control (RBAC)
- Permission-based feature access
- Data scope isolation (school-level, class-level)
- Middleware enforcement
- API endpoint protection

### 11.3 Data Security

- Tenant isolation (schoolId checks)
- Immutable audit trails
- Soft deletes (not hard deletes)
- Encrypted sensitive fields (where applicable)
- Secure links for public access

### 11.4 Audit Security

- Immutable audit logs
- User identification
- Timestamp recording
- IP address logging
- Action details preservation

---

## 12. MULTI-TENANCY

### 12.1 Tenant Isolation

**School as Tenant:**

- Immutable school code (tenant identifier)
- All data scoped to schoolId
- Users belong to one school (except Super Admin)
- Super Admin has no schoolId

**Data Isolation:**

- Every query filters by schoolId
- Middleware enforces school context
- API endpoints verify school ownership
- Audit logs track school context

### 12.2 Super Admin Context

- No schoolId (null)
- Can view all schools
- Cannot modify school data directly
- Can manage licensing and billing
- Can impersonate school admins

---

## 13. FEATURE FLAGS AND LICENSING

### 13.1 License Types

- **FREE_PILOT:** Basic features, limited SMS
- **BASIC:** Standard features, SMS enabled
- **PREMIUM:** All features, advanced reporting

### 13.2 Feature Flags

```json
{
  "smsEnabled": false,
  "whatsappEnabled": false,
  "paymentIntegration": false,
  "advancedReporting": false,
  "bulkMessaging": false
}
```

### 13.3 Feature Availability

- Features checked at school level
- Permission service considers license type
- API endpoints verify feature availability
- UI hides unavailable features

---

## 14. TESTING STRATEGY

### 14.1 Property-Based Testing

**Finance Properties:**

- Property 4: Payment Recording Completeness
- Property 5: Payment Date Validation
- Property 6: Payment Immutability
- Property 7: Reversal Audit Trail

**Test Framework:** Vitest with fast-check

### 14.2 Unit Tests

- Service layer logic
- Permission checking
- Validation functions
- Utility functions

### 14.3 Integration Tests

- API endpoints
- Database operations
- Multi-step workflows
- Audit logging

---

## 15. DEPLOYMENT AND CONFIGURATION

### 15.1 Environment Variables

- `DATABASE_URL` - MongoDB connection
- `NEXTAUTH_SECRET` - Session encryption
- `NEXTAUTH_URL` - Application URL
- SMS/WhatsApp API keys
- Email configuration

### 15.2 Database Setup

```bash
npm run db:generate  # Generate Prisma client
npm run db:push     # Push schema to MongoDB
npm run db:seed     # Seed permissions
```

### 15.3 Build and Run

```bash
npm run build       # Build Next.js
npm run start       # Start production server
npm run dev         # Start development server
```

---

## 16. KEY WORKFLOWS

### 16.1 Payment Recording Workflow

1. Accountant opens Finance Dashboard
2. Clicks "Record Payment"
3. Selects student, term, amount, method
4. System validates:
   - Student exists
   - Term exists
   - Amount is positive
   - Date is not in future
5. System creates:
   - Payment record
   - Receipt (immutable)
   - Updates StudentAccount balance
   - Creates FinanceAuditLog
6. Receipt displayed and can be printed
7. Balance updated in real-time

### 16.2 Absence Notification Workflow

1. Teacher records attendance for class
2. System detects 2+ absences for student
3. System creates AbsenceNotification
4. Message queued for guardian
5. SMS/WhatsApp sent with:
   - Student name
   - Date
   - Periods missed
   - Response link
6. Parent can respond via link
7. Response logged in audit trail

### 16.3 Mark Approval Workflow

1. Teacher enters marks for exam
2. System validates marks
3. Marks marked as "pending approval"
4. DOS receives notification
5. DOS reviews marks
6. DOS approves or rejects
7. If approved: marks locked, results calculated
8. If rejected: marks returned to teacher
9. Audit trail records all actions

### 16.4 Staff Role Assignment Workflow

1. Admin opens Staff Management
2. Selects staff member
3. Assigns Primary Role
4. Assigns Secondary Roles (optional)
5. Assigns Responsibilities (classes, subjects, duties)
6. System applies corresponding permissions
7. Staff history entry created
8. Audit log records change
9. Staff member sees updated dashboard on next login

---

## 17. COMMON ISSUES AND SOLUTIONS

### 17.1 Permission Denied Errors

**Cause:** User lacks required permission
**Solution:** Check user's role and assigned permissions in permission service

### 17.2 School Not Found

**Cause:** schoolId mismatch or school suspended
**Solution:** Verify school exists and is active

### 17.3 Data Scope Issues

**Cause:** Accessing data from different school
**Solution:** Ensure all queries filter by correct schoolId

### 17.4 Audit Trail Missing

**Cause:** Audit logging not called
**Solution:** Verify audit service is called after data modifications

---

## 18. FUTURE ENHANCEMENTS

- Advanced reporting and analytics
- Mobile app for parents and teachers
- Biometric attendance integration
- Payment gateway integration
- Learning management system (LMS) integration
- Parent-teacher conference scheduling
- Student portfolio system
- Advanced discipline management
- Staff performance evaluation system
- Automated SMS/WhatsApp campaigns

---

## 19. GLOSSARY

- **Tenant:** School (multi-tenancy unit)
- **Role:** User type with specific permissions
- **Permission:** Access right to a feature or action
- **Responsibility:** Operational duty assigned to staff
- **Audit Trail:** Immutable record of system actions
- **Data Scope:** Extent of data visibility (school, class, personal)
- **DOS:** Director of Studies
- **Bursar:** Finance officer
- **Guardian:** Parent or legal guardian of student
- **Pilot:** Free trial program
- **SMS Budget:** Monthly SMS message limit

---

**Document Version:** 1.0
**Last Updated:** 2024
**System:** SchoolOffice v0.1.0
