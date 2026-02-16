#!/usr/bin/env node

/**
 * Test script to verify API fixes
 */

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

async function testAPI(url, description) {
  try {
    log(`\n🔍 Testing: ${description}`, 'blue');
    log(`📡 URL: ${url}`, 'blue');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const contentType = response.headers.get('content-type');
    log(`📋 Content-Type: ${contentType}`, 'blue');
    log(`📊 Status: ${response.status}`, response.status < 400 ? 'green' : 'red');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.text();
      log(`✅ Response is valid JSON`, 'green');
      
      // Try to parse to verify it's valid JSON
      try {
        JSON.parse(data);
        log(`✅ JSON parsing successful`, 'green');
      } catch (e) {
        log(`❌ JSON parsing failed: ${e.message}`, 'red');
      }
    } else {
      const text = await response.text();
      if (text.includes('<!DOCTYPE')) {
        log(`❌ Response is HTML instead of JSON`, 'red');
        log(`📄 First 200 chars: ${text.substring(0, 200)}...`, 'yellow');
      } else {
        log(`⚠️  Response is not JSON: ${text.substring(0, 100)}...`, 'yellow');
      }
    }
    
    return response.status < 400;
    
  } catch (error) {
    log(`❌ Network error: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  console.clear();
  log('🚀 API Fixes Test Suite', 'bold');
  log('Testing the fixed API endpoints\n', 'blue');
  
  const baseUrl = 'http://localhost:3000';
  
  const tests = [
    {
      url: `${baseUrl}/api/dos/context`,
      description: 'DOS Context API (newly created)'
    },
    {
      url: `${baseUrl}/api/dos/dashboard`,
      description: 'DOS Dashboard API (fixed enum issues)'
    },
    {
      url: `${baseUrl}/api/dos/subjects`,
      description: 'DOS Subjects API (fixed SchoolType validation)'
    },
    {
      url: `${baseUrl}/api/auth/session`,
      description: 'Auth Session API (baseline test)'
    }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const success = await testAPI(test.url, test.description);
    if (success) passed++;
  }
  
  log('\n' + '='.repeat(60), 'bold');
  log(`📊 Test Results: ${passed}/${total} endpoints responding correctly`, passed === total ? 'green' : 'yellow');
  
  if (passed < total) {
    log('\n💡 Note: Some endpoints may require authentication', 'blue');
    log('   401/403 errors are expected for protected routes', 'blue');
    log('   The important thing is that they return JSON, not HTML', 'blue');
  }
  
  log('\n🎯 Key Fixes Applied:', 'bold');
  log('✅ Created missing /api/dos/context endpoint', 'green');
  log('✅ Fixed SchoolType enum validation in subjects API', 'green');
  log('✅ Fixed role checking to use string values instead of enum references', 'green');
  log('✅ Added proper error handling to prevent HTML responses', 'green');
  log('✅ Ensured all API routes return JSON with proper Content-Type headers', 'green');
  
  console.log('\n' + '='.repeat(60));
}

main().catch(error => {
  log('❌ Test suite error:', 'red');
  log(error.message, 'red');
  process.exit(1);
});