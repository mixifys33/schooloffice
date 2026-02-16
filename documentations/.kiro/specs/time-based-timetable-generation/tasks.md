# Time-Based Timetable System - Implementation Tasks

**Spec**: time-based-timetable-generation  
**Status**: In Progress  
**Created**: 2026-02-13  
**Started**: 2026-02-13

---

## Task Breakdown

### Phase 1: Database Schema & Migrations (Requirements 6, 10)

#### Task 1.1: Update Prisma Schema

- [ ] Add TimetableConfiguration model
- [ ] Add teacherCode field to Staff model
- [ ] Add startTime, endTime, isSpecialPeriod, specialPeriodName to DoSTimetableEntry
- [ ] Add indexes for performance
- [ ] Run `npx prisma db push`

**Files**: `prisma/schema.prisma`

#### Task 1.2: Create Teacher Code Migration Script

- [ ] Create script to generate codes for existing teachers
- [ ] Test with sample data
- [ ] Document usage

**Files**: `scripts/migrate-teacher-codes.ts`

---

### Phase 2: Configuration Management (Requirements 1, 2, 7)

#### Task 2.1: Configuration API

- [ ] `GET /api/dos/timetable/config` - Fetch configuration
- [ ] `POST /api/dos/timetable/config` - Save configuration
- [ ] `POST /api/dos/timetable/config/generate-slots` - Generate time slots
- [ ] Add validation logic
- [ ] Add comprehensive logging

**Files**: `src/app/api/dos/timetable/config/route.ts`, `src/app/api/dos/timetable/config/generate-slots/route.ts`

#### Task 2.2: Time Slot Calculation Service

- [ ] Create time slot calculator
- [ ] Add parseTime, formatTime helpers
- [ ] Add special period handling
- [ ] Add fractional period rounding
- [ ] Unit tests

**Files**: `src/services/timetable-time-slot.service.ts`

#### Task 2.3: Configuration UI Component

- [ ] Create collapsible configuration panel
- [ ] Add time pickers for start/end times
- [ ] Add period duration input
- [ ] Add special periods management
- [ ] Add time slots preview
- [ ] Mobile-responsive design

**Files**: `src/components/dos/timetable-configuration-panel.tsx`

---

### Phase 3: Teacher Code System (Requirements 3, 10)

#### Task 3.1: Teacher Code API

- [ ] `POST /api/dos/teachers/generate-codes` - Bulk generation
- [ ] `POST /api/dos/teachers/[id]/generate-code` - Single generation
- [ ] Add uniqueness validation
- [ ] Add logging

**Files**: `src/app/api/dos/teachers/generate-codes/route.ts`

#### Task 3.2: Teacher Code Generation Service

- [ ] Create code generation algorithm
- [ ] Add initials extraction logic
- [ ] Add collision handling
- [ ] Add fallback random generation
- [ ] Unit tests

**Files**: `src/services/teacher-code-generator.service.ts`

#### Task 3.3: Update Teacher UI

- [ ] Show teacher codes in dropdowns
- [ ] Add "Generate Code" button for teachers without codes
- [ ] Update teacher display throughout app

**Files**: `src/components/dos/teacher-selector.tsx`

---

### Phase 4: Time-Based Display (Requirements 4, 8, 11)

#### Task 4.1: Update Timetable Grid Component

- [ ] Replace period numbers with time ranges
- [ ] Add special period row styling
- [ ] Show subject code + teacher code format
- [ ] Add hover tooltips with full names
- [ ] Sticky header for scrolling
- [ ] Mobile-responsive grid

**Files**: `src/app/(portals)/dos/timetable/page.tsx`

#### Task 4.2: Time Formatting Utilities

- [ ] Create formatTimeRange function
- [ ] Add 12-hour/24-hour format support
- [ ] Add compact mobile format
- [ ] Unit tests

**Files**: `src/lib/time-utils.ts`

---

### Phase 5: Enhanced Subject Assignment (Requirement 5)

#### Task 5.1: Update Helpers API

- [ ] Filter subjects by DoSCurriculumSubject assignments
- [ ] Include periodsPerWeek in response
- [ ] Add subject usage count

**Files**: `src/app/api/dos/timetable/helpers/route.ts`

#### Task 5.2: Enhanced Subject Dropdown

- [ ] Show subject code, name, and periodsPerWeek
- [ ] Disable subjects at limit
- [ ] Show usage indicator (e.g., "3/5 periods used")
- [ ] Add visual warnings

**Files**: `src/components/dos/subject-selector-enhanced.tsx`

#### Task 5.3: Update Entry Creation Logic

- [ ] Validate subject is assigned to class
- [ ] Check periodsPerWeek limit
- [ ] Return clear error messages

**Files**: `src/app/api/dos/timetable/[id]/entries/route.ts`

---

### Phase 6: Validation & Logging (Requirements 9, 12, 14)

#### Task 6.1: Enhanced Conflict Detection

- [ ] Add time-based slot occupancy check
- [ ] Add time-based teacher double-booking check
- [ ] Add time-based room double-booking check
- [ ] Add periodsPerWeek limit check
- [ ] Return detailed conflict information

**Files**: `src/services/timetable-conflict-detector.service.ts`

#### Task 6.2: Comprehensive Logging

- [ ] Add logging to all timetable operations
- [ ] Use emoji indicators (🔧, ✅, ❌, 📊)
- [ ] Log calculation steps
- [ ] Log validation results
- [ ] Log conflict details

**Files**: All API routes and services

#### Task 6.3: Validation Service

- [ ] Create configuration validator
- [ ] Create entry validator
- [ ] Add clear error messages
- [ ] Unit tests

**Files**: `src/services/timetable-validator.service.ts`

---

### Phase 7: Migration & Compatibility (Requirement 13)

#### Task 7.1: Migration Notice Component

- [ ] Detect old period-based timetables
- [ ] Display migration notice
- [ ] Explain differences
- [ ] Add "Archive Old Timetables" button

**Files**: `src/components/dos/timetable-migration-notice.tsx`

#### Task 7.2: Archive System

- [ ] Add isArchived field to DoSTimetable
- [ ] Create archive endpoint
- [ ] Show archived timetables in read-only mode
- [ ] Filter archived from main list

**Files**: `src/app/api/dos/timetable/[id]/archive/route.ts`

#### Task 7.3: Backward Compatibility

- [ ] Support both period and time-based entries
- [ ] Display old timetables correctly
- [ ] Prevent editing old timetables

**Files**: `src/app/(portals)/dos/timetable/page.tsx`

---

### Phase 8: Performance Optimization (Requirement 15)

#### Task 8.1: Database Optimization

- [ ] Add indexes to schema
- [ ] Optimize queries with select
- [ ] Add query result caching
- [ ] Benchmark query performance

**Files**: `prisma/schema.prisma`, API routes

#### Task 8.2: Pagination & Search

- [ ] Add pagination to teacher dropdown (>100 teachers)
- [ ] Add search to teacher dropdown
- [ ] Add search to subject dropdown (>50 subjects)
- [ ] Debounce search inputs

**Files**: `src/components/dos/teacher-selector.tsx`, `src/components/dos/subject-selector-enhanced.tsx`

#### Task 8.3: Frontend Optimization

- [ ] Use React.memo for grid cells
- [ ] Lazy load grid rows
- [ ] Debounce configuration preview
- [ ] Optimize re-renders

**Files**: `src/app/(portals)/dos/timetable/page.tsx`

---

### Phase 9: Testing & Documentation

#### Task 9.1: Unit Tests

- [ ] Time slot calculation tests
- [ ] Teacher code generation tests
- [ ] Validation tests
- [ ] Conflict detection tests

**Files**: `tests/unit/timetable-time-slot.test.ts`, etc.

#### Task 9.2: Integration Tests

- [ ] Configuration save/retrieve
- [ ] Entry creation with conflicts
- [ ] Teacher code migration

**Files**: `tests/integration/timetable-config.test.ts`, etc.

#### Task 9.3: Property-Based Tests

- [ ] Time slot generation properties
- [ ] Teacher code uniqueness properties
- [ ] Special period non-overlap properties

**Files**: `tests/properties/timetable-time-based.property.ts`

#### Task 9.4: Documentation

- [ ] Update user guide
- [ ] Create migration guide
- [ ] Document API endpoints
- [ ] Add code comments

**Files**: `docs/timetable-time-based-guide.md`

---

## Implementation Order

1. **Phase 1** (Database) - Foundation
2. **Phase 2** (Configuration) - Core functionality
3. **Phase 3** (Teacher Codes) - Parallel with Phase 2
4. **Phase 4** (Display) - UI updates
5. **Phase 5** (Subject Assignment) - Enhanced features
6. **Phase 6** (Validation) - Quality assurance
7. **Phase 7** (Migration) - Compatibility
8. **Phase 8** (Performance) - Optimization
9. **Phase 9** (Testing) - Final validation

---

## Estimated Timeline

- **Phase 1**: 2 hours
- **Phase 2**: 4 hours
- **Phase 3**: 3 hours
- **Phase 4**: 4 hours
- **Phase 5**: 3 hours
- **Phase 6**: 3 hours
- **Phase 7**: 2 hours
- **Phase 8**: 3 hours
- **Phase 9**: 4 hours

**Total**: ~28 hours of development

---

## Success Criteria

All 15 requirements must be met:

- ✅ Configuration management working
- ✅ Time slot calculation accurate
- ✅ Teacher codes generated and displayed
- ✅ Time-based grid display
- ✅ Class-filtered subject assignment
- ✅ Database schema updated
- ✅ Validation comprehensive
- ✅ Logging detailed
- ✅ Migration path clear
- ✅ Performance optimized
- ✅ Mobile-responsive
- ✅ Backward compatible
- ✅ Error handling robust
- ✅ Tests passing
- ✅ Documentation complete

---

**Status**: Ready to Begin Implementation
**Next Step**: Start with Phase 1 - Database Schema Updates
