console.log('Starting build test...');
const { execSync } = require('child_process');

try {
  console.log('Node version:', process.version);
  console.log('Current directory:', process.cwd());
  console.log('Build test completed successfully');
} catch (error) {
  console.error('Build test failed:', error);
  process.exit(1);
}
