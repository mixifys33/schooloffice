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

// Run the actual build
const { spawn } = require('child_process');
const child = spawn('npx', ['next', 'build'], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', (code) => {
  process.exit(code);
});