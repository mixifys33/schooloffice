# Requirements Document: Super Admin Schools Control Center

## Introduction

The Super Admin Schools Control Center is a comprehensive dashboard and management interface that transforms school oversight from passive monitoring into active strategic control. This control tower enables super administrators to instantly assess school health, prevent churn, protect revenue, and intervene decisively when needed. The system must answer the critical question "Which schools are alive, growing, paying, struggling, or about to churn?" in under 10 seconds.

## Glossary

- **Super_Admin**: A privileged user with platform-wide access to manage all schools
- **School**: An educational institution entity within the platform with associated users, data, and subscription
- **Health_Score**: A weighted 0-100 numerical metric indicating overall school vitality based on activity, data completeness, SMS engagement, payment discipline, and growth
- **Control_Action**: An administrative operation that modifies school state (suspend, reactivate, plan change, etc.)
- **Audit_Log**: An immutable record of all control actions with timestamp, actor, and context
- **Dashboard**: The primary interface displaying school overview, metrics, and health indicators
- **Alert_Flag**: An automated indicator marking schools meeting critical condition thresholds
- **School_Profile**: A detailed view of a single school's complete information and metrics
- **Churn**: The loss of a school customer through cancellation or non-renewal
- **SMS_Engagement**: Metrics related to SMS message usage and delivery for school communications

## Requirements

### Requirement 1: All Schools Dashboard View

**User Story:** As a super admin, I want to see a comprehensive dashboard of all schools, so that I can quickly assess platform health and identify schools needing attention.

#### Acceptance Criteria

1. WHEN the super admin accesses the dashboard, THE Dashboard SHALL display global statistics including total schools, active schools, suspended schools, total revenue, and schools flagged for attention
2. WHEN the dashboard loads, THE Dashboard SHALL display a diagnostic table with all schools showing name, health score, plan, MRR, last activity, student count, teacher count, and alert flags
3. WHEN displaying school entries, THE Dashboard SHALL use visual health signals with color coding (green for healthy 80-100, yellow for at-risk 50-79, red for critical 0-49)
4. WHEN critical alerts exist, THE Dashboard SHALL display them prominently at the top of the interface
5. THE Dashboard SHALL load and display all initial data within 2 seconds for up to 1,000 schools

### Requirement 2: Search and Filtering

**User Story:** As a super admin, I want to search and filter schools efficiently, so that I can quickly find specific schools or groups of schools matching criteria.

#### Acceptance Criteria

1. WHEN the super admin enters a search query, THE System SHALL search across school name, admin email, and school ID fields
2. WHEN the super admin applies a search, THE System SHALL return results within 500 milliseconds
3. THE System SHALL support stackable filters including plan type, health score range, payment status, activity status, and alert flags
4. WHEN filters are applied, THE System SHALL update the displayed results within 300 milliseconds
5. WHEN the super admin navigates away and returns, THE System SHALL persist the last applied search and filter state
6. THE System SHALL display the count of schools matching current filters

### Requirement 3: Bulk Actions

**User Story:** As a super admin, I want to perform actions on multiple schools simultaneously, so that I can efficiently manage groups of schools.

#### Acceptance Criteria

1. THE System SHALL provide multi-select functionality for school entries in the table
2. WHEN schools are selected, THE System SHALL display available bulk actions including suspend, reactivate, and send notice
3. WHEN a bulk action is initiated, THE System SHALL require confirmation before execution
4. WHEN a bulk action is executed, THE System SHALL process all selected schools and report success or failure for each
5. THE System SHALL NOT provide a bulk delete action for schools
6. WHEN bulk actions complete, THE System SHALL log each action individually in the audit trail

### Requirement 4: School Health Score

**User Story:** As a super admin, I want to see a calculated health score for each school, so that I can quickly identify schools at risk of churn.

#### Acceptance Criteria

1. THE Health_Score SHALL be calculated as a weighted sum with the following components: activity recency (30%), data completeness (20%), SMS engagement (20%), payment discipline (20%), and growth trajectory (10%)
2. THE Health_Score SHALL be a numerical value between 0 and 100
3. WHEN activity recency is measured, THE System SHALL assign 30 points for login within 7 days, 15 points for login within 30 days, and 0 points for no login beyond 30 days
4. WHEN data completeness is measured, THE System SHALL assign points based on percentage of required fields populated (students, teachers, classes, schedules)
5. WHEN SMS engagement is measured, THE System SHALL assign points based on SMS usage relative to student count
6. WHEN payment discipline is measured, THE System SHALL assign 20 points for current payments, 10 points for payments within 7 days of due date, and 0 points for overdue payments
7. WHEN growth trajectory is measured, THE System SHALL assign points based on month-over-month change in student count
8. THE System SHALL recalculate health scores daily via background job

### Requirement 5: Automated Alerts and Flags

**User Story:** As a super admin, I want the system to automatically flag schools meeting critical conditions, so that I can proactively address issues before they result in churn.

#### Acceptance Criteria

1. WHEN a school has SMS balance below 100 messages, THE System SHALL flag the school with a "Low SMS" alert
2. WHEN a school has no admin login for 14 days, THE System SHALL flag the school with a "Inactive Admin" alert
3. WHEN a school has payment overdue by more than 7 days, THE System SHALL flag the school with a "Payment Overdue" alert
4. WHEN a school has health score below 50, THE System SHALL flag the school with a "Critical Health" alert
5. WHEN a school has declining student count for 2 consecutive months, THE System SHALL flag the school with a "Declining Enrollment" alert
6. THE System SHALL check and update alert flags hourly via background job
7. WHEN displaying alerts, THE System SHALL show the alert type, severity, and days since condition started

### Requirement 6: School Profile Page

**User Story:** As a super admin, I want to view detailed information about a specific school, so that I can understand its complete status and history before taking action.

#### Acceptance Criteria

1. WHEN the super admin clicks on a school, THE System SHALL navigate to the school profile page
2. THE School_Profile SHALL display a header section with school name, health score, plan, status badge, and last activity timestamp
3. THE School_Profile SHALL display quick action buttons for suspend, reactivate, change plan, reset admin password, force logout, and impersonate
4. THE School_Profile SHALL display core information including admin name, admin email, phone, registration date, and current plan details
5. THE School_Profile SHALL display usage metrics including student count, teacher count, class count, SMS sent this month, and SMS balance
6. THE School_Profile SHALL display financial metrics including MRR, total revenue, last payment date, last payment amount, and next billing date
7. THE School_Profile SHALL display an activity timeline showing recent significant events in reverse chronological order
8. THE School_Profile SHALL display current alert flags with descriptions

### Requirement 7: Global Control Actions

**User Story:** As a super admin, I want to perform control actions on schools, so that I can manage school access, configuration, and troubleshooting.

#### Acceptance Criteria

1. WHEN the super admin initiates a suspend action, THE System SHALL disable school access and mark the school as suspended
2. WHEN the super admin initiates a reactivate action, THE System SHALL restore school access and mark the school as active
3. WHEN the super admin initiates a change plan action, THE System SHALL update the school's subscription plan and adjust billing
4. WHEN the super admin initiates a reset admin password action, THE System SHALL generate a password reset link and send it to the admin email
5. WHEN the super admin initiates a force logout action, THE System SHALL invalidate all active sessions for the school's users
6. WHEN the super admin initiates an impersonate action, THE System SHALL log the super admin into the school's admin account while maintaining audit trail
7. WHEN any control action is initiated, THE System SHALL require confirmation with reason for action
8. WHEN any control action is executed, THE System SHALL create an immutable audit log entry

### Requirement 8: Business Intelligence Dashboard

**User Story:** As a super admin, I want to see aggregated business metrics across all schools, so that I can understand platform performance and identify trends.

#### Acceptance Criteria

1. THE System SHALL display total MRR across all active schools
2. THE System SHALL display average health score across all schools
3. THE System SHALL calculate and display churn rate as percentage of schools lost in the last 30 days
4. THE System SHALL display revenue per school as total revenue divided by active school count
5. THE System SHALL display distribution of schools by health score range (0-49, 50-79, 80-100)
6. THE System SHALL display distribution of schools by plan type
7. THE System SHALL display count of schools with active alert flags by alert type
8. THE System SHALL cache business intelligence metrics for 5 minutes

### Requirement 9: Security and Audit Trail

**User Story:** As a super admin, I want all control actions to be logged immutably, so that there is complete traceability and accountability for administrative actions.

#### Acceptance Criteria

1. WHEN any control action is executed, THE System SHALL create an audit log entry with timestamp, super admin ID, action type, target school ID, reason, and result
2. THE Audit_Log SHALL be stored in a separate immutable table that does not allow updates or deletes
3. THE System SHALL display audit logs in the school profile showing recent actions taken on that school
4. THE System SHALL provide a global audit log view showing all actions across all schools
5. WHEN displaying audit logs, THE System SHALL show the super admin name, action description, timestamp, and reason
6. THE System SHALL retain audit logs indefinitely

### Requirement 10: Mobile Responsiveness

**User Story:** As a super admin, I want to access the control center on mobile devices, so that I can monitor and manage schools while away from my desk.

#### Acceptance Criteria

1. WHEN accessed on mobile devices, THE Dashboard SHALL adapt layout to single-column view with stacked cards
2. WHEN accessed on mobile devices, THE System SHALL optimize table display with horizontal scrolling or collapsible columns
3. WHEN accessed on mobile devices, THE System SHALL provide touch-friendly controls with minimum 44x44 pixel touch targets
4. WHEN accessed on mobile devices, THE System SHALL maintain performance targets of under 2 seconds page load on 4G connection
5. THE System SHALL support responsive breakpoints for mobile (320-767px), tablet (768-1023px), and desktop (1024px+)

### Requirement 11: Performance Requirements

**User Story:** As a super admin, I want the system to respond quickly, so that I can efficiently manage schools without waiting for slow interfaces.

#### Acceptance Criteria

1. THE Dashboard SHALL load initial view within 2 seconds for up to 1,000 schools
2. WHEN search is performed, THE System SHALL return results within 500 milliseconds
3. WHEN filters are applied, THE System SHALL update results within 300 milliseconds
4. THE System SHALL implement caching with 5-minute TTL for global statistics, 1-minute TTL for school list data, and daily refresh for health scores
5. WHEN real-time updates occur, THE System SHALL push updates to connected clients within 5 seconds
6. THE System SHALL paginate school lists with 50 schools per page to maintain performance

### Requirement 12: Authentication and Authorization

**User Story:** As a platform administrator, I want to ensure only authorized super admins can access the control center, so that school data and control actions are protected.

#### Acceptance Criteria

1. THE System SHALL require super admin authentication before displaying any control center interface
2. WHEN a non-super-admin user attempts to access the control center, THE System SHALL deny access and redirect to unauthorized page
3. WHEN a super admin session expires, THE System SHALL require re-authentication before allowing further actions
4. THE System SHALL validate super admin permissions before executing any control action
5. THE System SHALL log all authentication attempts and authorization failures

### Requirement 13: Accessibility Compliance

**User Story:** As a platform administrator, I want the control center to be accessible, so that super admins with disabilities can effectively use the interface.

#### Acceptance Criteria

1. THE System SHALL comply with WCAG 2.1 Level AA standards
2. THE System SHALL provide keyboard navigation for all interactive elements
3. THE System SHALL provide appropriate ARIA labels for screen readers
4. THE System SHALL maintain color contrast ratios of at least 4.5:1 for normal text and 3:1 for large text
5. THE System SHALL provide focus indicators for all interactive elements
