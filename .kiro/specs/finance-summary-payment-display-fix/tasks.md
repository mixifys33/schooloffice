# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Missing schoolId Filter in Payments Query
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to scenarios where payments exist in the database but finance summary returns zero
  - Test that when payments exist for students in a school, the finance summary API returns totalCollected = 0 and collectionRate = 0%
  - Verify the payments query is missing the schoolId filter (inspect the database query or mock calls)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Student has payment of 5000 in database, but finance summary shows totalCollected = 0")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Payment Query Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy functionality
  - Write property-based tests capturing observed behavior patterns:
    - Test that students are correctly filtered by schoolId and status
    - Test that fee structures are correctly looked up by classId and termId
    - Test that unpaid students list is sorted by balance (highest first) and limited to 50
    - Test that zero values are returned gracefully when no payments exist
    - Test that empty data structure with zeros is returned when current term cannot be determined
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for missing schoolId filter in payments query
  - [x] 3.1 Implement the fix
    - Locate the finance summary API endpoint that queries student payments
    - Add schoolId filter to the nested payments query (likely in a Prisma include or where clause)
    - Ensure the payments query filters by the same schoolId used for the student query
    - Verify the query structure includes: `payments: { where: { schoolId: schoolId } }`
    - _Bug_Condition: isBugCondition(query) where query.payments.where is missing schoolId filter_
    - _Expected_Behavior: expectedBehavior(result) where result.totalCollected reflects actual payments and collectionRate is calculated correctly_
    - _Preservation: Student filtering by schoolId/status, fee structure lookup, unpaid students sorting/limiting, graceful zero handling, empty data structure for missing term_
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Correct Payment Data Retrieval
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Payment Query Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
