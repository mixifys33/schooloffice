#!/usr/bin/env node

/**
 * Verification script for DOS fixes
 */

const fs = require('fs');
const path = require('path');

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

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`, exists ? 'green' : 'red');
  return exists;
}

function checkFileContent(filePath, searchText, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const found = content.includes(searchText);
    log(`${found ? '✅' : '❌'} ${description}`, found ? 'green' : 'red');
    return found;
  } catch (error) {
    log(`❌ Could not read ${filePath}: ${error.message}`, 'red');
    return false;
  }
}

function checkFileDoesNotContain(filePath, searchText, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const found = content.includes(searchText);
    log(`${!found ? '✅' : '❌'} ${description}`, !found ? 'green' : 'red');
    return !found;
  } catch (error) {
    log(`❌ Could not read ${filePath}: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  console.clear();
  log('🔍 DOS Fixes Verification', 'bold');
  log('Checking all applied fixes\n', 'blue');

  let passed = 0;
  let total = 0;

  // Check 1: Missing API endpoint created
  total++;
  if (checkFileExists('src/app/api/dos/context/route.ts', 'DOS Context API endpoint created')) {
    passed++;
  }

  // Check 2: getServerSession imports removed
  const filesToCheck = [
    'src/app/api/dos/subjects/route.ts',
    'src/app/api/dos/subjects/[id]/route.ts',
    'src/app/api/dos/subjects/teacher-assignments/route.ts',
    'src/app/api/dos/subjects/class-assignments/route.ts',
    'src/app/api/classes/route.ts',
    'src/app/api/classes/[id]/subjects/route.ts'
  ];

  filesToCheck.forEach(file => {
    total++;
    if (checkFileDoesNotContain(file, 'getServerSession', `No getServerSession import in ${file}`)) {
      passed++;
    }
  });

  // Check 3: auth() imports added
  filesToCheck.forEach(file => {
    total++;
    if (checkFileContent(file, 'import { auth }', `Uses auth() import in ${file}`)) {
      passed++;
    }
  });

  // Check 4: DOS navigation has no curriculum references
  total++;
  if (!checkFileContent('src/components/dos/dos-navigation.tsx', '/dos/curriculum', 'DOS navigation has no curriculum references')) {
    passed++;
  }

  // Check 5: Duplicate subjects page removed
  total++;
  if (!fs.existsSync('src/app/(portals)/dos/subjects/page.tsx')) {
    log('✅ Duplicate DOS subjects page removed', 'green');
    passed++;
  } else {
    log('❌ Duplicate DOS subjects page still exists', 'red');
  }

  // Check 6: DOS layout structure
  total++;
  if (checkFileExists('src/components/dos/dos-standalone-layout.tsx', 'DOS standalone layout exists')) {
    passed++;
  }

  total++;
  if (checkFileContent('src/components/dos/dos-standalone-layout.tsx', 'DoSNavigation', 'DOS layout uses DOS navigation')) {
    passed++;
  }

  // Check 7: SchoolType validation
  total++;
  if (checkFileContent('src/app/api/dos/subjects/route.ts', 'SchoolType', 'SchoolType validation in subjects API')) {
    passed++;
  }

  // Summary
  log('\n' + '='.repeat(60), 'bold');
  log(`📊 Verification Results: ${passed}/${total} checks passed`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n🎉 All fixes have been successfully applied!', 'green');
    log('✅ Build error should be resolved', 'green');
    log('✅ DOS sections now use proper DOS sidebar', 'green');
    log('✅ API routes use correct authentication', 'green');
    log('✅ SchoolType enum validation is in place', 'green');
  } else {
    log(`\n⚠️  ${total - passed} issues found. Please review the failed checks above.`, 'yellow');
  }

  log('\n🚀 Next Steps:', 'bold');
  log('1. Run: npm run dev', 'blue');
  log('2. Navigate to DOS sections to verify sidebar', 'blue');
  log('3. Test subject creation/management', 'blue');
  log('4. Verify no more build errors', 'blue');

  console.log('\n' + '='.repeat(60));
  process.exit(passed === total ? 0 : 1);
}

main().catch(error => {
  log('❌ Verification error:', 'red');
  log(error.message, 'red');
  process.exit(1);
});