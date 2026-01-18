# Implementation Plan: SMS Communication System

## Overview

This implementation plan breaks down the SMS Communication System into discrete coding tasks. The system will be built incrementally, starting with core infrastructure (database models, credit management, subscription enforcement), then adding messaging capabilities (templates, sending, logging), and finally implementing advanced features (auto triggers, emergency protocols, gateway integration).

The implementation follows a test-driven approach with both unit tests and property-based tests to ensure correctness at each step.

## Tasks

- [x] 1. Set up database models and schema
  - Create Prisma schema extensions for SMS system
  - Add SMSCreditAllocation, SchoolSubscription, AutoTrigger, TriggerExecutionLog models
  - Add PaymentTier and TriggerEventType enums
  - Run database migration
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3_

- [ ]\* 1.1 Write property test for database model validation
  - **Property 36: Subscription-Based Credit Allocation**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [-] 2. Implement Credit Manager service
  - [x] 2.1 Create credit allocation logic based on payment tier
    - Implement calculateAllocation() with 9x, 4.5x, 2.25x multipliers
    - Implement allocateCredits() for super admin
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]\* 2.2 Write property test for credit allocation
    - **Property 36: Subscription-Based Credit Allocation**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [-] 2.3 Implement credit checking and deduction
    - Implement hasCredits() and getAvailableCredits()
    - Implement deductCredits() with transaction safety
    - Hide credit counts from school users
    - _Requirements: 2.6, 2.7, 2.8_

  - [ ]\* 2.4 Write property test for credit limit enforcement
    - **Property 5: Credit Limit Enforcement**
    - **Validates: Requirements 2.8, 2.11, 10.1**

  - [ ] 2.5 Implement credit threshold notifications
    - Check credit levels against configured thresholds
    - Generate notifications for administrators
    - _Requirements: 2.9_

  - [ ]\* 2.6 Write property test for threshold notifications
    - **Property 7: Credit Threshold Notifications**
    - **Validates: Requirements 2.9**

- [ ] 3. Implement Subscription Enforcer service
  - [ ] 3.1 Create subscription validation logic
    - Implement validateAccess() to check payment status
    - Implement canSendSMS() and canAccessFeature()
    - _Requirements: 2.4, 2.5_

  - [ ]\* 3.2 Write property test for access restriction
    - **Property 37: Access Restriction by Payment Status**
    - **Validates: Requirements 2.4**

  - [ ] 3.3 Implement time-based access expiry
    - Check expiry dates for HALF and QUARTER tiers
    - Implement automatic lockout after one month
    - _Requirements: 2.2, 2.3, 2.5_

  - [ ]\* 3.4 Write property test for time-limited access
    - **Property 38: Time-Limited Access for Partial Payment**
    - **Validates: Requirements 2.2, 2.3, 2.5**

  - [ ] 3.5 Implement cost visibility restrictions
    - Hide SMS costs from school users in all APIs
    - Show costs only to super admins
    - _Requirements: 2.6, 2.7_

  - [ ]\* 3.6 Write property test for cost visibility
    - **Property 39: Cost Visibility Restriction**
    - **Validates: Requirements 2.6, 2.7**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Template Manager service
  - [ ] 5.1 Create template CRUD operations
    - Implement createTemplate(), updateTemplate(), deleteTemplate()
    - Implement getTemplate() and listTemplates() with filters
    - _Requirements: 1.1_

  - [ ] 5.2 Implement template validation
    - Validate template variables ({{variable}} format)
    - Enforce 320-character limit
    - Check for undefined variables
    - _Requirements: 1.2, 1.4, 1.6_

  - [ ]\* 5.3 Write property test for template variable validation
    - **Property 1: Template Variable Validation**
    - **Validates: Requirements 1.2, 1.4**

  - [ ]\* 5.4 Write property test for character limit enforcement
    - **Property 2: Template Character Limit Enforcement**
    - **Validates: Requirements 1.6**

  - [ ] 5.5 Implement template preview with sample data
    - Render template with variable substitution
    - Return preview string
    - _Requirements: 1.3_

  - [ ]\* 5.6 Write property test for preview consistency
    - **Property 3: Template Preview Consistency**
    - **Validates: Requirements 1.3**

  - [ ] 5.7 Implement role-based template access
    - Check user role against template allowedRoles
    - Restrict editing based on permissions
    - _Requirements: 1.5_

  - [ ]\* 5.8 Write property test for role-based access
    - **Property 4: Role-Based Template Access**
    - **Validates: Requirements 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6**

- [ ] 6. Implement Permission Validator service
  - [ ] 6.1 Create permission checking logic
    - Implement canSendSMS(), canUseTemplate(), canSendEmergency()
    - Implement validateSendPermission() with detailed results
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 6.2 Implement permission violation logging
    - Log unauthorized access attempts
    - Notify administrators of violations
    - _Requirements: 4.6_

  - [ ]\* 6.3 Write unit tests for permission scenarios
    - Test teacher denied access
    - Test bursar restricted to fees templates
    - Test head teacher full access
    - Test emergency alert authorization
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7. Implement SMS Gateway Integration service
  - [ ] 7.1 Integrate Africa's Talking SDK
    - Set up API credentials and configuration
    - Implement sendSMS() and sendBulkSMS()
    - _Requirements: 9.1_

  - [ ]\* 7.2 Write property test for gateway provider support
    - **Property 25: Gateway Provider Support**
    - **Validates: Requirements 9.1**

  - [ ] 7.3 Implement phone number validation
    - Validate Ugandan number formats (+256[37][0-9]{8})
    - Format local numbers to international format
    - _Requirements: 6.2, 6.6_

  - [ ]\* 7.4 Write property test for phone validation
    - **Property 17: Phone Number Validation**
    - **Validates: Requirements 6.1, 6.2, 6.6**

  - [ ] 7.5 Implement SMS cost calculation
    - Count message segments (160 chars GSM, 70 chars Unicode)
    - Calculate cost at UGX 45 per segment
    - _Requirements: 2.10_

  - [ ]\* 7.6 Write property test for cost calculation
    - **Property 6: SMS Cost Calculation**
    - **Validates: Requirements 2.10**

  - [ ] 7.7 Implement retry logic with exponential backoff
    - Retry failed sends up to 2 times
    - Use delays: 5min, 15min, 30min
    - _Requirements: 9.2_

  - [ ]\* 7.8 Write property test for retry backoff
    - **Property 26: Retry with Exponential Backoff**
    - **Validates: Requirements 9.2**

  - [ ] 7.9 Implement delivery status tracking
    - Process delivery callbacks from gateway
    - Update message status in database
    - _Requirements: 9.3_

  - [ ]\* 7.10 Write property test for delivery tracking
    - **Property 27: Delivery Status Tracking**
    - **Validates: Requirements 9.3**

  - [ ] 7.11 Implement rate limiting for bulk sends
    - Enforce maximum messages per second
    - Space sends appropriately
    - _Requirements: 9.6_

  - [ ]\* 7.12 Write property test for rate limiting
    - **Property 30: Rate Limiting Enforcement**
    - **Validates: Requirements 9.6**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement Message Logger service
  - [ ] 9.1 Create message logging functionality
    - Implement logMessage() with all required fields
    - Implement logCost() for super admin tracking
    - _Requirements: 5.1_

  - [ ]\* 9.2 Write property test for comprehensive logging
    - **Property 12: Comprehensive Message Logging**
    - **Validates: Requirements 5.1, 5.3**

  - [ ] 9.3 Implement message history queries
    - Implement getMessageHistory() with filters
    - Implement searchMessages() with text search
    - _Requirements: 5.2_

  - [ ]\* 9.4 Write property test for log query correctness
    - **Property 13: Log Query Correctness**
    - **Validates: Requirements 5.2**

  - [ ] 9.5 Implement usage and cost reporting
    - Generate usage reports by period
    - Generate cost reports for super admin only
    - _Requirements: 5.4_

  - [ ]\* 9.6 Write property test for cost report accuracy
    - **Property 14: Cost Report Accuracy**
    - **Validates: Requirements 5.4**

  - [ ] 9.7 Implement log export functionality
    - Export logs to CSV format
    - Export logs to PDF format
    - _Requirements: 5.6_

  - [ ]\* 9.8 Write property test for export format validity
    - **Property 16: Export Format Validity**
    - **Validates: Requirements 5.6**

  - [ ] 9.9 Implement data retention compliance
    - Ensure logs retained for one academic year minimum
    - Prevent premature deletion
    - _Requirements: 5.5_

  - [ ]\* 9.10 Write property test for data retention
    - **Property 15: Data Retention Compliance**
    - **Validates: Requirements 5.5**

- [ ] 10. Implement SMS Orchestrator (core sending logic)
  - [ ] 10.1 Create message sending workflow
    - Check subscription status
    - Validate permissions
    - Check credit availability
    - Render template
    - Deduct credits
    - Send via gateway
    - Log message
    - _Requirements: 2.8, 4.1, 5.1_

  - [ ] 10.2 Implement primary contact selection
    - Use primary contact by default
    - Allow override for specific sends
    - _Requirements: 6.3, 6.4_

  - [ ]\* 10.3 Write property test for primary contact selection
    - **Property 18: Primary Contact Selection**
    - **Validates: Requirements 6.3, 6.4**

  - [ ] 10.3 Implement communication preference enforcement
    - Check guardian opt-out preferences
    - Skip messages for opted-out types
    - _Requirements: 6.5_

  - [ ]\* 10.5 Write property test for preference enforcement
    - **Property 19: Communication Preference Enforcement**
    - **Validates: Requirements 6.5**

  - [ ] 10.6 Implement limit reset logic
    - Reset daily limits at midnight
    - Reset term limits at term end
    - _Requirements: 2.12, 8.6_

  - [ ]\* 10.7 Write property test for limit reset
    - **Property 8: Limit Reset Enforcement**
    - **Validates: Requirements 2.12, 8.6**

- [ ] 11. Implement content standards validation
  - [ ] 11.1 Validate payment confirmation content
    - Ensure receipt number included
    - Ensure remaining balance included
    - _Requirements: 7.2_

  - [ ]\* 11.2 Write property test for payment confirmation
    - **Property 20: Payment Confirmation Completeness**
    - **Validates: Requirements 7.2**

  - [ ] 11.3 Validate report notification content
    - Ensure no marks/grades in message
    - Only notify availability
    - _Requirements: 7.3_

  - [ ]\* 11.4 Write property test for report notification
    - **Property 21: Report Notification Content Restriction**
    - **Validates: Requirements 7.3**

  - [ ] 11.5 Enforce announcement character limits
    - Validate announcement length
    - Reject oversized announcements
    - _Requirements: 7.4_

  - [ ]\* 11.6 Write property test for announcement limits
    - **Property 22: Announcement Character Limit**
    - **Validates: Requirements 7.4**

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement Auto Trigger Engine
  - [ ] 13.1 Create trigger configuration management
    - Implement configureTrigger(), updateTrigger(), deleteTrigger()
    - Implement getTrigger() and listTriggers()
    - _Requirements: 3.4_

  - [ ] 13.2 Implement trigger evaluation logic
    - Evaluate trigger conditions against events
    - Check credit availability before execution
    - Track execution count and intervals
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

  - [ ]\* 13.3 Write property test for trigger execution
    - **Property 9: Auto Trigger Execution**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.6, 8.1, 8.2, 8.3**

  - [ ] 13.4 Implement trigger configuration validation
    - Validate reminder intervals
    - Validate maximum reminders per term
    - Enforce limits during execution
    - _Requirements: 3.4_

  - [ ]\* 13.5 Write property test for trigger configuration
    - **Property 10: Trigger Configuration Validation**
    - **Validates: Requirements 3.4**

  - [ ] 13.6 Implement manual approval requirement
    - Check if automation is disabled
    - Require manual approval when disabled
    - _Requirements: 3.5_

  - [ ]\* 13.7 Write property test for manual approval
    - **Property 11: Manual Approval Requirement**
    - **Validates: Requirements 3.5**

- [ ] 14. Implement integration triggers
  - [ ] 14.1 Create fees reminder trigger
    - Trigger on 14-day overdue fees
    - _Requirements: 3.1_

  - [ ] 14.2 Create payment confirmation trigger
    - Trigger immediately on payment recorded
    - _Requirements: 3.2, 8.2_

  - [ ] 14.3 Create report availability trigger
    - Trigger when marks entered in results system
    - _Requirements: 3.3, 8.1_

  - [ ] 14.4 Create attendance absence trigger
    - Trigger optionally on absence marked
    - _Requirements: 8.3_

  - [ ] 14.5 Implement short URL generation for reports
    - Generate shortened URLs for report access
    - Include in report notifications
    - _Requirements: 8.5_

  - [ ]\* 14.6 Write property test for short URL generation
    - **Property 23: Short URL Generation**
    - **Validates: Requirements 8.5**

  - [ ] 14.7 Implement timetable change broadcasting
    - Allow broadcasting schedule updates
    - _Requirements: 8.4_

  - [ ]\* 14.8 Write property test for timetable broadcasting
    - **Property 24: Timetable Change Broadcasting**
    - **Validates: Requirements 8.4**

- [ ] 15. Implement Emergency Communication Protocols
  - [ ] 15.1 Create emergency message handling
    - Bypass normal credit limits
    - Use emergency credit pool if configured
    - _Requirements: 10.1, 10.5_

  - [ ] 15.2 Implement two-factor confirmation
    - Require password re-entry or OTP
    - Validate before allowing send
    - _Requirements: 10.2_

  - [ ]\* 15.3 Write property test for two-factor confirmation
    - **Property 31: Emergency Two-Factor Confirmation**
    - **Validates: Requirements 10.2**

  - [ ] 15.4 Implement emergency broadcast to all contacts
    - Send to primary and secondary contacts
    - Send to all students simultaneously
    - _Requirements: 10.3_

  - [ ]\* 15.5 Write property test for emergency broadcast
    - **Property 32: Emergency Broadcast to All Contacts**
    - **Validates: Requirements 10.3**

  - [ ] 15.6 Implement permanent emergency logging
    - Mark emergency logs as permanent
    - Exclude from automated cleanup
    - _Requirements: 10.4_

  - [ ]\* 15.7 Write property test for permanent logging
    - **Property 33: Emergency Message Permanent Logging**
    - **Validates: Requirements 10.4**

  - [ ] 15.8 Implement emergency credit pool separation
    - Track emergency credits separately
    - Prevent depletion by non-emergency messages
    - _Requirements: 10.5_

  - [ ]\* 15.9 Write property test for credit pool separation
    - **Property 34: Emergency Credit Pool Separation**
    - **Validates: Requirements 10.5**

  - [ ] 15.10 Implement emergency protocol notifications
    - Notify all school administrators
    - Send immediately on activation
    - _Requirements: 10.6_

  - [ ]\* 15.11 Write property test for protocol notifications
    - **Property 35: Emergency Protocol Notification**
    - **Validates: Requirements 10.6**

- [ ] 16. Implement gateway failover and configuration
  - [ ] 16.1 Implement gateway cost configuration
    - Allow updating SMS cost without restart
    - Apply to all subsequent calculations
    - _Requirements: 9.4_

  - [ ]\* 16.2 Write property test for cost configuration
    - **Property 28: Gateway Cost Configuration**
    - **Validates: Requirements 9.4**

  - [ ] 16.3 Implement gateway failover
    - Attempt backup gateway on primary failure
    - Track failover events
    - _Requirements: 9.5_

  - [ ]\* 16.4 Write property test for gateway failover
    - **Property 29: Gateway Failover**
    - **Validates: Requirements 9.5**

- [ ] 17. Create API endpoints
  - [ ] 17.1 Create template management endpoints
    - POST /api/sms/templates - Create template
    - GET /api/sms/templates - List templates
    - GET /api/sms/templates/:id - Get template
    - PUT /api/sms/templates/:id - Update template
    - DELETE /api/sms/templates/:id - Delete template
    - POST /api/sms/templates/:id/preview - Preview template
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 17.2 Create message sending endpoints
    - POST /api/sms/send - Send single SMS
    - POST /api/sms/send-bulk - Send bulk SMS
    - GET /api/sms/messages - List messages
    - GET /api/sms/messages/:id - Get message details
    - _Requirements: 2.8, 4.1, 5.1_

  - [ ] 17.3 Create credit management endpoints (Super Admin only)
    - GET /api/sms/credits/:schoolId - Get credit allocation
    - POST /api/sms/credits/:schoolId - Allocate credits
    - GET /api/sms/credits/reports/system - System-wide report
    - _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7_

  - [ ] 17.4 Create auto trigger endpoints
    - POST /api/sms/triggers - Create trigger
    - GET /api/sms/triggers - List triggers
    - GET /api/sms/triggers/:id - Get trigger
    - PUT /api/sms/triggers/:id - Update trigger
    - DELETE /api/sms/triggers/:id - Delete trigger
    - POST /api/sms/triggers/:id/enable - Enable trigger
    - POST /api/sms/triggers/:id/disable - Disable trigger
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 17.5 Create reporting endpoints
    - GET /api/sms/logs - Get message logs
    - GET /api/sms/reports/usage - Usage report
    - GET /api/sms/reports/costs - Cost report (Super Admin only)
    - POST /api/sms/logs/export - Export logs (CSV/PDF)
    - _Requirements: 5.2, 5.4, 5.6_

  - [ ]\* 17.6 Write integration tests for API endpoints
    - Test authentication and authorization
    - Test request validation
    - Test response formats
    - Test error handling
    - _Requirements: All_

- [ ] 18. Create default SMS templates
  - [ ] 18.1 Create fees reminder template
    - Use polite, non-threatening language
    - Include Uganda-appropriate wording
    - _Requirements: 7.1, 7.6_

  - [ ] 18.2 Create payment confirmation template
    - Include receipt number variable
    - Include remaining balance variable
    - _Requirements: 7.2_

  - [ ] 18.3 Create report available template
    - Avoid including marks
    - Include report URL variable
    - _Requirements: 7.3_

  - [ ] 18.4 Create emergency alert template
    - Use urgent but non-panic language
    - _Requirements: 7.5_

  - [ ] 18.5 Create general announcement template
    - Enforce character limits
    - _Requirements: 7.4_

- [ ] 19. Implement background job processing
  - [ ] 19.1 Set up Bull queue for SMS processing
    - Configure Redis connection
    - Create SMS send queue
    - Create trigger evaluation queue

  - [ ] 19.2 Create background workers
    - SMS send worker (process in batches of 100)
    - Trigger evaluation worker (run every 5 minutes)
    - Delivery status polling worker (run every 10 minutes)
    - Credit threshold check worker (run every hour)

  - [ ] 19.3 Implement progress tracking
    - Track bulk send progress
    - Provide user feedback on status

- [ ] 20. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 21. Integration and deployment preparation
  - [ ] 21.1 Add database indexes for performance
    - Index on schoolId, studentId, status for messages
    - Index on eventType, enabled for triggers
    - Compound index on schoolId + createdAt for logs

  - [ ] 21.2 Implement caching strategy
    - Cache template content (5 minutes)
    - Cache subscription status (1 minute)
    - Cache user permissions (5 minutes)

  - [ ] 21.3 Add monitoring and alerting
    - Track SMS send success rate
    - Monitor gateway response times
    - Alert on credit depletion (80% threshold)
    - Alert on permission violations

  - [ ]\* 21.4 Write end-to-end tests
    - Test complete send SMS flow
    - Test auto trigger execution flow
    - Test emergency message flow
    - Test subscription enforcement flow

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All property tests should run with minimum 100 iterations
- Use fast-check library for property-based testing in TypeScript
