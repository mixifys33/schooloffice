# DoS Subjects Page - Data Source Breakdown

**Analysis Date**: 2026-02-14

---

## 📊 Real vs Mock Data Analysis

### ✅ REAL DATA (From Database)

These fields are fetched directly from your database:

#### Subject Basic Info

- ✅ **id** - Real (from Subject table)
- ✅ **name** - Real (from Subject table)
- ✅ **code** - Real (from Subject table)
- ✅ **type** - Real (calculated from DoSCurriculumSubject.isCore)
- ✅ **level** - Real (from Subject.educationLevel)
- ✅ **lastUpdated** - Real (from Subject.updatedAt)

#### Class & Teacher Assignments

- ✅ **classesOffered** - Real (count of ClassSubject records)
- ✅ **teachersAssigned** - Real (unique count of StaffSubject records)
- ✅ **weeklyPeriodLoad** - Real (from DoSCurriculumSubject.periodsPerWeek)

#### Curriculum Data

- ✅ **isCore** - Real (from DoSCurriculumSubject)
- ✅ **caWeight** - Real (from DoSCurriculumSubject)
- ✅ **examWeight** - Real (from DoSCurriculumSubject)
- ✅ **minPassMark** - Real (from DoSCurriculumSubject)
- ✅ **periodsPerWeek** - Real (from DoSCurriculumSubject)
- ✅ **dosApproved** - Real (from DoSCurriculumSubject)

#### Alerts (Calculated from Real Data)

- ✅ **alerts[]** - Real (calculated based on actual teacher/class assignments)
  - "No teachers assigned" - triggers when teachersAssigned === 0
  - "Not offered in any class" - triggers when classesOffered === 0

---

### ⚠️ MOCK DATA (Placeholder Values)

These fields currently use hardcoded values and need integration:

#### Performance Metrics

- ❌ **syllabusCoverage**: `75` (hardcoded)
  - **Should be**: Calculated from lesson plans or curriculum tracking
  - **Integration needed**: Lesson plan completion tracking system

- ❌ **expectedCoverage**: `80` (hardcoded)
  - **Should be**: Calculated based on term progress (weeks elapsed / total weeks \* 100)
  - **Integration needed**: Term date calculations

- ❌ **averagePerformance**: `70` (hardcoded)
  - **Should be**: Calculated from actual student marks/assessments
  - **Integration needed**: Query CAEntry and ExamEntry tables for average scores

- ❌ **previousPerformance**: `68` (hardcoded)
  - **Should be**: Calculated from previous term's marks
  - **Integration needed**: Historical marks query with term filtering

#### Status Indicators

- ❌ **riskStatus**: `'GREEN'` (hardcoded)
  - **Should be**: Calculated based on coverage, performance, and teacher stability
  - **Integration needed**: Risk calculation algorithm

- ❌ **performanceTrend**: `'STABLE'` (hardcoded)
  - **Should be**: Calculated from performance change (current vs previous)
  - **Integration needed**: Trend analysis (UP if change > 5%, DOWN if < -5%)

- ❌ **teacherStability**: `'STABLE'` (hardcoded)
  - **Should be**: Based on teacher change history
  - **Integration needed**: Teacher assignment history tracking

#### Assessment Tracking

- ❌ **assessmentCompletion**: `80` (hardcoded)
  - **Should be**: Calculated from actual CA/Exam entries
  - **Integration needed**: Query CAEntry and ExamEntry completion rates

- ❌ **teacherChanges**: `0` (hardcoded)
  - **Should be**: Count of teacher reassignments this term
  - **Integration needed**: StaffSubject history tracking

#### Student Enrollment (Estimated)

- ⚠️ **studentsEnrolled**: Estimated (30 per class)
  - **Currently**: `classesOffered * 30`
  - **Should be**: Actual student count per class
  - **Integration needed**: Query Student table with class assignments

- ⚠️ **totalCapacity**: Estimated (35 per class)
  - **Currently**: `classesOffered * 35`
  - **Should be**: Actual class capacity from Class table
  - **Integration needed**: Class.capacity field

- ⚠️ **popularity**: Calculated from estimates
  - **Currently**: Based on estimated enrollment/capacity
  - **Should be**: Based on actual enrollment/capacity

#### Other

- ❌ **unebRelevance**: `true` (hardcoded for all)
  - **Should be**: Based on subject configuration
  - **Integration needed**: Add field to Subject or DoSCurriculumSubject table

---

## 🔌 Health Indicators API - Data Sources

### ✅ REAL DATA

- ✅ **subjectId** - Real
- ✅ **subjectName** - Real
- ✅ **weeksRemaining** - Real (calculated from term dates)
- ✅ **teacherCount** - Real (from StaffSubject)
- ✅ **classCount** - Real (from ClassSubject)
- ✅ **overloaded** - Real (calculated: teachers < classes)

### ❌ MOCK DATA

- ❌ **actualCoverage**: From DoSCurriculumSubject.syllabusCoverage (may be 0 if not updated)
- ❌ **currentPerformance**: `75` (hardcoded)
- ❌ **previousPerformance**: `70` (hardcoded)
- ❌ **performanceChange**: Calculated from mock values
- ❌ **performanceTrend**: Based on mock performance
- ❌ **teacherChanges**: `0` (hardcoded)
- ❌ **teacherStability**: Based on mock changes
- ❌ **assessmentCompletion**: `80` (hardcoded)
- ❌ **assessmentMissing**: `20` (hardcoded)
- ❌ **assessmentOverdue**: `5` (hardcoded)

---

## 📈 Summary Statistics

### Real Data: ~40%

- Subject info, assignments, curriculum settings
- Class/teacher counts
- Basic alerts

### Mock Data: ~60%

- Performance metrics
- Coverage tracking
- Assessment completion
- Historical trends
- Risk calculations

---

## 🔧 Integration Roadmap

### Phase 1: Performance Metrics (High Priority)

1. **Syllabus Coverage Integration** 
   - Add lesson plan tracking system
   - Calculate actual coverage from completed lessons
   - Update DoSCurriculumSubject.syllabusCoverage field

2. **Student Performance Data**
   - Query CAEntry and ExamEntry tables for average scores
   - Implement historical performance comparison
   - Add performance trend calculations

3. **Assessment Completion Tracking**
   - Calculate completion rates from CA/Exam entries
   - Track missing and overdue assessments
   - Implement assessment scheduling system

### Phase 2: Enhanced Analytics (Medium Priority)

1. **Risk Status Algorithm**
   - Combine coverage, performance, and staffing metrics
   - Implement automated risk level calculations
   - Add configurable thresholds for risk levels

2. **Teacher Stability Tracking**
   - Add StaffSubject history table
   - Track teacher changes per term
   - Calculate stability metrics

3. **Actual Student Enrollment**
   - Query real student counts per class
   - Use actual class capacity data
   - Calculate accurate popularity metrics

### Phase 3: Advanced Features (Low Priority)

1. **UNEB Relevance Configuration**
   - Add UNEB relevance field to subject configuration
   - Implement subject categorization system

2. **Predictive Analytics**
   - Implement performance forecasting
   - Add early warning systems
   - Create intervention recommendations

3. **Real-time Updates**
   - Add WebSocket support for live data updates
   - Implement change notifications
   - Create dashboard refresh mechanisms

### Database Schema Updates Needed

```sql
-- Add syllabus coverage tracking
ALTER TABLE DoSCurriculumSubject ADD COLUMN actualCoverage DECIMAL(5,2) DEFAULT 0;

-- Add UNEB relevance
ALTER TABLE Subject ADD COLUMN unebRelevant BOOLEAN DEFAULT true;

-- Teacher assignment history
CREATE TABLE StaffSubjectHistory (
  id INT PRIMARY KEY AUTO_INCREMENT,
  staffSubjectId INT,
  assignedAt DATETIME,
  removedAt DATETIME,
  reason VARCHAR(255)
);

-- Lesson plan tracking
CREATE TABLE LessonPlan (
  id INT PRIMARY KEY AUTO_INCREMENT,
  subjectId INT,
  classId INT,
  topicId INT,
  plannedDate DATE,
  completedDate DATE,
  status ENUM('PLANNED', 'COMPLETED', 'SKIPPED')
);
```
