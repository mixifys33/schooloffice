# Requirements Document

## Introduction

The Teacher Marks Management System enables both class teachers and regular teachers to efficiently manage student marks through a progressive filtering interface. The system provides comprehensive marks entry capabilities for both Continuous Assessment (CA) and Exam scores, with term-based context and student filtering options. This feature includes complete UI/UX frontend designs and integrates with the existing backend marks system while following established teacher dashboard UI standards.

## Glossary

- **System**: The Teacher Marks Management System
- **Teacher**: A staff member (class teacher or regular teacher) assigned to teach subjects
- **Class_Teacher**: A staff member assigned to manage one or more classes
- **Regular_Teacher**: A staff member assigned to teach specific subjects across multiple classes
- **Progressive_Filter**: A sequential selection process (Class → Stream → Subject → Students)
- **CA_Entry**: Individual continuous assessment activity (assignment, test, project, practical, observation)
- **CA_Type**: Category of continuous assessment (Assignment, Test, Project, Practical Work, Observation)
- **CA_Aggregation**: Process of converting multiple CA entries into a single CA contribution (out of 20)
- **Exam_Marks**: Examination marks awarded at the end of assessment periods (out of 100, contributes 80%)
- **CA_Contribution**: Final CA score after aggregation and weighting (out of 20, contributes 20%)
- **Exam_Contribution**: Final exam score after weighting (out of 80, contributes 80%)
- **Final_Score**: Combined CA and Exam contributions (out of 100)
- **Raw_CA_Score**: Original score for individual CA entry before percentage conversion
- **CA_Percentage**: Individual CA entry converted to percentage (Raw Score ÷ Max Score × 100)
- **Average_CA_Percentage**: Mean of all CA percentages for aggregation
- **DoS_Approval**: Department of Studies approval for marks submission and locking
- **Term_Context**: The current academic term for which marks are being managed
- **Mark_Entry**: The process of inputting or updating student marks
- **Batch_Save**: Saving multiple mark entries simultaneously
- **Student_Filter**: Filtering students based on mark completion status
- **Mark_Validation**: Ensuring entered marks don't exceed maximum allowed scores
- **UI_Component**: Reusable frontend interface elements following design system
- **UX_Pattern**: User experience patterns for intuitive interaction flows

## Requirements

### Requirement 1: Progressive Class Selection for All Teachers

**User Story:** As a teacher (class teacher or regular teacher), I want to select from my assigned classes, so that I can manage marks for the right students.

#### Acceptance Criteria

1. WHEN a teacher accesses the marks management page, THE System SHALL display only classes where the teacher has subject assignments
2. WHEN a class teacher accesses the system, THE System SHALL display all classes assigned to them
3. WHEN a regular teacher accesses the system, THE System SHALL display only classes where they teach subjects
4. WHEN a teacher selects a class, THE System SHALL enable the stream selection interface
5. WHEN no classes are available to a teacher, THE System SHALL display an appropriate message with guidance
6. THE System SHALL display class information including class name, current enrollment count, and teacher's role
7. WHEN a class selection is changed, THE System SHALL reset all subsequent filter selections

### Requirement 2: Stream Selection Within Class

**User Story:** As a class teacher, I want to select a stream within my assigned class, so that I can focus on specific student groups.

#### Acceptance Criteria

1. WHEN a class is selected, THE System SHALL display all streams available within that class
2. WHEN a stream is selected, THE System SHALL enable the subject selection interface
3. WHEN no streams exist for a class, THE System SHALL display all students in the class without stream filtering
4. THE System SHALL display stream information including stream name and student count
5. WHEN a stream selection is changed, THE System SHALL reset subject and student selections

### Requirement 3: Subject Selection for All Teachers

**User Story:** As a teacher, I want to select a subject from my assigned subjects, so that I can enter marks for that specific subject.

#### Acceptance Criteria

1. WHEN a class and stream are selected, THE System SHALL display only subjects assigned to the teacher for that class
2. WHEN a regular teacher accesses the system, THE System SHALL display only subjects they are qualified to teach
3. WHEN a class teacher accesses the system, THE System SHALL display all subjects for their assigned classes
4. WHEN a subject is selected, THE System SHALL load the student list for marks entry
5. THE System SHALL display subject information including subject name and maximum marks for CA and Exam
6. WHEN no subjects are assigned, THE System SHALL display an appropriate message with contact information
7. WHEN a subject selection is changed, THE System SHALL reload the student marks data

### Requirement 4: Student List Display and Management

**User Story:** As a teacher, I want to see all students in the selected class/stream/subject combination, so that I can enter their marks.

#### Acceptance Criteria

1. WHEN all filters are applied, THE System SHALL display a comprehensive list of students with their current marks
2. THE System SHALL display student information including name, admission number, and existing CA and Exam marks
3. WHEN no students match the filter criteria, THE System SHALL display an appropriate empty state message
4. THE System SHALL organize students in a tabular format for efficient marks entry
5. THE System SHALL display the total number of students in the current selection
6. THE System SHALL provide sorting options for student list (by name, admission number, marks status)

### Requirement 5: Student Filtering by Mark Status

**User Story:** As a class teacher, I want to filter students by missing marks (CA or exam), so that I can focus on incomplete entries.

#### Acceptance Criteria

1. THE System SHALL provide filter options for "Students with no CA marks", "Students with no Exam marks", and "All students"
2. WHEN a filter is applied, THE System SHALL update the student list to show only matching students
3. WHEN "Students with no CA marks" is selected, THE System SHALL display only students without CA marks for the selected subject
4. WHEN "Students with no Exam marks" is selected, THE System SHALL display only students without Exam marks for the selected subject
5. THE System SHALL maintain filter state when navigating between different subjects

### Requirement 6: Marks Entry and Validation

**User Story:** As a class teacher, I want to enter both CA and exam marks for students, so that I can complete their assessment records.

#### Acceptance Criteria

1. THE System SHALL provide input fields for both CA marks and Exam marks for each student
2. WHEN marks are entered, THE System SHALL validate that they do not exceed the maximum allowed scores
3. WHEN invalid marks are entered, THE System SHALL display validation errors and prevent submission
4. THE System SHALL allow decimal marks entry where the subject configuration permits
5. THE System SHALL highlight required fields that are empty or invalid

### Requirement 7: Mark Validation Against Maximum Scores

**User Story:** As a class teacher, I want the system to validate mark entries against maximum scores, so that I don't enter invalid data.

#### Acceptance Criteria

1. WHEN a mark is entered, THE System SHALL validate it against the subject's maximum CA or Exam score
2. WHEN a mark exceeds the maximum allowed, THE System SHALL display an error message and highlight the field
3. WHEN a negative mark is entered, THE System SHALL reject the input and display an appropriate error
4. THE System SHALL allow marks of zero as valid entries
5. WHEN validation fails, THE System SHALL prevent the mark from being saved until corrected

### Requirement 8: Batch Marks Saving

**User Story:** As a class teacher, I want to save marks in batches, so that I can efficiently manage large student lists.

#### Acceptance Criteria

1. THE System SHALL provide a "Save All Changes" button to save multiple mark entries simultaneously
2. WHEN batch save is initiated, THE System SHALL validate all entered marks before saving
3. WHEN validation errors exist, THE System SHALL highlight problematic entries and prevent saving
4. WHEN batch save is successful, THE System SHALL display a confirmation message
5. WHEN batch save fails, THE System SHALL display specific error messages for failed entries

### Requirement 9: Existing Marks Display and Updates

**User Story:** As a class teacher, I want to see existing marks, so that I can update them if needed.

#### Acceptance Criteria

1. WHEN the student list loads, THE System SHALL display existing CA and Exam marks for each student
2. THE System SHALL allow modification of existing marks through the same input interface
3. WHEN existing marks are modified, THE System SHALL track changes and highlight modified entries
4. THE System SHALL preserve original marks until changes are explicitly saved
5. THE System SHALL provide visual indicators to distinguish between new entries and updates

### Requirement 10: Term-Based Context Management

**User Story:** As a class teacher, I want marks to be managed within the current term context, so that I work with relevant academic period data.

#### Acceptance Criteria

1. THE System SHALL operate within the current academic term context
2. WHEN marks are saved, THE System SHALL associate them with the current term
3. THE System SHALL display the current term information prominently in the interface
4. WHEN no current term is active, THE System SHALL display an appropriate message and prevent marks entry
5. THE System SHALL filter all marks data by the current term context

### Requirement 11: Teacher Dashboard Access Control

**User Story:** As a teacher (class teacher or regular teacher), I want to access the marks management system from my appropriate dashboard, so that I can manage marks within my authorized scope.

#### Acceptance Criteria

1. THE System SHALL be accessible from `/dashboard/class-teacher/students` for class teachers
2. THE System SHALL be accessible from `/dashboard/teacher/students` for regular teachers
3. WHEN a class teacher accesses the system, THE System SHALL show all classes they manage
4. WHEN a regular teacher accesses the system, THE System SHALL show only classes where they teach subjects
5. THE System SHALL enforce proper authorization based on teacher role and subject assignments
6. THE System SHALL provide role-appropriate navigation and menu items
7. THE System SHALL maintain session state and permissions throughout the user experience

### Requirement 12: Integration with Backend Marks System

**User Story:** As a system administrator, I want the marks management to integrate seamlessly with existing backend systems, so that data consistency is maintained.

#### Acceptance Criteria

1. THE System SHALL use existing Mark, Student, Class, Subject, and ClassSubject database models
2. WHEN marks are saved, THE System SHALL follow existing database schema and relationships
3. THE System SHALL maintain referential integrity with existing academic data
4. THE System SHALL use existing authentication and authorization patterns
5. THE System SHALL follow established API route patterns for data operations
6. THE System SHALL respect existing Prisma schema field names (using `maxScore` not `totalMarks`)
7. THE System SHALL avoid using non-existent fields like `isActive` on models that don't support it

### Requirement 13: User Interface Standards Compliance

**User Story:** As a class teacher, I want the interface to follow existing teacher UI standards, so that I have a consistent user experience.

#### Acceptance Criteria

1. THE System SHALL use existing teacher UI color schemes and component styles
2. THE System SHALL follow established layout patterns from other teacher dashboard features
3. THE System SHALL provide consistent loading states and error handling displays
4. THE System SHALL use existing form components and validation styling
5. THE System SHALL maintain responsive design principles for different screen sizes

### Requirement 14: Error Handling and User Feedback

**User Story:** As a class teacher, I want clear error messages and feedback, so that I can understand and resolve issues quickly.

#### Acceptance Criteria

1. WHEN API errors occur, THE System SHALL display user-friendly error messages
2. WHEN network connectivity issues arise, THE System SHALL provide appropriate retry options
3. THE System SHALL display loading indicators during data operations
4. WHEN operations succeed, THE System SHALL provide clear confirmation feedback
5. THE System SHALL log detailed error information for debugging purposes

### Requirement 15: Data Persistence and Recovery

**User Story:** As a class teacher, I want my work to be preserved during system issues, so that I don't lose entered marks data.

#### Acceptance Criteria

1. THE System SHALL auto-save draft marks entries locally during input
2. WHEN the page is refreshed, THE System SHALL recover unsaved changes where possible
3. WHEN network issues prevent saving, THE System SHALL queue changes for retry
4. THE System SHALL warn users before navigating away with unsaved changes
5. THE System SHALL provide manual save options in addition to batch saving

### Requirement 16: Comprehensive UI/UX Design System

**User Story:** As a teacher, I want a beautifully designed and intuitive interface, so that I can efficiently manage marks with a pleasant user experience.

#### Acceptance Criteria

1. THE System SHALL implement a modern, clean design following Material Design or similar design principles
2. THE System SHALL use consistent color schemes, typography, and spacing throughout the interface
3. THE System SHALL provide smooth animations and transitions for user interactions
4. THE System SHALL implement responsive design that works seamlessly on desktop, tablet, and mobile devices
5. THE System SHALL use intuitive icons and visual indicators for different actions and states
6. THE System SHALL provide clear visual hierarchy with proper contrast ratios for accessibility
7. THE System SHALL implement hover states, focus indicators, and interactive feedback for all clickable elements

### Requirement 17: Progressive Filter Interface Design

**User Story:** As a teacher, I want a visually appealing progressive filter interface, so that I can easily navigate through class, stream, and subject selections.

#### Acceptance Criteria

1. THE System SHALL display filters in a card-based layout with clear visual separation
2. THE System SHALL use breadcrumb navigation to show the current filter path
3. THE System SHALL provide visual indicators for active/inactive filter states
4. THE System SHALL implement smooth transitions when filters are applied or changed
5. THE System SHALL display filter options with relevant metadata (student counts, subject codes)
6. THE System SHALL provide clear "Reset Filters" functionality with confirmation dialogs
7. THE System SHALL use progressive disclosure to show only relevant options at each step

### Requirement 18: Student Marks Table Design

**User Story:** As a teacher, I want a well-designed marks entry table, so that I can efficiently view and edit student marks.

#### Acceptance Criteria

1. THE System SHALL implement a data table with alternating row colors for better readability
2. THE System SHALL provide sortable column headers with clear sort indicators
3. THE System SHALL use inline editing with immediate visual feedback for mark entries
4. THE System SHALL implement validation styling (red borders, error messages) for invalid entries
5. THE System SHALL provide row highlighting on hover and focus states
6. THE System SHALL use color coding to distinguish between CA marks, Exam marks, and calculated totals
7. THE System SHALL implement sticky headers for large student lists
8. THE System SHALL provide bulk selection capabilities with checkboxes

### Requirement 19: Dashboard Integration Design

**User Story:** As a teacher, I want the marks management system to integrate seamlessly with the existing teacher dashboard, so that I have a consistent navigation experience.

#### Acceptance Criteria

1. THE System SHALL be accessible from both `/dashboard/class-teacher/students` and `/dashboard/teacher/students` routes
2. THE System SHALL use the existing dashboard navigation structure and sidebar
3. THE System SHALL follow the established dashboard color scheme and component library
4. THE System SHALL provide consistent header styling with page titles and action buttons
5. THE System SHALL implement the same loading states and error handling patterns as other dashboard pages
6. THE System SHALL use existing dashboard typography and spacing standards
7. THE System SHALL provide navigation breadcrumbs consistent with other dashboard sections

### Requirement 20: Interactive Feedback and Micro-interactions

**User Story:** As a teacher, I want responsive feedback for my actions, so that I know the system is working and understand the results of my interactions.

#### Acceptance Criteria

1. THE System SHALL provide immediate visual feedback for all user interactions (clicks, hovers, focus)
2. THE System SHALL implement loading spinners and progress indicators for data operations
3. THE System SHALL use toast notifications for success, error, and warning messages
4. THE System SHALL provide confirmation dialogs for destructive actions (bulk delete, reset)
5. THE System SHALL implement smooth page transitions and component animations
6. THE System SHALL use skeleton loading states while data is being fetched
7. THE System SHALL provide visual indicators for unsaved changes and auto-save status

### Requirement 20: Mobile-First Responsive Design

**User Story:** As a teacher, I want to access the marks management system on my mobile device, so that I can enter marks from anywhere.

#### Acceptance Criteria

1. THE System SHALL implement mobile-first responsive design principles
2. THE System SHALL provide touch-friendly interface elements with appropriate sizing
3. THE System SHALL adapt the progressive filter interface for mobile screens using collapsible sections
4. THE System SHALL implement swipe gestures for table navigation on mobile devices
5. THE System SHALL provide mobile-optimized forms with appropriate input types and keyboards
6. THE System SHALL ensure all functionality is accessible on screens as small as 320px wide
7. THE System SHALL implement pull-to-refresh functionality for mobile data updates

### Requirement 21: Accessibility and Inclusive Design

**User Story:** As a teacher with accessibility needs, I want the system to be fully accessible, so that I can use it regardless of my abilities.

#### Acceptance Criteria

1. THE System SHALL meet WCAG 2.1 AA accessibility standards
2. THE System SHALL provide proper ARIA labels and semantic HTML structure
3. THE System SHALL ensure all interactive elements are keyboard navigable
4. THE System SHALL provide sufficient color contrast ratios for all text and UI elements
5. THE System SHALL support screen readers with proper heading structure and alt text
6. THE System SHALL provide focus indicators that are clearly visible
7. THE System SHALL allow users to navigate the entire interface using only keyboard input

### Requirement 22: Performance and Loading Experience

**User Story:** As a teacher, I want the system to load quickly and perform smoothly, so that I can work efficiently without delays.

#### Acceptance Criteria

1. THE System SHALL load the initial page within 2 seconds on standard internet connections
2. THE System SHALL implement lazy loading for large student lists and data tables
3. THE System SHALL provide optimistic UI updates for immediate user feedback
4. THE System SHALL cache frequently accessed data to reduce server requests
5. THE System SHALL implement efficient pagination for large datasets
6. THE System SHALL provide offline capability for viewing previously loaded data
7. THE System SHALL optimize images and assets for fast loading across all devices

### Requirement 23: Multiple CA Entry Management (New Curriculum)

**User Story:** As a teacher, I want to create and manage multiple CA entries for each subject, so that I can properly assess students according to the new curriculum requirements.

#### Acceptance Criteria

1. THE System SHALL allow teachers to create unlimited CA entries per subject per term
2. WHEN creating a CA entry, THE System SHALL require CA type selection (Assignment, Test, Project, Practical Work, Observation)
3. WHEN creating a CA entry, THE System SHALL allow custom naming (e.g., "Assignment 1 - Algebra")
4. WHEN creating a CA entry, THE System SHALL allow custom maximum scores (not limited to 100)
5. THE System SHALL store each CA entry with its type, date, max score, and linked competency
6. THE System SHALL allow teachers to edit CA entries until they are submitted
7. THE System SHALL display all CA entries for a subject in chronological order

### Requirement 24: CA Aggregation and Weighting Logic

**User Story:** As a teacher, I want the system to properly aggregate multiple CA scores into a single CA contribution, so that grading follows the new curriculum mathematics.

#### Acceptance Criteria

1. WHEN calculating CA contribution, THE System SHALL convert each raw CA score to percentage (Raw Score ÷ Max Score × 100)
2. WHEN multiple CA entries exist, THE System SHALL calculate the average of all CA percentages
3. WHEN calculating final CA contribution, THE System SHALL apply the formula: Average CA Percentage × 20
4. THE System SHALL display CA contribution as "X out of 20" format
5. THE System SHALL never merge CA and Exam scores prematurely
6. THE System SHALL maintain separation between raw CA entries, CA aggregation, and final weighting
7. THE System SHALL recalculate CA contribution automatically when new CA entries are added

### Requirement 25: Exam Score Management and Weighting

**User Story:** As a teacher, I want to enter exam scores that are properly weighted according to curriculum requirements, so that final grades are mathematically accurate.

#### Acceptance Criteria

1. THE System SHALL allow one exam entry per subject per term
2. WHEN entering exam scores, THE System SHALL enforce maximum score of 100
3. WHEN calculating exam contribution, THE System SHALL apply the formula: (Exam Score ÷ 100) × 80
4. THE System SHALL display exam contribution as "X out of 80" format
5. THE System SHALL lock exam scores after DoS approval
6. THE System SHALL validate that exam scores do not exceed 100
7. THE System SHALL automatically convert exam scores to weighted contributions

### Requirement 26: Flexible Submission Workflows

**User Story:** As a teacher, I want to submit CA-only, Exam-only, or combined marks based on my teaching progress, so that I can report student progress at any stage.

#### Acceptance Criteria

1. THE System SHALL allow CA-only submission for mid-term monitoring and parent meetings
2. THE System SHALL allow Exam-only submission for exceptional cases with DoS override
3. THE System SHALL allow combined CA + Exam submission for final term reporting
4. WHEN CA-only is submitted, THE System SHALL clearly indicate "Exam not yet conducted"
5. WHEN Exam-only is submitted, THE System SHALL block final total calculation until CA exists
6. THE System SHALL never generate fake totals or guess missing components
7. THE System SHALL maintain clear status indicators for each submission type

### Requirement 27: Three-Tier Reporting System

**User Story:** As a teacher and administrator, I want three distinct report types, so that I can provide appropriate information for different purposes without misleading data.

#### Acceptance Criteria

1. THE System SHALL generate CA-Only Performance Reports showing all CA activities, scores, averages, and competency comments
2. THE System SHALL generate Exam-Only Performance Reports showing exam scores with "CA pending" status notes
3. THE System SHALL generate Final Term Report Cards showing CA contribution (20), Exam contribution (80), and final score (100)
4. THE System SHALL prevent printing official report cards until both CA and Exam are approved
5. THE System SHALL clearly label each report type to prevent confusion
6. THE System SHALL include competency descriptors and teacher remarks in appropriate reports
7. THE System SHALL show DoS approval status on all official reports

### Requirement 28: Submission and Locking Controls

**User Story:** As a DoS, I want to approve and lock marks submissions, so that academic integrity is maintained and changes are properly tracked.

#### Acceptance Criteria

1. THE System SHALL allow teachers to add, edit, and submit multiple CA entries before approval
2. THE System SHALL allow DoS to approve or reject CA and Exam submissions
3. WHEN marks are approved by DoS, THE System SHALL lock them from teacher editing
4. THE System SHALL log all approval actions with timestamps and user information
5. THE System SHALL allow DoS to override locks with proper logging
6. THE System SHALL prevent official report generation without DoS approval
7. THE System SHALL maintain audit trail of all mark changes and approvals

### Requirement 29: CA Entry Type Management

**User Story:** As a teacher, I want to categorize my CA entries by type, so that I can track different forms of assessment and meet curriculum requirements.

#### Acceptance Criteria

1. THE System SHALL provide predefined CA types: Assignment, Test, Project, Practical Work, Observation
2. THE System SHALL allow custom CA entry names within each type
3. THE System SHALL display CA entries grouped by type in the interface
4. THE System SHALL track competency linkages for each CA entry
5. THE System SHALL allow filtering and sorting of CA entries by type
6. THE System SHALL validate that each CA entry has a designated type
7. THE System SHALL support future addition of new CA types without system changes

### Requirement 30: Mathematical Accuracy and Transparency

**User Story:** As a teacher and administrator, I want all grade calculations to be mathematically accurate and transparent, so that the grading system is defensible and inspection-proof.

#### Acceptance Criteria

1. THE System SHALL display all calculation steps clearly (raw scores → percentages → contributions → final)
2. THE System SHALL never round intermediate calculations until final display
3. THE System SHALL show the exact formula used for each calculation step
4. THE System SHALL maintain precision to at least 2 decimal places in calculations
5. THE System SHALL provide calculation breakdowns on demand for any student grade
6. THE System SHALL validate all mathematical operations for accuracy
7. THE System SHALL ensure that CA + Exam contributions always equal the final score

### Requirement 31: Competency-Based Assessment Integration

**User Story:** As a teacher, I want to link CA entries to specific competencies, so that assessment aligns with the competency-based curriculum framework.

#### Acceptance Criteria

1. THE System SHALL allow linking each CA entry to specific curriculum competencies
2. THE System SHALL display competency progress based on linked CA entries
3. THE System SHALL generate competency-based reports showing mastery levels
4. THE System SHALL allow competency comments for each CA entry
5. THE System SHALL aggregate competency performance across multiple CA entries
6. THE System SHALL support competency descriptors in final reports
7. THE System SHALL maintain competency mapping for curriculum alignment

### Requirement 32: Inspection and Audit Readiness

**User Story:** As a school administrator, I want the grading system to be inspection-ready, so that we can demonstrate compliance with curriculum requirements during official visits.

#### Acceptance Criteria

1. THE System SHALL maintain complete audit trails for all grading activities
2. THE System SHALL generate inspection reports showing grading methodology compliance
3. THE System SHALL provide evidence of proper CA aggregation and weighting
4. THE System SHALL demonstrate separation of CA entries, aggregation, and final weighting
5. THE System SHALL show DoS approval workflows and locking mechanisms
6. THE System SHALL provide competency-based assessment evidence
7. THE System SHALL generate compliance reports for curriculum alignment verification
