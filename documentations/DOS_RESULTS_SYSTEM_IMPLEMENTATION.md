# DoS Results Collection and Report Card System

This module implements the complete DoS (Director of Studies) results collection and report card system for the SchoolOffice platform.

## Features Implemented

### 1. Teacher Results Submission
- Teachers can submit CA (Continuous Assessment) and Exam results
- Results are tied to specific classes and subjects
- Submission status tracking (Draft, Submitted)

### 2. DoS Results Inbox
- Centralized view of all pending teacher submissions
- Shows CA and Exam status per subject
- Completeness indicators for each class/subject combination

### 3. DoS Approval System
- DoS can approve individual subject results (CA and/or Exam)
- Subjects can be locked to prevent further changes
- Audit trail of all approval actions

### 4. Report Card Compilation
- Automatic compilation of report cards from approved results
- Calculation of final scores (CA 20% + Exam 80% = 100%)
- Grade assignment based on score ranges
- Overall average calculation

### 5. Report Card States
- Draft: System-generated but not reviewed
- Reviewed: DoS has checked the report
- Approved: Official report card
- Published: Available for distribution

### 6. Secure Report Links
- Random, unpredictable tokens for report access
- Expiration control (default 30 days)
- View counting and access tracking
- Revocation capability

### 7. SMS Distribution
- Multiple SMS modes (Standard, Simple, Minimal, No Link)
- Character-optimized messages (max 306 chars for 2 segments)
- Subject abbreviation system
- Preview functionality
- Bulk distribution capabilities

### 8. DoS Dashboard
- Overall completion statistics
- Pending approval tracking
- Published report counts
- Class completion rates

## Technical Implementation

### Database Schema
- Added `DosApproval` model to track subject approvals
- Extended `SecureLink` model with view tracking
- Leveraged existing DoS models (DoSCurriculumSubject, DoSContinuousAssessment, DoSExamResult, etc.)

### API Routes
- `/api/dos/results/submissions` - Teacher submissions
- `/api/dos/results/approval` - DoS approvals
- `/api/dos/results/report-cards` - Report card operations
- `/api/dos/results/sms` - SMS distribution
- `/api/dos/results/dashboard` - Dashboard stats
- `/api/reports/[token]` - Secure report access

### UI Components
- `DosResultsManager` - Main DoS interface
- `SecureReportViewer` - Public report viewing

### Pages
- `/dos/results` - DoS results management
- `/reports/[token]` - Public report access

## Security Features
- DoS authority required for all approvals
- Secure random tokens for report access
- Expiration control
- Audit logging
- Role-based access control

## SMS Optimization
- Strict character limits (≤306 for 2 segments)
- Subject abbreviation system
- Multiple readability modes
- Professional formatting

## Architecture Principles
- Single source of truth (DoS authority)
- Clear workflow from submission → approval → publication → distribution
- No bypassing of DoS authority
- Secure and controlled access to student data
- Professional and readable communications