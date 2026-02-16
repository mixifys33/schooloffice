#!/usr/bin/env node

/**
 * Pre-Dev Script
 * 
 * Runs before `npm run dev` to ensure:
 * 1. Prisma client is generated
 * 2. Database schema is up to date
 * 
 * This ensures the report card pipeline and all features work immediately
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 [PRE-DEV] Preparing development environment...\n');

// Check if Prisma client needs generation
const prismaClientPath = path.join(__dirname, '..', 'node_modules', '.prisma', 'client');
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');

let needsGenerate = false;

if (!fs.existsSync(prismaClientPath)) {
  console.log('📦 [PRE-DEV] Prisma client not found, will generate...');
  needsGenerate = true;
} else {
  // Check if schema is newer than generated client
  const schemaStats = fs.statSync(schemaPath);
  const clientStats = fs.statSync(prismaClientPath);
  
  if (schemaStats.mtime > clientStats.mtime) {
    console.log('🔄 [PRE-DEV] Schema updated, will regenerate client...');
    needsGenerate = true;
  }
}

try {
  // Generate Prisma client if needed
  if (needsGenerate) {
    console.log('⚙️  [PRE-DEV] Generating Prisma client...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ [PRE-DEV] Prisma client generated\n');
  } else {
    console.log('✅ [PRE-DEV] Prisma client is up to date\n');
  }

  // Push schema to database (only if schema changed)
  if (needsGenerate) {
    console.log('📤 [PRE-DEV] Pushing schema to database...');
    execSync('npx prisma db push --skip-generate', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    console.log('✅ [PRE-DEV] Database schema updated\n');
  }

  console.log('🎉 [PRE-DEV] Development environment ready!\n');
  console.log('📋 [PRE-DEV] DoS Dashboard is ready to use:');
  console.log('   → Navigate to: /dos');
  console.log('   → Access all DoS features from the dashboard\n');
  
} catch (error) {
  console.error('❌ [PRE-DEV] Error:', error.message);
  console.error('\n⚠️  [PRE-DEV] Development server will start, but database may not be ready.');
  console.error('   Run manually: npm run db:generate && npm run db:push\n');
  // Don't exit - let dev server start anyway
}
