# Requirements Document

## Introduction

SchoolOffice SMS Communication System is designed for the Ugandan education market, providing cost-effective school-wide communication through SMS messaging at UGX 45 per message. The system prioritizes SMS over email and WhatsApp due to infrastructure limitations and cost considerations, ensuring all parents can receive communications regardless of their device type or internet connectivity.

## Glossary

- **SMS_System**: The core messaging infrastructure that handles SMS template management, sending, and tracking
- **Template_Editor**: The interface for creating and managing SMS message templates
- **Credit_Manager**: The system component that tracks and controls SMS credit usage
- **Auto_Trigger**: Automated messaging rules based on school events
- **Message_Log**: Audit trail of all SMS communications
- **Cost_Calculator**: Component that estimates SMS costs before sending
- **Parent_Contact**: Parent phone number and contact information in the system
- **School_Admin**: Administrative users with SMS management permissions
- **DOS**: Director of Studies with academic communication privileges
- **Bursar**: Financial officer with fees-related messaging privileges

## Requirements

### Requirement 1: SMS Template Management

**User Story:** As a school administrator, I want to create and manage SMS templates, so that I can ensure consistent and professional communication with parents.

#### Acceptance Criteria

1. WHEN an administrator accesses the template editor, THE SMS_System SHALL display all available templates with their purposes and allowed roles
2. WHEN editing a template, THE Template_Editor SHALL only allow insertion of predefined variables through click selection
3. WHEN a template is modified, THE SMS_System SHALL show a live preview with sample data
4. WHEN saving a template, THE SMS_System SHALL validate that all variables are properly formatted
5. WHERE role-based permissions are enabled, THE SMS_System SHALL restrict template editing based on user roles
6. WHEN a template exceeds 320 characters, THE Template_Editor SHALL prevent saving and display a warning
 the billling will be like this on payment the school will be given the number of sms in the relation to the total students where by the sms operation chances will be 9 times or muliplied by the number of students they have nd also the school nor admin oor any stuff is allowed to see the real sms count or any thing like the sms cost because it will cost issues if they calculate that he cost for an sms id cheaper than they are paying for it so the sms will be sent and the chances of sending sms wll be or sms counts deep in the application and only shown by the super admin the original costs and prices and also the remaing counts plus that will depend if school is paid full aount , but if paid half amount then the number of sms will be half the original ones and will be allowed to operate or use the application for one onth before everything on it is clossed and restricted from use plus if paid the quatar price then the number of sms given will be also a quater with also the same sms sending logic as the half and i want strict enforcing of these rules and if the schools has not paid any thing then they will not have acess to any thing or program or feature and i want these restrictions to be tight and every strong 
2. WHEN SMS credits are insufficient, THE SMS_System SHALL block all non-emergency messages
3. WHEN credits fall below a threshold, THE SMS_System SHALL notify administrators
4. WHEN calculating costs, THE SMS_System SHALL count each 160-character segment as one SMS unit at UGX 45
5. WHERE emergency reserves are configured, THE SMS_System SHALL allow emergency messages even with zero credits
6. WHEN daily or term limits are reached, THE SMS_System SHALL prevent further sending until limits reset

### Requirement 3: Automated SMS Triggers

**User Story:** As a DOS, I want automated SMS notifications for school events, so that parents receive timely information without manual intervention.

#### Acceptance Criteria

1. WHEN a student has outstanding fees for 14 days, THE Auto_Trigger SHALL send a fees reminder SMS
2. WHEN a payment is recorded, THE SMS_System SHALL immediately send a payment confirmation SMS
3. WHEN a term report is published, THE Auto_Trigger SHALL notify parents that reports are ready
4. WHEN configuring triggers, THE SMS_System SHALL allow schools to set reminder intervals and maximum reminders per term
5. WHERE automation is disabled, THE SMS_System SHALL require manual approval for all messages
6. WHEN trigger conditions are met, THE SMS_System SHALL check credit availability before sending

### Requirement 4: Role-Based SMS Permissions

**User Story:** As a head teacher, I want to control who can send SMS messages, so that communication remains professional and costs are controlled.

#### Acceptance Criteria

1. WHEN a teacher attempts to send SMS, THE SMS_System SHALL deny access unless specifically authorized
2. WHEN a bursar accesses SMS features, THE SMS_System SHALL only allow fees-related templates
3. WHEN an admin sends messages, THE SMS_System SHALL allow access to most templates except emergency alerts
4. WHEN a head teacher uses the system, THE SMS_System SHALL provide access to all templates and settings
5. WHERE emergency alerts are needed, THE SMS_System SHALL require head teacher or super admin authorization
6. WHEN permissions are violated, THE SMS_System SHALL log the attempt and notify administrators

### Requirement 5: SMS Audit and Logging

**User Story:** As a school administrator, I want complete records of all SMS communications, so that I can track usage and resolve disputes.

#### Acceptance Criteria

1. WHEN any SMS is sent, THE Message_Log SHALL record sender, template, cost, recipients, and timestamp
2. WHEN viewing SMS history, THE SMS_System SHALL display filterable logs with search capabilities
3. WHEN disputes arise, THE Message_Log SHALL provide complete audit trails for specific messages
4. WHEN generating reports, THE SMS_System SHALL calculate total costs per period and per template type
5. WHERE data retention is required, THE Message_Log SHALL maintain records for at least one academic year
6. WHEN exporting logs, THE SMS_System SHALL provide CSV and PDF formats for external review

### Requirement 6: Parent Contact Management

**User Story:** As a school registrar, I want to manage parent phone numbers and contact preferences, so that SMS messages reach the intended recipients.

#### Acceptance Criteria

1. WHEN registering a student, THE SMS_System SHALL require at least one valid parent phone number
2. WHEN updating contact information, THE SMS_System SHALL validate phone number formats for Ugandan networks
3. WHEN a parent has multiple numbers, THE SMS_System SHALL allow designation of primary and secondary contacts
4. WHEN sending messages, THE SMS_System SHALL use the primary contact unless specifically overridden
5. WHERE parents opt out of certain message types, THE SMS_System SHALL respect communication preferences
6. WHEN phone numbers are invalid, THE SMS_System SHALL flag them for administrator review

### Requirement 7: SMS Template Content Standards

**User Story:** As a parent, I want to receive clear and respectful SMS messages, so that I understand school communications and feel valued.

#### Acceptance Criteria

1. WHEN sending fees reminders, THE SMS_System SHALL use polite language without threatening tone
2. WHEN confirming payments, THE SMS_System SHALL include receipt numbers and remaining balances
3. WHEN notifying about reports, THE SMS_System SHALL avoid sending actual marks via SMS
4. WHEN broadcasting announcements, THE SMS_System SHALL enforce character limits to ensure clarity
5. WHERE emergency alerts are sent, THE SMS_System SHALL use urgent but non-panic language
6. WHEN templates are created, THE SMS_System SHALL provide Uganda-appropriate default wording

### Requirement 8: Integration with School Management Features

**User Story:** As a DOS, I want SMS notifications to integrate with academic and financial systems, so that parents receive relevant updates automatically.

#### Acceptance Criteria

1. WHEN marks are entered in the results system, THE SMS_System SHALL trigger report availability notifications
2. WHEN fees are recorded in the finance system, THE SMS_System SHALL send payment confirmations
3. WHEN attendance is marked, THE SMS_System SHALL optionally notify parents of absences
4. WHEN timetable changes occur, THE SMS_System SHALL allow broadcasting schedule updates
5. WHERE report cards are generated, THE SMS_System SHALL include shortened URLs for online access
6. WHEN academic terms end, THE SMS_System SHALL reset automated reminder counters

### Requirement 9: SMS Gateway Integration

**User Story:** As a system administrator, I want reliable SMS delivery through Ugandan networks, so that messages reach parents consistently.

#### Acceptance Criteria

1. WHEN integrating with SMS gateways, THE SMS_System SHALL support major Ugandan telecom providers
2. WHEN messages fail to send, THE SMS_System SHALL retry with exponential backoff
3. WHEN delivery reports are available, THE SMS_System SHALL track and display message status
4. WHEN gateway costs change, THE SMS_System SHALL allow easy price updates in configuration
5. WHERE multiple gateways are configured, THE SMS_System SHALL provide failover capabilities
6. WHEN sending bulk messages, THE SMS_System SHALL implement rate limiting to prevent gateway blocking

### Requirement 10: Emergency Communication Protocols

**User Story:** As a head teacher, I want emergency SMS capabilities, so that I can communicate urgent information to parents immediately.

#### Acceptance Criteria

1. WHEN sending emergency messages, THE SMS_System SHALL bypass normal credit limits
2. WHEN emergency alerts are triggered, THE SMS_System SHALL require two-factor confirmation
3. WHEN emergencies occur, THE SMS_System SHALL send to all parent contacts simultaneously
4. WHEN emergency messages are sent, THE SMS_System SHALL log them permanently for audit
5. WHERE emergency reserves are configured, THE SMS_System SHALL maintain separate credit pools
6. WHEN emergency protocols are activated, THE SMS_System SHALL notify school administrators immediately
