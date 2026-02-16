# Requirements Document

## Introduction

This specification defines improvements to the SMS fee reminder system based on user feedback. The current system sends fee reminders but has two key issues: the messages are too long and not urgent enough, and the system may send reminders to parents whose students have zero or negative balances (meaning they've paid all fees). These improvements will make the messaging more effective while preventing wasteful SMS sends.

## Glossary

- **SMS_System**: The school's SMS messaging system that sends fee reminders to parents/guardians
- **Fee_Reminder**: An SMS message sent to parents about outstanding student fees
- **Balance**: The amount of money a student owes to the school (positive = owes money, zero/negative = fully paid)
- **Template**: The message format used for fee reminders with variable placeholders
- **Zero_Balance_Student**: A student whose balance is 0 or negative (fully paid)
- **Outstanding_Balance_Student**: A student whose balance is greater than 0 (owes money)

## Requirements

### Requirement 1: Shorter and More Urgent Fee Reminder Messages

**User Story:** As a school administrator, I want fee reminder messages to be shorter and more urgent, so that parents take immediate action and SMS costs are reduced.

#### Acceptance Criteria

1. WHEN the system sends a fee reminder SMS, THE SMS_System SHALL use a message template that is significantly shorter than the current template
2. WHEN the system sends a fee reminder SMS, THE SMS_System SHALL include urgent language that conveys the need for immediate payment
3. WHEN the system sends a fee reminder SMS, THE SMS_System SHALL maintain all essential information including student name, balance amount, and school name
4. WHEN the system renders the fee reminder template, THE SMS_System SHALL properly substitute all template variables with actual values
5. WHEN the system sends a fee reminder SMS, THE SMS_System SHALL ensure the message length is optimized for single SMS unit cost

### Requirement 2: Prevent SMS to Zero Balance Students

**User Story:** As a school administrator, I want to prevent fee reminder SMS from being sent to parents of students with zero or negative balances, so that SMS credits are not wasted on unnecessary messages.

#### Acceptance Criteria

1. WHEN a fee reminder is requested for a student, THE SMS_System SHALL check the student's current balance before sending
2. WHEN a student's balance is zero or negative, THE SMS_System SHALL not send a fee reminder SMS
3. WHEN a student's balance is zero or negative, THE SMS_System SHALL return an appropriate status indicating no reminder was needed
4. WHEN processing bulk fee reminders, THE SMS_System SHALL exclude all students with zero or negative balances from the send list
5. WHEN a fee reminder send is blocked due to zero balance, THE SMS_System SHALL log this decision for audit purposes

### Requirement 3: Maintain Existing Functionality

**User Story:** As a school administrator, I want all existing fee reminder functionality to continue working, so that the improvements don't break current workflows.

#### Acceptance Criteria

1. WHEN the system processes manual fee reminder requests, THE SMS_System SHALL continue to support individual student reminders
2. WHEN the system processes bulk fee reminder requests, THE SMS_System SHALL continue to support sending to multiple students
3. WHEN the system sends fee reminders, THE SMS_System SHALL continue to support both SMS and WhatsApp channels
4. WHEN the system sends fee reminders, THE SMS_System SHALL continue to log all message sends for audit trails
5. WHEN the system validates balances, THE SMS_System SHALL continue to use the existing balance calculation service
6. WHEN template variables are processed, THE SMS_System SHALL continue to support custom message overrides

### Requirement 4: Template Variable Compatibility

**User Story:** As a school administrator, I want the new shorter template to work with existing template variables, so that all current integrations continue functioning.

#### Acceptance Criteria

1. WHEN the new template is rendered, THE SMS_System SHALL support the PARENT_NAME variable for personalization
2. WHEN the new template is rendered, THE SMS_System SHALL support the STUDENT_NAME variable to identify the student
3. WHEN the new template is rendered, THE SMS_System SHALL support the BALANCE variable to show the amount owed
4. WHEN the new template is rendered, THE SMS_System SHALL support the SCHOOL_NAME variable for school identification
5. WHEN custom messages are used, THE SMS_System SHALL continue to replace template variables in custom content

### Requirement 5: Balance Validation Enhancement

**User Story:** As a school administrator, I want robust balance validation before sending reminders, so that the system reliably prevents unnecessary SMS sends.

#### Acceptance Criteria

1. WHEN validating a student's balance, THE SMS_System SHALL ensure balance data is available and accurate
2. WHEN balance data is unavailable or invalid, THE SMS_System SHALL not send a fee reminder
3. WHEN balance calculation fails, THE SMS_System SHALL return an appropriate error message
4. WHEN a student has a negative balance (overpaid), THE SMS_System SHALL treat this the same as zero balance
5. WHEN balance validation succeeds, THE SMS_System SHALL proceed with the reminder send process