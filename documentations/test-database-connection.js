const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  console.log('🔧 Testing MongoDB Atlas connection...');
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  
  console.log('✅ DATABASE_URL is set');
  console.log('🔧 Connection string format:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@'));
  
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  try {
    console.log('🔧 Attempting to connect to MongoDB Atlas...');
    
    // Test connection with timeout
    const connectPromise = prisma.$connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    console.log('✅ Database connection successful');
    
    // Test a simple query
    console.log('🔧 Testing database query...');
    const userCount = await prisma.user.count();
    console.log('✅ Query successful - User count:', userCount);
    
    // Test school query specifically
    console.log('🔧 Testing school lookup...');
    const school = await prisma.school.findUnique({
      where: { code: 'VALLEY' },
      select: { id: true, name: true, code: true, isActive: true }
    });
    console.log('✅ School lookup successful:', school);
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    
    if (error.message.includes('No such host is known')) {
      console.error('\n🔧 DNS Resolution Issue Detected:');
      console.error('- Your system cannot resolve MongoDB Atlas hostnames');
      console.error('- This could be due to network/firewall restrictions');
      console.error('- Try the solutions below');
    }
    
    if (error.message.includes('Server selection timeout')) {
      console.error('\n🔧 Connection Timeout Issue:');
      console.error('- MongoDB Atlas cluster may be paused or unreachable');
      console.error('- Check your IP whitelist in MongoDB Atlas');
      console.error('- Verify cluster is running');
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔧 Database connection closed');
  }
}

testDatabaseConnection();