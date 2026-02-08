#!/usr/bin/env node

/**
 * Test MongoDB connection with manual DNS resolution
 * This bypasses DNS issues by using direct IP resolution
 */

const { PrismaClient } = require('@prisma/client');
const dns = require('dns').promises;

async function resolveMongoDBCluster() {
  console.log('🔍 Attempting to resolve MongoDB cluster IP...');
  
  // Try to resolve the MongoDB cluster using different methods
  const hostname = 'schooloffice.jshbhxm.mongodb.net';
  
  try {
    // Method 1: Try with Google DNS
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    const addresses = await dns.resolve4(hostname);
    console.log('✅ Resolved with Google DNS:', addresses);
    return addresses[0];
  } catch (error1) {
    console.log('❌ Google DNS failed:', error1.message);
    
    try {
      // Method 2: Try with Cloudflare DNS
      dns.setServers(['1.1.1.1', '1.0.0.1']);
      const addresses = await dns.resolve4(hostname);
      console.log('✅ Resolved with Cloudflare DNS:', addresses);
      return addresses[0];
    } catch (error2) {
      console.log('❌ Cloudflare DNS failed:', error2.message);
      
      try {
        // Method 3: Try with OpenDNS
        dns.setServers(['208.67.222.222', '208.67.220.220']);
        const addresses = await dns.resolve4(hostname);
        console.log('✅ Resolved with OpenDNS:', addresses);
        return addresses[0];
      } catch (error3) {
        console.log('❌ OpenDNS failed:', error3.message);
        throw new Error('All DNS resolution methods failed');
      }
    }
  }
}

async function testConnectionWithCustomDNS() {
  console.log('🚀 Testing MongoDB connection with custom DNS resolution...\n');
  
  try {
    // First, try to resolve the cluster
    const clusterIP = await resolveMongoDBCluster();
    console.log(`📍 Using cluster IP: ${clusterIP}\n`);
    
    // Create modified connection string with IP
    const originalUrl = process.env.DATABASE_URL;
    const modifiedUrl = originalUrl.replace(
      'schooloffice.jshbhxm.mongodb.net',
      clusterIP
    );
    
    console.log('🔗 Testing with IP-based connection...');
    
    // Test with Prisma
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: modifiedUrl
        }
      },
      log: ['error', 'warn']
    });
    
    await prisma.$connect();
    console.log('✅ Prisma connection successful with IP!');
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query successful:', result);
    
    await prisma.$disconnect();
    
    console.log('\n🎉 SUCCESS! Database connection is working with IP resolution.');
    console.log('\n💡 SOLUTION: Your DNS is the issue. Use the network fixes provided.');
    
  } catch (error) {
    console.log('\n❌ Connection failed even with IP resolution:', error.message);
    console.log('\n🔍 This suggests the issue is not just DNS, but also network connectivity.');
    console.log('Try the following:');
    console.log('1. Disable Windows Firewall temporarily');
    console.log('2. Try mobile hotspot');
    console.log('3. Check MongoDB Atlas IP whitelist');
    console.log('4. Contact your network administrator');
  }
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              MONGODB CONNECTION TEST WITH DNS FIX           ║
╚══════════════════════════════════════════════════════════════╝
  `);
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL environment variable not found');
    process.exit(1);
  }
  
  await testConnectionWithCustomDNS();
}

if (require.main === module) {
  main().catch(console.error);
}