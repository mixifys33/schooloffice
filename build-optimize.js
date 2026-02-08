#!/usr/bin/env node

/**
 * Build Optimization Script
 * Clears caches and optimizes build performance
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting build optimization...');

// Clear build caches
const cachePaths = [
  '.next',
  'tsconfig.tsbuildinfo',
  'node_modules/.cache',
  '.eslintcache'
];

cachePaths.forEach(cachePath => {
  if (fs.existsSync(cachePath)) {
    console.log(`🗑️  Clearing ${cachePath}...`);
    fs.rmSync(cachePath, { recursive: true, force: true });
  }
});

// Generate Prisma client
console.log('🔧 Generating Prisma client...');
const { execSync } = require('child_process');

try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated successfully');
} catch (error) {
  console.error('❌ Failed to generate Prisma client:', error.message);
  process.exit(1);
}

console.log('✅ Build optimization complete!');
console.log('💡 Now run: npm run build');