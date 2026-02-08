#!/usr/bin/env node

/**
 * Test alternative MongoDB connection methods
 * This tries different connection approaches to bypass network issues
 */

const { PrismaClient } = require('@prisma/client');

// Alternative connection strings to try
const connectionAlternatives = [
  // Original
  process.env.DATABASE_URL,
  
  // With different SSL options
  process.env.DATABASE_URL?.replace('?retryWrites=true&w=majority', '?retryWrites=true&w=majority&ssl=true&authSource=admin'),
  
  // With connection timeout
  process.env.DATABASE_URL?.replace('?retryWrites=true&w=majority', '?retryWrites=true&w=majority&connectTimeoutMS=30000&socketTimeoutMS=30000'),
  
  // With different retry options
  process.env.DATABASE_URL?.replace('?retryWrites=true&w=majority', '?retryWrites=true&w=majority&maxPoolSize=10&serverSelectionTimeoutMS=30000'),
  
  // Minimal options
  process.env.DATABASE_URL?.replace('?retryWrites=true&w=majority', '?ssl=true')
];

async function testConnection(connectionString, index) {
  console.log(`\n🔄 Testing connection method ${index + 1}...`);
  console.log(`Connection: ${connectionString?.replace(/:[^:@]*@/, ':***@')}`);
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: connectionString
      }
    },
    log: ['error']
  });
  
  try {
    // Set a shorter timeout for testing
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout (30s)')), 30000);
    });
    
    const connectPromise = prisma.$connect();
    
    await Promise.race([connectPromise, timeoutPromise]);
    
    console.log('✅ Connection successful!');
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query successful:', result);
    
    await prisma.$disconnect();
    return { success: true, connectionString };
    
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
    
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║            ALTERNATIVE CONNECTION STRING TESTER             ║
╚══════════════════════════════════════════════════════════════╝
  `);
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL environment variable not found');
    process.exit(1);
  }
  
  console.log('Testing different connection approaches...\n');
  
  for (let i = 0; i < connectionAlternatives.length; i++) {
    const connectionString = connectionAlternatives[i];
    
    if (!connectionString) {
      console.log(`⏭️ Skipping connection method ${i + 1} (invalid)`);
      continue;
    }
    
    const result = await testConnection(connectionString, i);
    
    if (result.success) {
      console.log(`\n🎉 SUCCESS! Connection method ${i + 1} works!`);
      console.log(`\n💡 Use this connection string in your .env:`);
      console.log(`DATABASE_URL="${result.connectionString}"`);
      break;
    }
    
    // Wait a bit between attempts
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log(`\n📋 SUMMARY:`);
  console.log(`If none of the connection methods worked, the issue is likely:`);
  console.log(`1. Network connectivity (DNS/Firewall)`);
  console.log(`2. MongoDB Atlas cluster is down`);
  console.log(`3. IP not whitelisted in MongoDB Atlas`);
  console.log(`4. Incorrect credentials`);
  
  console.log(`\n🔧 Try these fixes:`);
  console.log(`1. Run: fix-network-powershell.ps1 as Administrator`);
  console.log(`2. Use mobile hotspot to test`);
  console.log(`3. Check MongoDB Atlas dashboard`);
  console.log(`4. Add 0.0.0.0/0 to IP whitelist temporarily`);
}

if (require.main === module) {
  main().catch(console.error);
}