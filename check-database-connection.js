#!/usr/bin/env node

/**
 * Database Connection Checker for SchoolOffice.academy
 * This script checks database connectivity and Prisma configuration
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'bold');
  console.log('='.repeat(60));
}

async function checkEnvironmentFile() {
  logSection('🔍 Checking Environment Configuration');
  
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    log('❌ .env file not found', 'red');
    return false;
  }
  
  log('✅ .env file exists', 'green');
  
  // Read and check DATABASE_URL
  const envContent = fs.readFileSync(envPath, 'utf8');
  const databaseUrlMatch = envContent.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
  
  if (!databaseUrlMatch) {
    log('❌ DATABASE_URL not found in .env file', 'red');
    return false;
  }
  
  const databaseUrl = databaseUrlMatch[1];
  log('✅ DATABASE_URL found', 'green');
  
  // Mask sensitive parts of the URL for display
  const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@');
  log(`📍 Database URL: ${maskedUrl}`, 'blue');
  
  // Check if it's a MongoDB URL
  if (!databaseUrl.startsWith('mongodb')) {
    log('⚠️  Warning: DATABASE_URL does not appear to be a MongoDB connection string', 'yellow');
  }
  
  return true;
}

async function checkPrismaSchema() {
  logSection('📋 Checking Prisma Schema');
  
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  
  if (!fs.existsSync(schemaPath)) {
    log('❌ Prisma schema not found at prisma/schema.prisma', 'red');
    return false;
  }
  
  log('✅ Prisma schema file exists', 'green');
  
  try {
    const output = execSync('npx prisma validate', { encoding: 'utf8', stdio: 'pipe' });
    log('✅ Prisma schema is valid', 'green');
    return true;
  } catch (error) {
    log('❌ Prisma schema validation failed:', 'red');
    log(error.stdout || error.message, 'red');
    return false;
  }
}

async function checkPrismaClient() {
  logSection('🔧 Checking Prisma Client');
  
  try {
    // Check if Prisma Client is generated
    const clientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
    
    if (!fs.existsSync(clientPath)) {
      log('⚠️  Prisma Client not generated. Running prisma generate...', 'yellow');
      try {
        execSync('npx prisma generate', { stdio: 'inherit' });
        log('✅ Prisma Client generated successfully', 'green');
      } catch (error) {
        log('❌ Failed to generate Prisma Client', 'red');
        return false;
      }
    } else {
      log('✅ Prisma Client is generated', 'green');
    }
    
    return true;
  } catch (error) {
    log('❌ Error checking Prisma Client:', 'red');
    log(error.message, 'red');
    return false;
  }
}

async function testDatabaseConnection() {
  logSection('🔌 Testing Database Connection');
  
  let prisma;
  
  try {
    prisma = new PrismaClient({
      log: ['error'],
    });
    
    log('📡 Attempting to connect to database...', 'blue');
    
    // Test connection with a simple query
    await prisma.$connect();
    log('✅ Successfully connected to database', 'green');
    
    // Try a simple operation to verify the connection works
    const result = await prisma.$runCommandRaw({
      ping: 1
    });
    
    log('✅ Database ping successful', 'green');
    log(`📊 Database response: ${JSON.stringify(result)}`, 'blue');
    
    return true;
    
  } catch (error) {
    log('❌ Database connection failed:', 'red');
    
    if (error.message.includes('Server selection timeout')) {
      log('🔍 Diagnosis: MongoDB server selection timeout', 'yellow');
      log('   This usually means:', 'yellow');
      log('   • Network connectivity issues', 'yellow');
      log('   • Incorrect connection string', 'yellow');
      log('   • Database server is down', 'yellow');
      log('   • Firewall blocking the connection', 'yellow');
      log('   • IP address not whitelisted in MongoDB Atlas', 'yellow');
    } else if (error.message.includes('authentication failed')) {
      log('🔍 Diagnosis: Authentication failed', 'yellow');
      log('   Check your username and password in DATABASE_URL', 'yellow');
    } else if (error.message.includes('ENOTFOUND')) {
      log('🔍 Diagnosis: DNS resolution failed', 'yellow');
      log('   Check your internet connection and database host', 'yellow');
    }
    
    log(`📝 Full error: ${error.message}`, 'red');
    return false;
    
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

async function checkDatabaseCollections() {
  logSection('📚 Checking Database Collections');
  
  let prisma;
  
  try {
    prisma = new PrismaClient();
    await prisma.$connect();
    
    // List collections using MongoDB command
    const collections = await prisma.$runCommandRaw({
      listCollections: 1
    });
    
    if (collections.cursor && collections.cursor.firstBatch) {
      const collectionNames = collections.cursor.firstBatch.map(c => c.name);
      log(`✅ Found ${collectionNames.length} collections:`, 'green');
      collectionNames.forEach(name => {
        log(`   • ${name}`, 'blue');
      });
    } else {
      log('⚠️  No collections found or unable to list collections', 'yellow');
    }
    
    return true;
    
  } catch (error) {
    log('❌ Failed to check collections:', 'red');
    log(error.message, 'red');
    return false;
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

async function runDiagnostics() {
  logSection('🏥 Running Additional Diagnostics');
  
  // Check Node.js version
  log(`Node.js version: ${process.version}`, 'blue');
  
  // Check Prisma CLI version
  try {
    const prismaVersion = execSync('npx prisma --version', { encoding: 'utf8' });
    const versionMatch = prismaVersion.match(/prisma\s+:\s+(\d+\.\d+\.\d+)/);
    if (versionMatch) {
      log(`Prisma CLI version: ${versionMatch[1]}`, 'blue');
    }
  } catch (error) {
    log('⚠️  Could not determine Prisma version', 'yellow');
  }
  
  // Check if running in correct directory
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    log(`Project: ${packageJson.name || 'Unknown'}`, 'blue');
  }
  
  // Check network connectivity to MongoDB Atlas
  log('🌐 Testing network connectivity...', 'blue');
  try {
    const { execSync } = require('child_process');
    // Try to ping MongoDB Atlas (this might not work on all systems)
    execSync('ping -n 1 cluster0.mongodb.net', { stdio: 'pipe' });
    log('✅ Network connectivity appears to be working', 'green');
  } catch (error) {
    log('⚠️  Network connectivity test inconclusive', 'yellow');
  }
}

async function main() {
  console.clear();
  log('🚀 SchoolOffice.academy Database Connection Checker', 'bold');
  log('This script will verify your database connection and configuration\n', 'blue');
  
  const checks = [
    { name: 'Environment Configuration', fn: checkEnvironmentFile },
    { name: 'Prisma Schema', fn: checkPrismaSchema },
    { name: 'Prisma Client', fn: checkPrismaClient },
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Database Collections', fn: checkDatabaseCollections }
  ];
  
  const results = [];
  
  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({ name: check.name, success: result });
    } catch (error) {
      log(`❌ Unexpected error in ${check.name}:`, 'red');
      log(error.message, 'red');
      results.push({ name: check.name, success: false });
    }
  }
  
  await runDiagnostics();
  
  // Summary
  logSection('📊 Summary');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const color = result.success ? 'green' : 'red';
    log(`${icon} ${result.name}`, color);
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (passed === total) {
    log('🎉 All checks passed! Your database connection is working properly.', 'green');
  } else {
    log(`⚠️  ${total - passed} out of ${total} checks failed.`, 'yellow');
    log('Please review the errors above and fix the issues.', 'yellow');
    
    if (results.find(r => r.name === 'Database Connection' && !r.success)) {
      console.log('\n💡 Common solutions for connection issues:');
      log('1. Check your internet connection', 'blue');
      log('2. Verify DATABASE_URL in .env file', 'blue');
      log('3. Ensure your IP is whitelisted in MongoDB Atlas', 'blue');
      log('4. Check if MongoDB Atlas cluster is running', 'blue');
      log('5. Verify username/password in connection string', 'blue');
    }
  }
  
  console.log('\n' + '='.repeat(60));
  process.exit(passed === total ? 0 : 1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log('❌ Unhandled Rejection at:', 'red');
  log(promise, 'red');
  log('Reason:', 'red');
  log(reason, 'red');
  process.exit(1);
});

// Run the main function
main().catch(error => {
  log('❌ Fatal error:', 'red');
  log(error.message, 'red');
  process.exit(1);
});