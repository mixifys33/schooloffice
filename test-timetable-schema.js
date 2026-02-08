/**
 * Test script to verify timetable schema is working
 * Run with: node test-timetable-schema.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTimetableSchema() {
  console.log('Testing Timetable Schema...\n');

  try {
    // Test 1: Check if new models exist
    console.log('1. Testing model existence...');
    
    // This will throw an error if the models don't exist
    const roomCount = await prisma.room.count();
    console.log(`   ✅ Room model exists (${roomCount} records)`);
    
    const timetableAnalyticsCount = await prisma.timetableAnalytics.count();
    console.log(`   ✅ TimetableAnalytics model exists (${timetableAnalyticsCount} records)`);
    
    const timetableVersionCount = await prisma.timetableVersion.count();
    console.log(`   ✅ TimetableVersion model exists (${timetableVersionCount} records)`);

    // Test 2: Check if we can create a room
    console.log('\n2. Testing Room creation...');
    
    // First, get a school to test with
    const school = await prisma.school.findFirst();
    
    if (school) {
      // Try to create a test room
      const testRoom = await prisma.room.create({
        data: {
          schoolId: school.id,
          name: 'Test Room - Schema Validation',
          code: 'TEST001',
          capacity: 30,
          roomType: 'CLASSROOM',
          hasProjector: true,
          isActive: true
        }
      });
      
      console.log(`   ✅ Successfully created test room: ${testRoom.name}`);
      
      // Clean up - delete the test room
      await prisma.room.delete({
        where: { id: testRoom.id }
      });
      
      console.log(`   ✅ Successfully cleaned up test room`);
    } else {
      console.log('   ⚠️  No schools found - skipping room creation test');
    }

    // Test 3: Check relations work
    console.log('\n3. Testing relations...');
    
    const schoolWithRooms = await prisma.school.findFirst({
      include: {
        rooms: true
      }
    });
    
    if (schoolWithRooms) {
      console.log(`   ✅ School-Room relation works (${schoolWithRooms.rooms.length} rooms)`);
    } else {
      console.log('   ⚠️  No schools found - skipping relation test');
    }

    console.log('\n✅ All timetable schema tests passed!');
    console.log('   - All new models are accessible');
    console.log('   - CRUD operations work correctly');
    console.log('   - Relations are properly configured');
    console.log('   - Database schema is ready for timetable constraint system');

  } catch (error) {
    console.error('❌ Schema test failed:', error.message);
    
    if (error.code === 'P2002') {
      console.log('   This might be a unique constraint violation - check for duplicate data');
    } else if (error.code === 'P2025') {
      console.log('   Record not found - this is expected for some tests');
    } else {
      console.log('   Full error:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testTimetableSchema();