# Requirements Document: Time-Based Timetable Generation System

## Introduction

This document specifies the requirements for redesigning the DoS timetable system to use time-based periods instead of numbered periods. The system will provide configurable school-wide rules for timetable generation, automatic time slot calculation, teacher unique codes, and an improved user interface that displays actual times rather than abstract period numbers.

## Glossary

- **DoS**: Director of Studies - The school administrator responsible for academic scheduling and curriculum management
- **Time Slot**: A specific time range during the school day (e.g., 7:00-7:45 AM) when a subject can be taught
- **Special Period**: A non-teaching period such as break time or lunch time that appears in the timetable but cannot have subjects assigned
- **Period Duration**: The length of each teaching period in minutes
- **Teacher Code**: A unique 5-character alphanumeric identifier assigned to each teacher for compact display in timetables
- **Subject Code**: A short alphanumeric identifier for a subject (e.g., "BIO" for Biology, "MATH" for Mathematics)
- **DoSCurriculumSubject**: A subject assigned to a specific class with configuration including periodsPerWeek
- **Timetable Configuration**: School-wide rules that define the structure of all timetables (start time, end time, period duration, special periods)
- **Slot Rounding**: The process of rounding up fractional time slots to ensure all available time is utilized

## Requirements

### Requirement 1: School Timetable Configuration Management

**User Story:** As a DoS, I want to configure school-wide timetable rules, so that all timetables follow consistent timing and structure.

#### Acceptance Criteria

1. WHEN a DoS accesses the timetable configuration section, THE System SHALL display a form with fields for school start time, school end time, and period duration in minutes
2. WHEN a DoS saves timetable configuration, THE System SHALL validate that start time is before end time
3. WHEN a DoS saves timetable configuration, THE System SHALL validate that period duration is at least 15 minutes
4. WHEN a DoS enables special periods, THE System SHALL allow adding multiple special periods with name, start time, end time, and applicable days of week
5. WHEN a DoS configures special periods, THE System SHALL validate that special period times are within school hours
6. WHEN a DoS configures special periods, THE System SHALL validate that special periods do not overlap with each other
7. WHEN timetable configuration is saved, THE System SHALL store the configuration in the database associated with the school
8. WHEN timetable configuration exists, THE System SHALL display current configuration values in the form

### Requirement 2: Automatic Time Slot Generation

**User Story:** As a DoS, I want the system to automatically calculate time slots based on my configuration, so that I don't have to manually create each period.

#### Acceptance Criteria

1. WHEN timetable configuration is saved, THE System SHALL calculate total available time by subtracting special period durations from the difference between end time and start time
2. WHEN calculating number of slots, THE System SHALL divide available time by period duration
3. WHEN the division results in a fractional number, THE System SHALL round UP to the nearest integer
4. WHEN generating time slots, THE System SHALL create sequential slots starting from school start time
5. WHEN generating time slots, THE System SHALL insert special periods at their configured times
6. WHEN generating time slots, THE System SHALL ensure the last teaching slot ends at or before school end time
7. WHEN special periods are configured for specific days, THE System SHALL only include those special periods on the applicable days
8. WHEN time slots are generated, THE System SHALL mark special period slots as non-assignable

### Requirement 3: Teacher Unique Code System

**User Story:** As a DoS, I want teachers to have unique identification codes, so that timetables are compact and professional.

#### Acceptance Criteria

1. WHEN a teacher is created in the system, THE System SHALL generate a unique 5-character alphanumeric code
2. WHEN generating teacher codes, THE System SHALL ensure uniqueness within the school
3. WHEN a teacher code is generated, THE System SHALL store it in the Staff model teacherCode field
4. WHEN displaying teacher information in timetables, THE System SHALL show the teacher code instead of full name
5. WHEN a DoS views teacher selection dropdowns, THE System SHALL display both teacher code and full name for clarity
6. WHEN existing teachers do not have codes, THE System SHALL provide a migration function to generate codes for all teachers

### Requirement 4: Time-Based Timetable Display

**User Story:** As a DoS, I want to see actual times instead of "Period 1, Period 2", so that the timetable is immediately understandable.

#### Acceptance Criteria

1. WHEN displaying a timetable grid, THE System SHALL show time ranges in the period column instead of period numbers
2. WHEN formatting time ranges, THE System SHALL use the format "HH:MM-HH:MM AM/PM" or "HH:MM-HH:MM"
3. WHEN displaying special periods, THE System SHALL show the special period name and time range
4. WHEN displaying special period rows, THE System SHALL use a visually distinct style
5. WHEN a user clicks on a special period slot, THE System SHALL not allow subject assignment
6. WHEN displaying subject slots, THE System SHALL show subject code on the top line and teacher code on the bottom line
7. WHEN displaying subject slots, THE System SHALL not show full subject names or teacher names

### Requirement 5: Subject Assignment with Class Filtering

**User Story:** As a DoS, I want only class-assigned subjects to appear in the subject dropdown, so that I don't accidentally assign wrong subjects.

#### Acceptance Criteria

1. WHEN a DoS clicks an empty timetable slot, THE System SHALL display a subject selection dropdown
2. WHEN populating the subject dropdown, THE System SHALL only include subjects assigned to the class via DoSCurriculumSubject
3. WHEN a subject is not assigned to the class, THE System SHALL not allow it to be added to the timetable
4. WHEN displaying subjects in the dropdown, THE System SHALL show subject code, subject name, and periodsPerWeek limit
5. WHEN a subject has reached its periodsPerWeek limit, THE System SHALL disable that subject in the dropdown or show a warning
6. WHEN assigning a subject to a slot, THE System SHALL respect the periodsPerWeek configuration from DoSCurriculumSubject

### Requirement 6: Database Schema Updates for Time-Based Timetables

**User Story:** As a system architect, I want the database schema to support time-based timetables, so that all time information is properly stored and retrieved.

#### Acceptance Criteria

1. WHEN creating the TimetableConfiguration model, THE System SHALL include fields for schoolId, startTime, endTime, periodDurationMinutes, and specialPeriods
2. WHEN storing special periods, THE System SHALL use a JSON array format with name, startTime, endTime, and daysOfWeek fields
3. WHEN updating the Staff model, THE System SHALL add a teacherCode field with String type, nullable, and unique per school constraint
4. WHEN updating the DoSTimetableEntry model, THE System SHALL add startTime and endTime fields with Time type
5. WHEN updating the DoSTimetableEntry model, THE System SHALL add isSpecialPeriod Boolean field and specialPeriodName String nullable field
6. WHEN querying timetable entries, THE System SHALL use time ranges instead of period numbers for filtering and display
7. WHEN migrating existing data, THE System SHALL provide clear messaging about incompatibility with old timetables

### Requirement 7: Configuration UI with Time Slot Preview

**User Story:** As a DoS, I want to see a preview of generated time slots before creating timetables, so that I can verify my configuration is correct.

#### Acceptance Criteria

1. WHEN a DoS accesses the timetable page, THE System SHALL display a collapsible "School Timetable Rules" panel at the top
2. WHEN the rules panel is expanded, THE System SHALL show form fields for all configuration options
3. WHEN configuration values change, THE System SHALL calculate and display a preview of generated time slots
4. WHEN displaying the preview, THE System SHALL show all time ranges including special periods
5. WHEN displaying the preview, THE System SHALL indicate which slots are assignable and which are special periods
6. WHEN a DoS clicks "Save Rules", THE System SHALL validate and save the configuration
7. WHEN configuration is saved successfully, THE System SHALL show a success message and update the preview

### Requirement 8: Timetable Grid with Time-Based Display

**User Story:** As a DoS, I want the timetable grid to use time-based periods, so that I can see when each subject is taught.

#### Acceptance Criteria

1. WHEN displaying a timetable grid, THE System SHALL use time ranges as row labels instead of "Period 1, Period 2"
2. WHEN displaying the grid, THE System SHALL show columns for Monday through Friday
3. WHEN a slot contains a subject, THE System SHALL display subject code on top and teacher code on bottom
4. WHEN a slot is empty and assignable, THE System SHALL allow clicking to add a subject
5. WHEN a slot is a special period, THE System SHALL display the special period name and prevent clicking
6. WHEN hovering over a subject slot, THE System SHALL show full subject name and teacher name in a tooltip
7. WHEN the grid has many periods, THE System SHALL provide vertical scrolling while keeping day headers visible

### Requirement 9: Conflict Detection with Time-Based Validation

**User Story:** As a DoS, I want the system to prevent scheduling conflicts, so that teachers and rooms are not double-booked.

#### Acceptance Criteria

1. WHEN adding a subject to a time slot, THE System SHALL check if the slot is already occupied
2. WHEN adding a subject to a time slot, THE System SHALL check if the teacher is already teaching another class at the same time
3. WHEN adding a subject to a time slot, THE System SHALL check if the specified room is already occupied at the same time
4. WHEN adding a subject to a time slot, THE System SHALL check if the subject has exceeded its periodsPerWeek limit
5. WHEN a conflict is detected, THE System SHALL return a 409 status code with detailed conflict information
6. WHEN displaying conflict messages, THE System SHALL specify the type of conflict and the conflicting entry details
7. WHEN no conflicts exist, THE System SHALL allow the entry to be created

### Requirement 10: Teacher Code Generation and Migration

**User Story:** As a system administrator, I want existing teachers to receive unique codes, so that the new timetable system works with existing data.

#### Acceptance Criteria

1. WHEN the system detects teachers without codes, THE System SHALL provide a migration function
2. WHEN generating codes for existing teachers, THE System SHALL create unique 5-character alphanumeric codes
3. WHEN generating codes, THE System SHALL ensure no duplicates within the school
4. WHEN a code generation fails due to collision, THE System SHALL retry with a different code
5. WHEN all teachers have codes, THE System SHALL log the completion of migration
6. WHEN new teachers are created, THE System SHALL automatically generate codes during creation
7. WHEN displaying teachers in the UI, THE System SHALL show "No Code" or similar indicator if a teacher lacks a code

### Requirement 11: Mobile-Responsive Timetable Interface

**User Story:** As a DoS using a mobile device, I want the timetable interface to be usable on small screens, so that I can manage timetables from anywhere.

#### Acceptance Criteria

1. WHEN viewing the timetable on a mobile device, THE System SHALL display the configuration panel in a collapsed state by default
2. WHEN viewing the timetable grid on mobile, THE System SHALL allow horizontal scrolling for days of the week
3. WHEN viewing the timetable grid on mobile, THE System SHALL maintain readable text sizes for subject and teacher codes
4. WHEN clicking slots on mobile, THE System SHALL show touch-friendly dialogs for subject selection
5. WHEN displaying time ranges on mobile, THE System SHALL use a compact format that fits in narrow columns
6. WHEN special periods are displayed on mobile, THE System SHALL use abbreviated names if necessary
7. WHEN the grid is too wide for mobile, THE System SHALL provide visual indicators for scrollable content

### Requirement 12: Comprehensive Logging for Timetable Operations

**User Story:** As a developer, I want detailed console logging for all timetable operations, so that I can debug issues and monitor system behavior.

#### Acceptance Criteria

1. WHEN calculating time slots, THE System SHALL log "🔧 [Timetable Config] Calculating time slots..."
2. WHEN total available time is calculated, THE System SHALL log "📊 [Timetable Config] Total available time: X minutes"
3. WHEN number of slots is determined, THE System SHALL log "📊 [Timetable Config] Number of slots: X"
4. WHEN time slots are generated, THE System SHALL log "✅ [Timetable Config] Generated X time slots"
5. WHEN generating a teacher code, THE System SHALL log "🔧 [Teacher Code] Generating code for teacher: [name]"
6. WHEN a teacher code is assigned, THE System SHALL log "✅ [Teacher Code] Assigned code: [code]"
7. WHEN adding a timetable entry, THE System SHALL log "🔧 [Timetable Entry] Adding subject [code] at [time]"
8. WHEN an entry is created successfully, THE System SHALL log "✅ [Timetable Entry] Entry created successfully"
9. WHEN a conflict is detected, THE System SHALL log "❌ [Timetable Entry] Conflict detected: [details]"
10. WHEN configuration is saved, THE System SHALL log "✅ [Timetable Config] Configuration saved successfully"

### Requirement 13: Backward Compatibility and Migration Messaging

**User Story:** As a DoS with existing timetables, I want clear information about compatibility, so that I understand what will happen to my old timetables.

#### Acceptance Criteria

1. WHEN the system detects old period-based timetables, THE System SHALL display a migration notice
2. WHEN displaying the migration notice, THE System SHALL explain that old timetables use numbered periods
3. WHEN displaying the migration notice, THE System SHALL explain that new timetables use time-based periods
4. WHEN a DoS attempts to edit an old timetable, THE System SHALL show a warning about incompatibility
5. WHEN a DoS chooses to archive old timetables, THE System SHALL mark them as archived without deletion
6. WHEN creating new timetables, THE System SHALL use the time-based system exclusively
7. WHEN viewing archived timetables, THE System SHALL display them in read-only mode with the old format

### Requirement 14: Validation and Error Handling

**User Story:** As a DoS, I want clear error messages when configuration is invalid, so that I can correct my mistakes easily.

#### Acceptance Criteria

1. WHEN start time is not before end time, THE System SHALL return an error message "Start time must be before end time"
2. WHEN period duration is less than 15 minutes, THE System SHALL return an error message "Period duration must be at least 15 minutes"
3. WHEN special period times are outside school hours, THE System SHALL return an error message "Special period times must be within school hours (start time to end time)"
4. WHEN special periods overlap, THE System SHALL return an error message "Special periods cannot overlap with each other"
5. WHEN a teacher code already exists, THE System SHALL generate a different code automatically
6. WHEN subject assignment fails due to periodsPerWeek limit, THE System SHALL return an error message "Subject [name] has reached its maximum of [X] periods per week"
7. WHEN required fields are missing, THE System SHALL return an error message specifying which fields are required

### Requirement 15: Performance and Scalability

**User Story:** As a system administrator, I want the timetable system to perform well with large schools, so that DoS users have a smooth experience.

#### Acceptance Criteria

1. WHEN generating time slots, THE System SHALL complete calculation in less than 100 milliseconds
2. WHEN loading a timetable grid, THE System SHALL fetch and display data in less than 2 seconds
3. WHEN checking for conflicts, THE System SHALL query the database efficiently using indexed fields
4. WHEN displaying teacher dropdowns, THE System SHALL limit results to teachers assigned to the school
5. WHEN displaying subject dropdowns, THE System SHALL limit results to subjects assigned to the class
6. WHEN the school has more than 100 teachers, THE System SHALL implement pagination or search in teacher selection
7. WHEN the school has more than 50 subjects, THE System SHALL implement search functionality in subject selection
















