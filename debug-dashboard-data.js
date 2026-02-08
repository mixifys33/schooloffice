/**
 * Debug script to check dashboard data structure
 */

// Mock data structure to test
const mockClassSnapshot = {
  classId: 'test-id',
  className: 'Form 1A',
  totalStudents: 25,
  attendanceToday: { present: 20, absent: 3, late: 2 },
  feeDefaultersCount: 5,
  disciplineAlertsCount: 2,
  streams: [
    { id: 'stream1', name: 'A', studentCount: 15 },
    { id: 'stream2', name: 'B', studentCount: 10 }
  ]
}

console.log('Testing dashboard data structure:')
console.log('className:', typeof mockClassSnapshot.className, mockClassSnapshot.className)
console.log('totalStudents:', typeof mockClassSnapshot.totalStudents, mockClassSnapshot.totalStudents)
console.log('streams:', Array.isArray(mockClassSnapshot.streams), mockClassSnapshot.streams)

// Test stream rendering
if (mockClassSnapshot.streams && mockClassSnapshot.streams.length > 0) {
  console.log('Stream names:')
  mockClassSnapshot.streams.forEach(stream => {
    console.log('  -', typeof stream.name, stream.name, 'students:', typeof stream.studentCount, stream.studentCount)
  })
}

// Test potential object rendering issues
console.log('\nTesting potential issues:')
console.log('Rendering className directly:', mockClassSnapshot.className)
console.log('Rendering stream object directly would cause error:', mockClassSnapshot.streams[0])
console.log('Correct way - stream name:', mockClassSnapshot.streams[0].name)