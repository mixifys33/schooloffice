#!/usr/bin/env node

// Suppress baseline-browser-mapping warnings
const originalConsoleWarn = console.warn;
console.warn = function(...args) {
  const message = args.join(' ');
  if (message.includes('baseline-browser-mapping') && message.includes('over two months old')) {
    return; // Suppress this specific warning
  }
  originalConsoleWarn.apply(console, args);
};

// Run the actual build with increased memory
const { spawn } = require('child_process');
const child = spawn('node', ['--max-old-space-size=4096', 'node_modules/next/dist/bin/next', 'build'], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});