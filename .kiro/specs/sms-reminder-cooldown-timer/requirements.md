# Requirements Document

## Introduction

This feature adds a cooldown timer to the SMS reminder button in the financial summary section of the admin dashboard. After sending reminders to guardians about outstanding fees, the button will be disabled for 10 days and display a countdown timer. This prevents spam and gives parents adequate time to respond before receiving another reminder.

## Glossary

- **SMS_Reminder_Button**: The button in the financial summary component that triggers SMS notifications to guardians
- **Cooldown_Timer**: A 10-day period during which the SMS_Reminder_Button cannot be clicked again
- **Last_Reminder_Timestamp**: The database-stored timestamp of when reminders were last sent
- **Financial_Summary_Component**: The admin dashboard component that displays outstanding fees and contains the SMS_Reminder_Button
- **Guardian**: A parent or responsible party who receives SMS notifications about outstanding fees
- **Admin_Dashboard**: The administrative interface where staff manage financial information

## Requirements

### Requirement 1: Store Last Reminder Timestamp

**User Story:** As a system administrator, I want the system to record when reminders were last sent, so that the cooldown period can be enforced across app restarts and server downtime.

#### Acceptance Criteria

1. WHEN the SMS_Reminder_Button is clicked, THE System SHALL store the current timestamp as Last_Reminder_Timestamp in the database
2. THE Last_Reminder_Timestamp SHALL persist across application restarts
3. THE Last_Reminder_Timestamp SHALL persist when the application is down
4. THE System SHALL retrieve the Last_Reminder_Timestamp from the database when the Financial_Summary_Component loads

### Requirement 2: Calculate Cooldown Period

**User Story:** As a system administrator, I want the system to calculate the remaining cooldown time, so that I know when reminders can be sent again.

#### Acceptance Criteria

1. WHEN the Last_Reminder_Timestamp exists, THE System SHALL calculate the time elapsed since Last_Reminder_Timestamp
2. THE Cooldown_Timer SHALL have a duration of 10 days
3. WHEN the elapsed time is less than 10 days, THE System SHALL calculate the remaining cooldown time
4. WHEN the elapsed time is 10 days or greater, THE System SHALL determine that the cooldown period has expired

### Requirement 3: Display Button State During Cooldown

**User Story:** As a system administrator, I want to see the cooldown status on the button, so that I know when I can send reminders again.

#### Acceptance Criteria

1. WHILE the Cooldown_Timer is active, THE SMS_Reminder_Button SHALL display the text "Reminders sent"
2. WHILE the Cooldown_Timer is active, THE SMS_Reminder_Button SHALL display the remaining time in a human-readable format
3. THE remaining time format SHALL include days and hours (e.g., "Next available in 7 days, 5 hours")
4. WHILE the Cooldown_Timer is active, THE SMS_Reminder_Button SHALL be disabled and not clickable
5. THE System SHALL update the displayed countdown at regular intervals

### Requirement 4: Restore Button After Cooldown Expires

**User Story:** As a system administrator, I want the button to become available again after the cooldown period, so that I can send new reminders when appropriate.

#### Acceptance Criteria

1. WHEN the Cooldown_Timer expires, THE SMS_Reminder_Button SHALL display the text "Send Reminders"
2. WHEN the Cooldown_Timer expires, THE SMS_Reminder_Button SHALL be enabled and clickable
3. WHEN the SMS_Reminder_Button is clicked after cooldown expiration, THE System SHALL allow sending new reminders

### Requirement 5: Handle Initial State

**User Story:** As a system administrator, I want the button to work correctly when no reminders have been sent yet, so that I can send the first batch of reminders.

#### Acceptance Criteria

1. WHEN no Last_Reminder_Timestamp exists in the database, THE SMS_Reminder_Button SHALL display the text "Send Reminders"
2. WHEN no Last_Reminder_Timestamp exists in the database, THE SMS_Reminder_Button SHALL be enabled and clickable
3. WHEN the SMS_Reminder_Button is clicked for the first time, THE System SHALL create the Last_Reminder_Timestamp record

### Requirement 6: Calculate Time Remaining on Frontend

**User Story:** As a system administrator, I want the countdown to update in real-time without page refreshes, so that I have accurate information about when reminders can be sent.

#### Acceptance Criteria

1. THE Financial_Summary_Component SHALL calculate the remaining cooldown time based on Last_Reminder_Timestamp
2. THE Financial_Summary_Component SHALL update the displayed countdown every minute
3. WHEN the countdown reaches zero, THE Financial_Summary_Component SHALL update the SMS_Reminder_Button state to enabled
4. THE countdown calculation SHALL account for timezone differences between server and client
