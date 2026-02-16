/**
 * Performance Testing Script for Teacher Marks Management System
 * Tests system performance with realistic data volumes
 * Requirements: 22.1, 22.4, 22.5
 */

import { prisma } from '@/lib/db';
import { gradingEngine } from '@/lib/grading-engine';
import { queryMonitor } from '@/lib/query-optimizer';

interface PerformanceTestResult {
  testName: string;
  duration: number;
  recordCount: number;
  averageTimePerRecord: number;
  passed: boolean;
  threshold: number;
}

class PerformanceTestSuite {
  private results: PerformanceTestResult[] = [];

  /**
   * Test 1: Load time for large student list (100+ students)
   * Requirement: Should load within 2 seconds
   */
  async testLargeStudentListLoad(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const threshold = 2000; // 2 seconds

    try {
      // Simulate loading 100 students with marks
      const students = await prisma.student.findMany({
        take: 100,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
        },
      });

      const duration = Date.now() - startTime;
      const averageTimePerRecord = duration / students.length;

      return {
        testName: 'Large Student List Load',
        duration,
        recordCount: students.length,
        averageTimePerRecord,
        passed: duration < threshold,
        threshold,
      };
    } catch (error) {
      return {
        testName: 'Large Student List Load',
        duration: Date.now() - startTime,
        recordCount: 0,
        averageTimePerRecord: 0,
        passed: false,
        threshold,
      };
    }
  }

  /**
   * Test 2: Grade calculation performance for multiple students
   * Requirement: Should calculate grades for 50 students within 500ms
   */
  async testGradeCalculationPerformance(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const threshold = 500; // 500ms
    const studentCount = 50;

    try {
      // Generate mock data for testing
      const mockCAEntries = Array.from({ length: 5 }, (_, i) => ({
        id: `ca-${i}`,
        subjectId: 'test-subject',
        studentId: 'test-student',
        teacherId: 'test-teacher',
        termId: 'test-term',
        name: `Test CA ${i + 1}`,
        type: 'TEST' as const,
        maxScore: 20,
        rawScore: 15 + Math.random() * 5,
        date: new Date(),
        status: 'DRAFT' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const mockExamEntry = {
        id: 'exam-1',
        subjectId: 'test-subject',
        studentId: 'test-student',
        teacherId: 'test-teacher',
        termId: 'test-term',
        examScore: 75,
        maxScore: 100,
        examDate: new Date(),
        status: 'DRAFT' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Calculate grades for multiple students
      for (let i = 0; i < studentCount; i++) {
        gradingEngine.generateGradeCalculation(
          `student-${i}`,
          'test-subject',
          'test-term',
          mockCAEntries,
          mockExamEntry
        );
      }

      const duration = Date.now() - startTime;
      const averageTimePerRecord = duration / studentCount;

      return {
        testName: 'Grade Calculation Performance',
        duration,
        recordCount: studentCount,
        averageTimePerRecord,
        passed: duration < threshold,
        threshold,
      };
    } catch (error) {
      return {
        testName: 'Grade Calculation Performance',
        duration: Date.now() - startTime,
        recordCount: 0,
        averageTimePerRecord: 0,
        passed: false,
        threshold,
      };
    }
  }

  /**
   * Test 3: Batch validation performance
   * Requirement: Should validate 100 entries within 200ms
   */
  async testBatchValidationPerformance(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const threshold = 200; // 200ms
    const entryCount = 100;

    try {
      const caEntries = Array.from({ length: entryCount }, (_, i) => ({
        rawScore: 15 + Math.random() * 5,
        maxScore: 20,
      }));

      const examEntries = Array.from({ length: entryCount }, (_, i) => ({
        examScore: 60 + Math.random() * 40,
      }));

      gradingEngine.batchValidateEntries(caEntries, examEntries);

      const duration = Date.now() - startTime;
      const averageTimePerRecord = duration / (entryCount * 2);

      return {
        testName: 'Batch Validation Performance',
        duration,
        recordCount: entryCount * 2,
        averageTimePerRecord,
        passed: duration < threshold,
        threshold,
      };
    } catch (error) {
      return {
        testName: 'Batch Validation Performance',
        duration: Date.now() - startTime,
        recordCount: 0,
        averageTimePerRecord: 0,
        passed: false,
        threshold,
      };
    }
  }

  /**
   * Test 4: CA aggregation performance with many entries
   * Requirement: Should aggregate 20 CA entries within 50ms
   */
  async testCAggregationPerformance(): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    const threshold = 50; // 50ms
    const caCount = 20;

    try {
      const mockCAEntries = Array.from({ length: caCount }, (_, i) => ({
        id: `ca-${i}`,
        subjectId: 'test-subject',
        studentId: 'test-student',
        teacherId: 'test-teacher',
        termId: 'test-term',
        name: `Test CA ${i + 1}`,
        type: 'TEST' as const,
        maxScore: 20 + Math.random() * 30,
        rawScore: 10 + Math.random() * 20,
        date: new Date(),
        status: 'DRAFT' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      gradingEngine.calculateCAContribution(mockCAEntries);

      const duration = Date.now() - startTime;
      const averageTimePerRecord = duration / caCount;

      return {
        testName: 'CA Aggregation Performance',
        duration,
        recordCount: caCount,
        averageTimePerRecord,
        passed: duration < threshold,
        threshold,
      };
    } catch (error) {
      return {
        testName: 'CA Aggregation Performance',
        duration: Date.now() - startTime,
        recordCount: 0,
        averageTimePerRecord: 0,
        passed: false,
        threshold,
      };
    }
  }

  /**
   * Run all performance tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Performance Test Suite\n');

    this.results.push(await this.testLargeStudentListLoad());
    this.results.push(await this.testGradeCalculationPerformance());
    this.results.push(await this.testBatchValidationPerformance());
    this.results.push(await this.testCAggregationPerformance());

    this.printResults();
  }

  /**
   * Print test results
   */
  private printResults(): void {
    console.log('\n📊 Performance Test Results\n');
    console.log('='.repeat(80));

    let passedCount = 0;
    let failedCount = 0;

    this.results.forEach((result) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m';
      const resetColor = '\x1b[0m';

      console.log(`\n${statusColor}${status}${resetColor} ${result.testName}`);
      console.log(`  Duration: ${result.duration}ms (threshold: ${result.threshold}ms)`);
      console.log(`  Records: ${result.recordCount}`);
      console.log(`  Avg time per record: ${result.averageTimePerRecord.toFixed(2)}ms`);

      if (result.passed) {
        passedCount++;
      } else {
        failedCount++;
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\nTotal: ${this.results.length} tests`);
    console.log(`✅ Passed: ${passedCount}`);
    console.log(`❌ Failed: ${failedCount}`);

    // Print query monitor stats
    console.log('\n📈 Query Performance Statistics\n');
    const queryStats = queryMonitor.getAllStats();
    Object.entries(queryStats).forEach(([queryName, stats]) => {
      if (stats) {
        console.log(`${queryName}:`);
        console.log(`  Count: ${stats.count}`);
        console.log(`  Average: ${stats.average}ms`);
        console.log(`  Min: ${stats.min}ms`);
        console.log(`  Max: ${stats.max}ms`);
      }
    });

    if (failedCount > 0) {
      console.log('\n⚠️  Some performance tests failed. Consider optimization.');
      process.exit(1);
    } else {
      console.log('\n✅ All performance tests passed!');
      process.exit(0);
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  const testSuite = new PerformanceTestSuite();
  testSuite.runAllTests().catch((error) => {
    console.error('❌ Performance test suite failed:', error);
    process.exit(1);
  });
}

export default PerformanceTestSuite;
