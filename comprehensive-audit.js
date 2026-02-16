/**
 * Comprehensive System Audit Script
 * 
 * This script analyzes:
 * 1. Database schema (Prisma models)
 * 2. Backend API implementations
 * 3. Frontend pages and their API calls
 * 4. Identifies mismatches, missing implementations, and issues
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  log('\n' + '='.repeat(80), 'cyan');
  log(message, 'bright');
  log('='.repeat(80), 'cyan');
}

function subheader(message) {
  log('\n' + '-'.repeat(60), 'blue');
  log(message, 'bright');
  log('-'.repeat(60), 'blue');
}

// Read file content
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

// Get all files in directory recursively
function getAllFiles(dirPath, arrayOfFiles = [], extension = null) {
  try {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isDirectory()) {
        arrayOfFiles = getAllFiles(filePath, arrayOfFiles, extension);
      } else {
        if (!extension || file.endsWith(extension)) {
          arrayOfFiles.push(filePath);
        }
      }
    });

    return arrayOfFiles;
  } catch (error) {
    return arrayOfFiles;
  }
}

// Parse Prisma schema to extract models
function parsePrismaSchema(schemaPath) {
  const content = readFile(schemaPath);
  if (!content) {
    log('❌ Could not read Prisma schema', 'red');
    return { models: [], enums: [] };
  }

  const models = [];
  const enums = [];

  // Extract models
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
  let match;
  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    
    // Extract fields
    const fields = [];
    const fieldRegex = /(\w+)\s+(\w+[\[\]?]*)/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
      if (!fieldMatch[1].startsWith('@@') && !fieldMatch[1].startsWith('//')) {
        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[2]
        });
      }
    }

    // Extract relations
    const relations = [];
    const relationRegex = /(\w+)\s+(\w+)(?:\[\])?\s+@relation/g;
    let relationMatch;
    while ((relationMatch = relationRegex.exec(modelBody)) !== null) {
      relations.push({
        field: relationMatch[1],
        model: relationMatch[2]
      });
    }

    models.push({
      name: modelName,
      fields,
      relations
    });
  }

  // Extract enums
  const enumRegex = /enum\s+(\w+)\s*{([^}]+)}/g;
  while ((match = enumRegex.exec(content)) !== null) {
    const enumName = match[1];
    const enumBody = match[2];
    const values = enumBody.match(/\w+/g) || [];
    enums.push({
      name: enumName,
      values
    });
  }

  return { models, enums };
}

// Analyze API routes
function analyzeAPIRoutes(apiDir) {
  const routes = [];
  const files = getAllFiles(apiDir, [], '.ts');

  files.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    const relativePath = file.replace(apiDir, '').replace(/\\/g, '/');
    const routePath = relativePath
      .replace('/route.ts', '')
      .replace(/\[(\w+)\]/g, ':$1');

    // Detect HTTP methods
    const methods = [];
    if (content.includes('export async function GET')) methods.push('GET');
    if (content.includes('export async function POST')) methods.push('POST');
    if (content.includes('export async function PUT')) methods.push('PUT');
    if (content.includes('export async function PATCH')) methods.push('PATCH');
    if (content.includes('export async function DELETE')) methods.push('DELETE');

    // Detect Prisma model usage
    const prismaModels = [];
    const prismaRegex = /prisma\.(\w+)\./g;
    let match;
    while ((match = prismaRegex.exec(content)) !== null) {
      if (!prismaModels.includes(match[1])) {
        prismaModels.push(match[1]);
      }
    }

    routes.push({
      path: routePath,
      file: relativePath,
      methods,
      prismaModels
    });
  });

  return routes;
}

// Analyze frontend pages
function analyzeFrontendPages(pagesDir) {
  const pages = [];
  const files = getAllFiles(pagesDir, [], '.tsx');

  files.forEach(file => {
    const content = readFile(file);
    if (!content) return;

    const relativePath = file.replace(pagesDir, '').replace(/\\/g, '/');
    
    // Detect API calls
    const apiCalls = [];
    const fetchRegex = /fetch\(['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = fetchRegex.exec(content)) !== null) {
      if (!apiCalls.includes(match[1])) {
        apiCalls.push(match[1]);
      }
    }

    // Detect axios calls
    const axiosRegex = /axios\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/g;
    while ((match = axiosRegex.exec(content)) !== null) {
      const call = `${match[1].toUpperCase()} ${match[2]}`;
      if (!apiCalls.includes(call)) {
        apiCalls.push(call);
      }
    }

    if (apiCalls.length > 0) {
      pages.push({
        path: relativePath,
        apiCalls
      });
    }
  });

  return pages;
}

// Main audit function
async function runAudit() {
  header('COMPREHENSIVE SYSTEM AUDIT');
  log('Starting comprehensive analysis of database, backend, and frontend...', 'cyan');

  // 1. Analyze Prisma Schema
  subheader('1. ANALYZING PRISMA SCHEMA');
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  const { models, enums } = parsePrismaSchema(schemaPath);
  
  log(`✅ Found ${models.length} models`, 'green');
  log(`✅ Found ${enums.length} enums`, 'green');

  // List key models
  const keyModels = [
    'CAEntry', 'ExamEntry', 'GradingSystem', 'GradeRange',
    'DoSTimetable', 'DoSTimetableEntry', 'DoSCurriculumSubject',
    'Student', 'Staff', 'Class', 'Subject', 'Term'
  ];

  log('\nKey Models Status:', 'yellow');
  keyModels.forEach(modelName => {
    const model = models.find(m => m.name === modelName);
    if (model) {
      log(`  ✅ ${modelName} (${model.fields.length} fields, ${model.relations.length} relations)`, 'green');
    } else {
      log(`  ❌ ${modelName} - NOT FOUND`, 'red');
    }
  });

  // 2. Analyze Backend APIs
  subheader('2. ANALYZING BACKEND API ROUTES');
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  const routes = analyzeAPIRoutes(apiDir);
  
  log(`✅ Found ${routes.length} API routes`, 'green');

  // Check critical API endpoints
  const criticalEndpoints = [
    { path: '/class-teacher/assessments/ca', methods: ['GET', 'POST'] },
    { path: '/class-teacher/assessments/exam', methods: ['GET', 'POST'] },
    { path: '/class-teacher/assessments/ca/scores', methods: ['POST'] },
    { path: '/class-teacher/assessments/exam/scores', methods: ['POST'] },
    { path: '/class-teacher/assessments/ca/submit', methods: ['POST'] },
    { path: '/class-teacher/assessments/exam/submit', methods: ['POST'] },
    { path: '/dos/grading-systems', methods: ['GET', 'POST'] },
    { path: '/dos/grading-systems/:id', methods: ['DELETE'] },
    { path: '/dos/grading-systems/:id/grades', methods: ['POST'] },
    { path: '/dos/timetable', methods: ['GET', 'POST'] },
    { path: '/dos/timetable/:id/entries', methods: ['POST'] },
    { path: '/dos/assessments/monitoring', methods: ['GET'] },
  ];

  log('\nCritical Endpoints Status:', 'yellow');
  criticalEndpoints.forEach(endpoint => {
    const route = routes.find(r => r.path === endpoint.path);
    if (route) {
      const missingMethods = endpoint.methods.filter(m => !route.methods.includes(m));
      if (missingMethods.length === 0) {
        log(`  ✅ ${endpoint.path} - ${endpoint.methods.join(', ')}`, 'green');
      } else {
        log(`  ⚠️  ${endpoint.path} - Missing: ${missingMethods.join(', ')}`, 'yellow');
      }
    } else {
      log(`  ❌ ${endpoint.path} - NOT FOUND`, 'red');
    }
  });

  // Check model usage in APIs
  subheader('3. CHECKING PRISMA MODEL USAGE IN APIS');
  
  const modelUsage = {};
  keyModels.forEach(modelName => {
    const usedIn = routes.filter(r => r.prismaModels.includes(modelName.toLowerCase()));
    modelUsage[modelName] = usedIn.length;
    
    if (usedIn.length > 0) {
      log(`  ✅ ${modelName} - Used in ${usedIn.length} API routes`, 'green');
    } else {
      log(`  ⚠️  ${modelName} - NOT USED in any API`, 'yellow');
    }
  });

  // 4. Analyze Frontend Pages
  subheader('4. ANALYZING FRONTEND PAGES');
  const pagesDir = path.join(process.cwd(), 'src', 'app', '(back)', 'dashboard');
  const pages = analyzeFrontendPages(pagesDir);
  
  log(`✅ Found ${pages.length} pages with API calls`, 'green');

  // Check critical pages
  const criticalPages = [
    '/class-teacher/assessments/ca/page.tsx',
    '/class-teacher/assessments/exam/page.tsx',
    '/dos/grading/page.tsx',
    '/dos/timetable/page.tsx',
    '/dos/assessments/monitoring/page.tsx',
    '/dos/assessments/performance/page.tsx',
  ];

  log('\nCritical Pages Status:', 'yellow');
  criticalPages.forEach(pagePath => {
    const page = pages.find(p => p.path === pagePath);
    if (page) {
      log(`  ✅ ${pagePath} - ${page.apiCalls.length} API calls`, 'green');
      page.apiCalls.forEach(call => {
        log(`     → ${call}`, 'cyan');
      });
    } else {
      log(`  ❌ ${pagePath} - NOT FOUND or no API calls`, 'red');
    }
  });

  // 5. Cross-reference: Frontend → Backend
  subheader('5. CROSS-REFERENCING FRONTEND → BACKEND');
  
  const unmatchedCalls = [];
  pages.forEach(page => {
    page.apiCalls.forEach(call => {
      // Extract path from call (remove query params, method prefixes)
      let apiPath = call.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/, '');
      apiPath = apiPath.split('?')[0];
      apiPath = apiPath.replace(/\$\{[^}]+\}/g, ':id'); // Replace template literals
      
      const route = routes.find(r => {
        const routePath = '/api' + r.path;
        return routePath === apiPath || routePath.replace(/:id/g, '') === apiPath.replace(/\/[a-f0-9]{24}/g, '');
      });
      
      if (!route) {
        unmatchedCalls.push({
          page: page.path,
          call: call
        });
      }
    });
  });

  if (unmatchedCalls.length > 0) {
    log('\n⚠️  Unmatched API Calls (Frontend calls non-existent backend):', 'yellow');
    unmatchedCalls.forEach(item => {
      log(`  ${item.page}`, 'cyan');
      log(`    → ${item.call}`, 'red');
    });
  } else {
    log('\n✅ All frontend API calls match backend routes', 'green');
  }

  // 6. Generate Summary Report
  header('AUDIT SUMMARY');
  
  log('\n📊 Database Schema:', 'bright');
  log(`  • Total Models: ${models.length}`, 'cyan');
  log(`  • Total Enums: ${enums.length}`, 'cyan');
  log(`  • Key Models Present: ${keyModels.filter(m => models.find(model => model.name === m)).length}/${keyModels.length}`, 'cyan');

  log('\n📊 Backend APIs:', 'bright');
  log(`  • Total Routes: ${routes.length}`, 'cyan');
  log(`  • Critical Endpoints: ${criticalEndpoints.filter(e => routes.find(r => r.path === e.path)).length}/${criticalEndpoints.length}`, 'cyan');
  log(`  • Models Used: ${Object.values(modelUsage).filter(v => v > 0).length}/${keyModels.length}`, 'cyan');

  log('\n📊 Frontend Pages:', 'bright');
  log(`  • Pages with API Calls: ${pages.length}`, 'cyan');
  log(`  • Critical Pages: ${criticalPages.filter(p => pages.find(page => page.path === p)).length}/${criticalPages.length}`, 'cyan');
  log(`  • Unmatched API Calls: ${unmatchedCalls.length}`, unmatchedCalls.length > 0 ? 'yellow' : 'green');

  // 7. Specific Issue Detection
  header('SPECIFIC ISSUES DETECTED');

  // Check for common issues
  const issues = [];

  // Issue 1: CAEntry and ExamEntry usage
  const caEntryRoutes = routes.filter(r => r.prismaModels.includes('cAEntry'));
  const examEntryRoutes = routes.filter(r => r.prismaModels.includes('examEntry'));
  
  if (caEntryRoutes.length === 0) {
    issues.push({
      severity: 'HIGH',
      category: 'Backend',
      message: 'CAEntry model exists but is not used in any API routes'
    });
  }
  
  if (examEntryRoutes.length === 0) {
    issues.push({
      severity: 'HIGH',
      category: 'Backend',
      message: 'ExamEntry model exists but is not used in any API routes'
    });
  }

  // Issue 2: GradingSystem usage
  const gradingSystemRoutes = routes.filter(r => r.prismaModels.includes('gradingSystem'));
  if (gradingSystemRoutes.length === 0) {
    issues.push({
      severity: 'MEDIUM',
      category: 'Backend',
      message: 'GradingSystem model exists but is not used in any API routes'
    });
  }

  // Issue 3: DoSTimetable usage
  const timetableRoutes = routes.filter(r => r.prismaModels.includes('doSTimetable'));
  if (timetableRoutes.length === 0) {
    issues.push({
      severity: 'MEDIUM',
      category: 'Backend',
      message: 'DoSTimetable model exists but is not used in any API routes'
    });
  }

  // Issue 4: Missing submit endpoints
  const caSubmitRoute = routes.find(r => r.path === '/class-teacher/assessments/ca/submit');
  if (!caSubmitRoute || !caSubmitRoute.methods.includes('POST')) {
    issues.push({
      severity: 'HIGH',
      category: 'Backend',
      message: 'CA submit endpoint missing or incomplete'
    });
  }

  const examSubmitRoute = routes.find(r => r.path === '/class-teacher/assessments/exam/submit');
  if (!examSubmitRoute || !examSubmitRoute.methods.includes('POST')) {
    issues.push({
      severity: 'HIGH',
      category: 'Backend',
      message: 'Exam submit endpoint missing or incomplete'
    });
  }

  // Display issues
  if (issues.length > 0) {
    issues.forEach(issue => {
      const color = issue.severity === 'HIGH' ? 'red' : issue.severity === 'MEDIUM' ? 'yellow' : 'cyan';
      log(`\n[${issue.severity}] ${issue.category}:`, color);
      log(`  ${issue.message}`, color);
    });
  } else {
    log('\n✅ No critical issues detected!', 'green');
  }

  // 8. Recommendations
  header('RECOMMENDATIONS');
  
  log('\n1. Backend API Improvements:', 'yellow');
  log('   • Ensure all Prisma models have corresponding API endpoints', 'cyan');
  log('   • Add missing HTTP methods (PUT, PATCH, DELETE) where needed', 'cyan');
  log('   • Implement proper error handling and validation', 'cyan');

  log('\n2. Frontend Improvements:', 'yellow');
  log('   • Verify all API calls match backend routes', 'cyan');
  log('   • Add loading states and error handling', 'cyan');
  log('   • Implement proper TypeScript types for API responses', 'cyan');

  log('\n3. Database Schema:', 'yellow');
  log('   • Review unused models and consider removing or implementing', 'cyan');
  log('   • Ensure all relations are properly defined', 'cyan');
  log('   • Add indexes for frequently queried fields', 'cyan');

  header('AUDIT COMPLETE');
  log('Review the findings above and address any issues identified.', 'green');
}

// Run the audit
runAudit().catch(error => {
  log('\n❌ Audit failed with error:', 'red');
  console.error(error);
  process.exit(1);
});
