/**
 * Verification Script for Performance Optimizations
 * Verifies all optimization implementations are working correctly
 */

import { marksCache, classesCache, subjectsCache, studentsCache, generateCacheKey, invalidateMarksCaches } from '@/lib/performance-cache';
import { queryMonitor, optimizedStudentMarksQuery, calculatePagination, batchQuery } from '@/lib/query-optimizer';

console.log('🔍 Verifying Performance Optimizations\n');

let passedTests = 0;
let failedTests = 0;

// Test 1: Cache functionality
console.log('Test 1: Cache Functionality');
try {
  const testKey = 'test-key';
  const testData = { value: 'test-data' };
  
  // Set cache
  marksCache.set(testKey, testData);
  
  // Get cache
  const cachedData = marksCache.get(testKey);
  
  if (cachedData && cachedData.value === testData.value) {
    console.log('✅ Cache set/get working correctly');
    passedTests++;
  } else {
    console.log('❌ Cache set/get failed');
    failedTests++;
  }
  
  // Test cache expiration
  marksCache.set('expire-test', { value: 'test' }, 100); // 100ms TTL
  setTimeout(() => {
    const expired = marksCache.get('expire-test');
    if (expired === null) {
      console.log('✅ Cache expiration working correctly');
      passedTests++;
    } else {
      console.log('❌ Cache expiration failed');
      failedTests++;
    }
  }, 150);
  
} catch (error) {
  console.log('❌ Cache test failed:', error);
  failedTests++;
}

// Test 2: Cache key generation
console.log('\nTest 2: Cache Key Generation');
try {
  const key1 = generateCacheKey('marks', 'class-1', 'subject-1');
  const key2 = generateCacheKey('marks', 'class-1', 'subject-2');
  
  if (key1 === 'marks:class-1:subject-1' && key2 === 'marks:class-1:subject-2') {
    console.log('✅ Cache key generation working correctly');
    passedTests++;
  } else {
    console.log('❌ Cache key generation failed');
    failedTests++;
  }
} catch (error) {
  console.log('❌ Cache key generation test failed:', error);
  failedTests++;
}

// Test 3: Cache invalidation
console.log('\nTest 3: Cache Invalidation');
try {
  marksCache.set(generateCacheKey('marks', 'class-1', 'subject-1'), { value: 'test1' });
  marksCache.set(generateCacheKey('marks', 'class-1', 'subject-2'), { value: 'test2' });
  marksCache.set(generateCacheKey('marks', 'class-2', 'subject-1'), { value: 'test3' });
  
  // Invalidate class-1 caches
  invalidateMarksCaches('class-1');
  
  const cache1 = marksCache.get(generateCacheKey('marks', 'class-1', 'subject-1'));
  const cache2 = marksCache.get(generateCacheKey('marks', 'class-1', 'subject-2'));
  const cache3 = marksCache.get(generateCacheKey('marks', 'class-2', 'subject-1'));
  
  if (cache1 === null && cache2 === null && cache3 !== null) {
    console.log('✅ Cache invalidation working correctly');
    passedTests++;
  } else {
    console.log('❌ Cache invalidation failed');
    failedTests++;
  }
} catch (error) {
  console.log('❌ Cache invalidation test failed:', error);
  failedTests++;
}

// Test 4: Query monitor
console.log('\nTest 4: Query Performance Monitor');
try {
  const endTimer = queryMonitor.startQuery('test-query');
  
  // Simulate query execution
  setTimeout(() => {
    endTimer();
    
    const stats = queryMonitor.getStats('test-query');
    
    if (stats && stats.count === 1 && stats.average > 0) {
      console.log('✅ Query monitor working correctly');
      console.log(`   Query took ${stats.average}ms`);
      passedTests++;
    } else {
      console.log('❌ Query monitor failed');
      failedTests++;
    }
  }, 10);
} catch (error) {
  console.log('❌ Query monitor test failed:', error);
  failedTests++;
}

// Test 5: Optimized query selects
console.log('\nTest 5: Optimized Query Selects');
try {
  const studentSelect = optimizedStudentMarksQuery.studentSelect;
  const caEntrySelect = optimizedStudentMarksQuery.caEntrySelect;
  const examEntrySelect = optimizedStudentMarksQuery.examEntrySelect;
  
  if (
    studentSelect.id === true &&
    studentSelect.firstName === true &&
    caEntrySelect.id === true &&
    caEntrySelect.rawScore === true &&
    examEntrySelect.id === true &&
    examEntrySelect.examScore === true
  ) {
    console.log('✅ Optimized query selects configured correctly');
    passedTests++;
  } else {
    console.log('❌ Optimized query selects failed');
    failedTests++;
  }
} catch (error) {
  console.log('❌ Optimized query selects test failed:', error);
  failedTests++;
}

// Test 6: Pagination calculation
console.log('\nTest 6: Pagination Calculation');
try {
  const page1 = calculatePagination(1, 50);
  const page2 = calculatePagination(2, 50);
  const page3 = calculatePagination(3, 25);
  
  if (
    page1.skip === 0 && page1.take === 50 &&
    page2.skip === 50 && page2.take === 50 &&
    page3.skip === 50 && page3.take === 25
  ) {
    console.log('✅ Pagination calculation working correctly');
    passedTests++;
  } else {
    console.log('❌ Pagination calculation failed');
    failedTests++;
  }
} catch (error) {
  console.log('❌ Pagination calculation test failed:', error);
  failedTests++;
}

// Test 7: Batch query helper
console.log('\nTest 7: Batch Query Helper');
try {
  const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
  const batchSize = 25;
  
  let batchCount = 0;
  const queryFn = async (batch: string[]) => {
    batchCount++;
    return batch.map(item => ({ id: item, value: 'test' }));
  };
  
  batchQuery(items, batchSize, queryFn).then(results => {
    if (results.length === 100 && batchCount === 4) {
      console.log('✅ Batch query helper working correctly');
      console.log(`   Processed ${results.length} items in ${batchCount} batches`);
      passedTests++;
    } else {
      console.log('❌ Batch query helper failed');
      failedTests++;
    }
  });
} catch (error) {
  console.log('❌ Batch query helper test failed:', error);
  failedTests++;
}

// Test 8: Cache statistics
console.log('\nTest 8: Cache Statistics');
try {
  marksCache.clear();
  marksCache.set('test-1', { value: 'test1' });
  marksCache.set('test-2', { value: 'test2' });
  marksCache.set('test-3', { value: 'test3' });
  
  const stats = marksCache.getStats();
  
  if (stats.size === 3 && stats.maxSize === 50) {
    console.log('✅ Cache statistics working correctly');
    console.log(`   Cache size: ${stats.size}/${stats.maxSize}`);
    passedTests++;
  } else {
    console.log('❌ Cache statistics failed');
    failedTests++;
  }
} catch (error) {
  console.log('❌ Cache statistics test failed:', error);
  failedTests++;
}

// Wait for async tests to complete
setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Verification Results');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Total: ${passedTests + failedTests}`);
  
  if (failedTests === 0) {
    console.log('\n✅ All optimization verifications passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some optimization verifications failed!');
    process.exit(1);
  }
}, 1000);
