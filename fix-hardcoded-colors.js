/**
 * Comprehensive Script to Fix Hardcoded Colors
 * This script identifies and provides fixes for hardcoded colors across the codebase
 */

const fs = require('fs');
const path = require('path');

// Color mapping from hardcoded Tailwind classes to CSS variables
const colorMappings = {
  // Background colors
  'bg-white': 'var(--bg-main)',
  'bg-gray-50': 'var(--bg-surface)',
  'bg-gray-100': 'var(--bg-surface)',
  'bg-gray-900': 'var(--bg-main)',
  'bg-gray-800': 'var(--bg-elevated)',
  
  // Text colors
  'text-gray-900': 'var(--text-primary)',
  'text-gray-800': 'var(--text-primary)',
  'text-gray-700': 'var(--text-secondary)',
  'text-gray-600': 'var(--text-secondary)',
  'text-gray-500': 'var(--text-muted)',
  'text-gray-400': 'var(--text-muted)',
  'text-white': 'var(--bg-main)',
  
  // Border colors
  'border-gray-200': 'var(--border-default)',
  'border-gray-300': 'var(--border-default)',
  'border-gray-700': 'var(--border-default)',
  'border-gray-800': 'var(--border-strong)',
  
  // Status colors - Red/Danger
  'bg-red-50': 'var(--danger-light)',
  'bg-red-100': 'var(--danger-light)',
  'text-red-600': 'var(--danger)',
  'text-red-700': 'var(--danger-dark)',
  'text-red-800': 'var(--danger-dark)',
  'border-red-200': 'var(--danger)',
  'border-red-300': 'var(--danger)',
  
  // Status colors - Green/Success
  'bg-green-50': 'var(--success-light)',
  'bg-green-100': 'var(--success-light)',
  'text-green-600': 'var(--success)',
  'text-green-700': 'var(--success-dark)',
  'text-green-800': 'var(--success-dark)',
  'border-green-200': 'var(--success)',
  'border-green-300': 'var(--success)',
  
  // Status colors - Yellow/Warning
  'bg-yellow-50': 'var(--warning-light)',
  'bg-amber-50': 'var(--warning-light)',
  'bg-amber-100': 'var(--warning-light)',
  'text-amber-600': 'var(--warning)',
  'text-amber-700': 'var(--warning-dark)',
  'text-amber-800': 'var(--warning-dark)',
  'text-yellow-600': 'var(--warning)',
  'border-amber-200': 'var(--warning)',
  'border-yellow-200': 'var(--warning)',
  
  // Status colors - Blue/Info
  'bg-blue-50': 'var(--info-light)',
  'bg-blue-100': 'var(--info-light)',
  'text-blue-600': 'var(--info)',
  'text-blue-700': 'var(--info-dark)',
  'text-blue-800': 'var(--info-dark)',
  'border-blue-200': 'var(--info)',
  'border-blue-300': 'var(--info)',
};

// Dark mode mappings
const darkModeReplacements = {
  'dark:bg-gray-900': '',
  'dark:bg-gray-800': '',
  'dark:bg-gray-700': '',
  'dark:text-white': '',
  'dark:text-gray-100': '',
  'dark:text-gray-200': '',
  'dark:text-gray-300': '',
  'dark:text-gray-400': '',
  'dark:border-gray-700': '',
  'dark:border-gray-800': '',
  'dark:hover:bg-gray-700': '',
  'dark:hover:text-white': '',
};

// Patterns to find hardcoded colors
const colorPatterns = [
  // Tailwind color classes
  /\b(bg|text|border)-(gray|red|green|blue|yellow|amber|orange|purple|pink|indigo)-(50|100|200|300|400|500|600|700|800|900)\b/g,
  // Dark mode variants
  /\bdark:(bg|text|border)-(gray|red|green|blue|yellow|amber|orange|purple|pink|indigo)-(50|100|200|300|400|500|600|700|800|900)\b/g,
  // Hover variants
  /\bhover:(bg|text|border)-(gray|red|green|blue|yellow|amber|orange|purple|pink|indigo)-(50|100|200|300|400|500|600|700|800|900)\b/g,
  // Dark hover variants
  /\bdark:hover:(bg|text|border)-(gray|red|green|blue|yellow|amber|orange|purple|pink|indigo)-(50|100|200|300|400|500|600|700|800|900)\b/g,
];

// Files to process
const filesToProcess = [
  'src/components/**/*.tsx',
  'src/app/**/*.tsx',
  'src/pages/**/*.tsx',
];

// Generate replacement suggestions
function generateReplacements(content, filePath) {
  const suggestions = [];
  
  // Find all color matches
  colorPatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const replacement = colorMappings[match];
        if (replacement) {
          suggestions.push({
            original: match,
            replacement: replacement,
            type: 'css-variable',
            line: content.split('\n').findIndex(line => line.includes(match)) + 1
          });
        }
      });
    }
  });
  
  return suggestions;
}

// Generate theme-compliant component template
function generateThemeComponent(componentName) {
  return `
import React from 'react';
import { createThemeStyle, getThemeClasses } from '@/lib/theme-utils';

interface ${componentName}Props {
  // Add your props here
}

export function ${componentName}(props: ${componentName}Props) {
  const themeClasses = getThemeClasses();
  
  return (
    <div 
      className={themeClasses.card}
      style={createThemeStyle.card()}
    >
      {/* Your content here */}
      <h2 style={createThemeStyle.text('primary')}>
        Theme-compliant heading
      </h2>
      <p style={createThemeStyle.text('secondary')}>
        Theme-compliant text
      </p>
      
      {/* Status examples */}
      <div 
        className={themeClasses.alert}
        style={createThemeStyle.alert('success')}
      >
        Success message
      </div>
      
      <div 
        className={themeClasses.alert}
        style={createThemeStyle.alert('warning')}
      >
        Warning message
      </div>
      
      <div 
        className={themeClasses.alert}
        style={createThemeStyle.alert('danger')}
      >
        Error message
      </div>
    </div>
  );
}
`;
}

// Common theme-compliant patterns
const themePatterns = {
  card: `
    className="border rounded-lg p-4"
    style={{
      backgroundColor: 'var(--bg-elevated)',
      borderColor: 'var(--border-default)',
      color: 'var(--text-primary)'
    }}
  `,
  
  button: `
    style={{
      backgroundColor: 'var(--accent-primary)',
      color: 'var(--accent-contrast)'
    }}
    className="hover:opacity-90 transition-opacity"
  `,
  
  alert: (type) => `
    className="p-4 border rounded-lg"
    style={{
      backgroundColor: 'var(--${type}-light)',
      borderColor: 'var(--${type})',
      color: 'var(--${type}-dark)'
    }}
  `,
  
  text: (variant) => `
    style={{ color: 'var(--text-${variant})' }}
  `,
  
  spinner: `
    className="animate-spin rounded-full border-2"
    style={{
      borderColor: 'currentColor',
      borderTopColor: 'transparent'
    }}
  `
};

// Priority files that need immediate fixing
const priorityFiles = [
  'src/app/(back)/dashboard/layout.tsx',
  'src/app/(back)/dashboard/school-admin/page.tsx',
  'src/components/auth/staff-onboarding-modal.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/card.tsx',
  'src/components/ui/alert-banner.tsx',
  'src/components/dashboard/today-panel.tsx',
];

// Generate comprehensive fix report
function generateFixReport() {
  console.log('🎨 HARDCODED COLOR FIX REPORT');
  console.log('================================');
  
  console.log('\n📋 PRIORITY FIXES NEEDED:');
  priorityFiles.forEach(file => {
    console.log(`- ${file}`);
  });
  
  console.log('\n🔧 COMMON REPLACEMENTS:');
  Object.entries(colorMappings).forEach(([old, newVal]) => {
    console.log(`  ${old} → style={{ color/backgroundColor: '${newVal}' }}`);
  });
  
  console.log('\n📝 THEME-COMPLIANT PATTERNS:');
  console.log('1. Card Component:');
  console.log(themePatterns.card);
  
  console.log('\n2. Button Component:');
  console.log(themePatterns.button);
  
  console.log('\n3. Alert Component:');
  console.log(themePatterns.alert('danger'));
  
  console.log('\n4. Text Styling:');
  console.log(themePatterns.text('primary'));
  
  console.log('\n5. Loading Spinner:');
  console.log(themePatterns.spinner);
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Import theme utilities: import { createThemeStyle } from "@/lib/theme-utils"');
  console.log('2. Replace className with style props using CSS variables');
  console.log('3. Remove all dark: prefixed classes');
  console.log('4. Test with different themes (light, dark, paper, contrast)');
  console.log('5. Verify accessibility compliance');
  
  console.log('\n✅ COMPLETED FIXES:');
  console.log('- Dashboard layout onboarding button');
  console.log('- School admin dashboard banner');
  console.log('- Staff onboarding modal header');
  console.log('- Theme utility functions created');
}

// Run the report
generateFixReport();

module.exports = {
  colorMappings,
  darkModeReplacements,
  themePatterns,
  generateThemeComponent,
  priorityFiles
};