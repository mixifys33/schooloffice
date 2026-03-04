# Bugfix Requirements Document

## Introduction

The "Send Reminders" button in the admin dashboard's financial summary section creates Message records in the database with status='QUEUED' but fails to send actual SMS notifications through Africa's Talking gateway. This results in guardians not receiving payment reminder messages despite the system indicating success. The bug affects the core functionality of the payment reminder system, preventing schools from effectively communicating outstanding fee balances to parents.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the "Send Reminders" button is clicked in the financial summary component THEN the system calls `/api/bursar/send-reminders` endpoint which creates Message records with status='QUEUED' but does not send actual SMS messages

1.2 WHEN Message records are created with status='QUEUED' THEN the system returns a success response to the user indicating messages were sent, but no SMS delivery occurs

1.3 WHEN the `/api/bursar/send-reminders` endpoint processes student reminders THEN the system never invokes the SMS gateway service to transmit messages through Africa's Talking

### Expected Behavior (Correct)

2.1 WHEN the "Send Reminders" button is clicked in the financial summary component THEN the system SHALL send actual SMS messages through the Africa's Talking gateway and update Message records with delivery status

2.2 WHEN Message records are created THEN the system SHALL invoke the SMS sending service to transmit messages and update the status based on actual delivery results (SENT, FAILED, etc.)

2.3 WHEN the `/api/bursar/send-reminders` endpoint processes student reminders THEN the system SHALL call smsSendingService.sendFeesReminders() to handle SMS transmission through the gateway

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the financial summary component displays unpaid students THEN the system SHALL CONTINUE TO show the correct list of students with outstanding balances

3.2 WHEN the `/api/bursar/send-reminders` endpoint validates student data THEN the system SHALL CONTINUE TO check for active students, guardian phone numbers, and outstanding balances

3.3 WHEN the SMS sending service processes fee reminders THEN the system SHALL CONTINUE TO use the existing template rendering, cost calculation, and audit logging functionality

3.4 WHEN the `/api/sms/send-fee-reminders` endpoint is called THEN the system SHALL CONTINUE TO function correctly and send SMS messages as it currently does
