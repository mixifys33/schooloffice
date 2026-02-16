# Implementation Plan: Teacher Marks Management System

## Overview

This implementation plan converts the comprehensive Teacher Marks Management System design into discrete coding tasks. The system implements sophisticated new curriculum grading logic with multiple CA entries, proper aggregation mathematics, three-tier reporting, and comprehensive UI/UX design. Each task builds incrementally toward a complete, inspection-ready grading system.

## Tasks

- [x] 1. Database Schema and Models Setup
  - [x] 1.1 Create new Prisma models for CA and Exam entries
    - Create CAEntry model with all required fields (name, type, maxScore, rawScore, etc.)
    - Create ExamEntry model with exam-specific fields
    - Add CAType and SubmissionStatus enums
    - Set up proper relations to existing Student, Subject, Staff, Term models
    - Add unique constraints for exam entries (one per student-subject-term)
    - _Requirements: 23.1, 23.2, 23.4, 25.1, 25.2_

  - [ ]\* 1.2 Write property test for database model integrity
    - **Property 14: Architectural Separation Integrity**
    - **Validates: Requirements 32.4**

  - [x] 1.3 Run database migration and verify schema
    - Generate and apply Prisma migration
    - Verify all new tables and relations are created correctly
    - Test database constraints and foreign key relationships
    - _Requirements: 12.1, 12.2_

- [x] 2. Core Grading Engine Implementation
  - [x] 2.1 Implement GradingEngine class with mathematical calculations
    - Create calculateCAContribution method with proper percentage conversion
    - Create calculateExamContribution method with 80% weighting
    - Create calculateFinalGrade method combining CA and Exam
    - Create generateGradeCalculation method for complete calculations
    - Implement proper decimal precision handling
    - _Requirements: 24.1, 24.2, 24.3, 25.3, 30.2_

  - [ ]\* 2.2 Write property tests for CA calculation accuracy
    - **Property 4: CA Percentage Calculation Accuracy**
    - **Property 5: CA Aggregation Mathematical Correctness**
    - **Property 6: CA Contribution Weighting Accuracy**
    - **Validates: Requirements 24.1, 24.2, 24.3**

  - [ ]\* 2.3 Write property tests for exam calculation accuracy
    - **Property 7: Exam Contribution Calculation Accuracy**
    - **Validates: Requirements 25.3**

  - [x] 2.4 Implement grade calculation transparency features
    - Create calculation breakdown generation
    - Implement step-by-step calculation display
    - Add calculation metadata tracking
    - _Requirements: 30.1, 30.5_

  - [ ]\* 2.5 Write property test for calculation transparency
    - **Property 8: Grade Calculation Transparency**
    - **Validates: Requirements 30.1, 30.5**

- [x] 3. API Routes for Teacher Authorization and Data Access
  - [x] 3.1 Create teacher classes API endpoint
    - Implement GET /api/teacher/classes with proper authorization
    - Filter classes based on teacher role (class teacher vs subject teacher)
    - Include class metadata (enrollment count, teacher role, subjects)
    - Add proper error handling and validation
    - _Requirements: 1.1, 1.2, 1.3, 11.1, 11.2_

  - [x] 3.2 Create class streams and subjects API endpoints
    - Implement GET /api/teacher/classes/{classId}/streams
    - Implement GET /api/teacher/classes/{classId}/subjects
    - Add authorization checks for teacher access
    - Include relevant metadata for each stream and subject
    - _Requirements: 2.1, 2.4, 3.1, 3.4_

  - [ ]\* 3.3 Write property tests for teacher authorization
    - **Property 1: Teacher Authorization Filtering**
    - **Property 2: Progressive Filter Data Integrity**
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 3.1**

  - [x] 3.4 Create student marks data API endpoint
    - Implement GET /api/teacher/marks/{classId}/{subjectId}/students
    - Load all CA entries and exam entries for students
    - Generate grade calculations using GradingEngine
    - Include complete student and subject metadata
    - Add proper error handling for missing data
    - _Requirements: 4.1, 4.2, 9.1, 9.2_

  - [ ]\* 3.5 Write property test for data retrieval completeness
    - **Property 10: Data Retrieval Completeness**
    - **Validates: Requirements 9.1**

- [x] 4. CA Entry Management API
  - [x] 4.1 Create CA entry creation and management endpoints
    - Implement POST /api/teacher/marks/ca-entry for creating CA entries
    - Implement PUT /api/teacher/marks/ca-entry/{id} for updates
    - Implement DELETE /api/teacher/marks/ca-entry/{id} for deletion
    - Add validation for CA types, max scores, and raw scores
    - Include competency linking functionality
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 29.1, 29.2_

  - [x] 4.2 Implement CA entry validation logic
    - Validate marks against maximum scores
    - Validate CA entry types and required fields
    - Implement custom max score validation (not limited to 100)
    - Add proper error messages for validation failures
    - _Requirements: 6.1, 6.2, 7.1, 23.4_

  - [ ]\* 4.3 Write property tests for mark validation
    - **Property 3: Mark Validation Consistency**
    - **Validates: Requirements 6.1, 6.2, 7.1**

  - [ ]\* 4.4 Write property test for CA entry flexibility
    - **Property 11: CA Entry Creation Flexibility**
    - **Validates: Requirements 23.1, 23.4**

- [x] 5. Exam Entry Management API
  - [x] 5.1 Create exam entry endpoints
    - Implement POST /api/teacher/marks/exam-entry for creating exam entries
    - Implement PUT /api/teacher/marks/exam-entry/{id} for updates
    - Enforce one exam per student-subject-term constraint
    - Validate exam scores against 100 maximum
    - Add proper error handling for duplicate exams
    - _Requirements: 25.1, 25.2, 25.4, 25.5_

  - [x] 5.2 Implement exam score validation
    - Validate exam scores do not exceed 100
    - Validate exam scores are non-negative
    - Add proper error messages for validation failures
    - _Requirements: 25.2, 25.6_

- [x] 6. Batch Operations and Submission Workflow
  - [x] 6.1 Create batch save API endpoint
    - Implement POST /api/teacher/marks/batch-save
    - Support mixed CA and exam entries in single request
    - Validate all entries before saving any
    - Implement transaction-based saving for data integrity
    - Add submission workflow integration
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]\* 6.2 Write property test for batch validation
    - **Property 9: Batch Validation Consistency**
    - **Validates: Requirements 8.1**

  - [x] 6.3 Implement submission status management
    - Create submission workflow for CA-only, Exam-only, and combined
    - Implement status tracking and display logic
    - Add business rule enforcement for incomplete submissions
    - Handle DoS approval workflow integration
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_

  - [ ]\* 6.4 Write property test for submission status logic
    - **Property 12: Submission Status Logic Consistency**
    - **Validates: Requirements 26.4, 26.5**

- [ ] 7. DoS Approval and Locking System
  - [x] 7.1 Create DoS approval API endpoints
    - Implement POST /api/dos/marks/approve for approving submissions
    - Implement POST /api/dos/marks/reject for rejecting submissions
    - Add approval workflow with proper authorization
    - Implement marks locking after approval
    - Add audit logging for all approval actions
    - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5_

  - [x] 7.2 Implement access control after approval
    - Prevent teacher editing of approved marks
    - Allow DoS override with proper logging
    - Maintain read access for approved marks
    - Add proper error messages for locked marks
    - _Requirements: 28.3, 28.5, 28.6_

  - [ ]\* 7.3 Write property test for approval workflow access control
    - **Property 13: Approval Workflow Access Control**
    - **Validates: Requirements 28.3**

- [-] 8. Progressive Filter UI Components
  - [x] 8.1 Create ProgressiveFilter React component
    - Implement class selection with teacher authorization
    - Create stream selection with proper filtering
    - Create subject selection with teacher permissions
    - Add breadcrumb navigation and filter state management
    - Implement smooth transitions and loading states
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [x] 8.2 Implement filter UI design and interactions
    - Create card-based layout for filter options
    - Add visual indicators for active/inactive states
    - Implement progressive disclosure pattern
    - Add reset filters functionality with confirmation
    - Include metadata display (student counts, subject codes)
    - _Requirements: 17.1, 17.2, 17.3, 17.6, 17.7_

  - [x] 8.3 Add responsive design for mobile devices
    - Implement mobile-first responsive design
    - Create collapsible sections for mobile screens
    - Add touch-friendly interface elements
    - Ensure proper functionality on small screens
    - _Requirements: 20.1, 20.2, 20.3, 20.6_

- [x] 9. Student Marks Table Component
  - [x] 9.1 Create MarksEntryTable React component
    - Implement data table with alternating row colors
    - Add sortable column headers with sort indicators
    - Create inline editing with immediate visual feedback
    - Implement validation styling for invalid entries
    - Add row highlighting on hover and focus
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 9.2 Implement CA entry management in table
    - Add CA entry creation interface within table
    - Support multiple CA entries per student
    - Implement CA type selection and custom naming
    - Add custom max score input with validation
    - Display CA entries with proper grouping
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 29.1_

  - [x] 9.3 Implement exam entry management in table
    - Add exam score input with validation
    - Enforce one exam per student constraint in UI
    - Implement exam score validation (max 100)
    - Add proper error display for exam validation
    - _Requirements: 25.1, 25.2, 25.6_

  - [x] 9.4 Add grade calculation display
    - Show CA contribution (out of 20) clearly
    - Show exam contribution (out of 80) clearly
    - Display final score with proper formatting
    - Add calculation breakdown on demand
    - Use color coding for different mark types
    - _Requirements: 24.4, 25.4, 30.1, 30.5, 18.6_

- [x] 10. Dashboard Integration and Navigation
  - [x] 10.1 Create teacher dashboard route pages
    - Create /dashboard/class-teacher/students page
    - Create /dashboard/teacher/students page
    - Implement proper route authorization
    - Add consistent dashboard navigation integration
    - Include page titles and breadcrumbs
    - _Requirements: 11.1, 11.2, 19.1, 19.2, 19.4_

  - [x] 10.2 Implement dashboard UI consistency
    - Use existing dashboard color scheme and components
    - Follow established dashboard layout patterns
    - Implement consistent loading states and error handling
    - Use existing typography and spacing standards
    - Add proper navigation breadcrumbs
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 19.3, 19.5, 19.6_

- [x] 11. Three-Tier Reporting System
  - [x] 11.1 Create report generation API endpoints
    - Implement GET /api/reports/ca-only for CA-only reports
    - Implement GET /api/reports/exam-only for exam-only reports
    - Implement GET /api/reports/final-term for final term reports
    - Add proper authorization and data filtering
    - Include competency descriptors and teacher remarks
    - _Requirements: 27.1, 27.2, 27.3, 27.6_

  - [x] 11.2 Implement report UI components
    - Create CA-only performance report component
    - Create exam-only performance report component
    - Create final term report card component
    - Add proper report labeling and status indicators
    - Prevent printing official reports without approval
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

- [x] 12. Interactive Feedback and Micro-interactions
  - [x] 12.1 Implement user feedback systems
    - Add immediate visual feedback for all interactions
    - Implement loading spinners and progress indicators
    - Create toast notifications for success/error/warning
    - Add confirmation dialogs for destructive actions
    - Implement smooth page transitions and animations
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [x] 12.2 Add auto-save and data persistence
    - Implement auto-save for draft entries
    - Add unsaved changes warning before navigation
    - Create local storage backup for network issues
    - Implement optimistic updates with rollback
    - Add manual save options in addition to batch save
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [x] 13. Accessibility and Performance Optimization
  - [x] 13.1 Implement accessibility features
    - Ensure WCAG 2.1 AA compliance
    - Add proper ARIA labels and semantic HTML
    - Implement keyboard navigation for all elements
    - Ensure sufficient color contrast ratios
    - Add screen reader support with proper headings
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7_

  - [x] 13.2 Optimize performance and loading
    - Implement lazy loading for large student lists
    - Add optimistic UI updates for immediate feedback
    - Cache frequently accessed data
    - Implement efficient pagination for large datasets
    - Optimize images and assets for fast loading
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.7_

- [x] 14. Checkpoint - Core Functionality Testing
  - Ensure all API endpoints work correctly with proper authorization
  - Verify grading calculations are mathematically accurate
  - Test progressive filter functionality across all teacher types
  - Verify CA and exam entry creation and validation
  - Test batch save operations and submission workflows
  - Ensure all tests pass, ask the user if questions arise.

- [-] 15. Integration Testing and Error Handling
  - [x] 15.1 Implement comprehensive error handling
    - Add client-side validation with immediate feedback
    - Implement server-side validation with proper error responses
    - Create user-friendly error messages for all scenarios
    - Add retry mechanisms for transient network errors
    - Implement graceful degradation for service unavailability
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [ ]\* 15.2 Write integration tests for critical workflows
    - Test complete mark entry workflow from filter to save
    - Test DoS approval workflow end-to-end
    - Test three-tier reporting generation
    - Test authorization across different teacher roles
    - _Requirements: Multiple workflow requirements_

- [x] 16. Competency Integration and Curriculum Compliance
  - [x] 16.1 Implement competency-based assessment features
    - Add competency linking to CA entries
    - Create competency progress tracking
    - Implement competency-based reporting
    - Add competency comments and descriptors
    - Create competency mapping for curriculum alignment
    - _Requirements: 31.1, 31.2, 31.3, 31.4, 31.5, 31.6, 31.7_

  - [x] 16.2 Add inspection and audit readiness features
    - Implement complete audit trails for all activities
    - Create inspection reports for compliance demonstration
    - Add grading methodology compliance verification
    - Generate curriculum alignment verification reports
    - _Requirements: 32.1, 32.2, 32.3, 32.7_

- [-] 17. Final Integration and Polish
  - [x] 17.1 Complete UI/UX polish and refinement
    - Fine-tune animations and transitions
    - Optimize color schemes and visual hierarchy
    - Ensure consistent spacing and typography
    - Add final touches to micro-interactions
    - Verify responsive design across all devices
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [x] 17.2 Performance optimization and final testing
    - Optimize database queries for large datasets
    - Implement caching strategies for frequently accessed data
    - Test system performance with realistic data volumes
    - Verify all accessibility requirements are met
    - Conduct final cross-browser compatibility testing
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7_

- [ ] 18. Final Checkpoint - Complete System Verification
  - Verify all requirements are implemented and tested
  - Test complete workflows from teacher login to report generation
  - Verify mathematical accuracy of all grading calculations
  - Test system with realistic data volumes and user loads
  - Ensure inspection readiness and curriculum compliance
  - Verify accessibility and performance requirements
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation of complex functionality
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples, edge cases, and integration points
- The system implements sophisticated new curriculum grading mathematics
- All database operations must use correct Prisma field names (maxScore not totalMarks)
- UI components must use existing teacher color schemes (teacherColors.info not teacherColors.chart)
- The system supports both class teachers and regular teachers with appropriate authorization
