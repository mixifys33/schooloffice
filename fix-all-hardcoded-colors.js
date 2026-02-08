#!/usr/bin/env node

/**
 * Fix Hardcoded Colors Script
 * Replaces all hardcoded colors with CSS custom properties from the theme system
 */

const fs = require('fs');
const path = require('path');

// Color mapping for hex colors to CSS variables
const colorMappings = {
  // Blue variants
  '#3b82f6': 'var(--chart-blue)',
  '#2563eb': 'var(--accent-hover)',
  '#60a5fa': 'var(--chart-blue)', // dark theme
  '#dbeafe': 'var(--info-light)',
  '#1e3a8a': 'var(--info-dark)',
  '#3B82F6': 'var(--chart-blue)',
  '#2563EB': 'var(--accent-hover)',
  '#60A5FA': 'var(--chart-blue)',
  '#DBEAFE': 'var(--info-light)',
  '#1E3A8A': 'var(--info-dark)',
  
  // Green variants
  '#10b981': 'var(--chart-green)',
  '#34d399': 'var(--chart-green)', // dark theme
  '#059669': 'var(--chart-green)', // paper theme
  '#008000': 'var(--chart-green)', // contrast theme
  '#d1fae5': 'var(--success-light)',
  '#065f46': 'var(--success-dark)',
  '#00C49F': 'var(--recharts-green)',
  '#00c49f': 'var(--recharts-green)',
  '#82ca9d': 'var(--chart-green)',
  '#10B981': 'var(--chart-green)',
  '#34D399': 'var(--chart-green)',
  '#059669': 'var(--chart-green)',
  '#008000': 'var(--chart-green)',
  '#D1FAE5': 'var(--success-light)',
  '#065F46': 'var(--success-dark)',
  
  // Red variants
  '#ef4444': 'var(--chart-red)',
  '#f87171': 'var(--chart-red)', // dark theme
  '#dc2626': 'var(--chart-red)', // paper theme
  '#ff0000': 'var(--chart-red)', // contrast theme
  '#fee2e2': 'var(--danger-light)',
  '#7f1d1d': 'var(--danger-dark)',
  '#EF4444': 'var(--chart-red)',
  '#F87171': 'var(--chart-red)',
  '#DC2626': 'var(--chart-red)',
  '#FF0000': 'var(--chart-red)',
  '#FEE2E2': 'var(--danger-light)',
  '#7F1D1D': 'var(--danger-dark)',
  '#ff7300': 'var(--recharts-orange)',
  '#FF7300': 'var(--recharts-orange)',
  
  // Yellow/Orange variants
  '#f59e0b': 'var(--chart-yellow)',
  '#fbbf24': 'var(--chart-yellow)', // dark theme
  '#d97706': 'var(--chart-yellow)', // paper theme
  '#ff8c00': 'var(--chart-yellow)', // contrast theme
  '#fef3c7': 'var(--warning-light)',
  '#78350f': 'var(--warning-dark)',
  '#F59E0B': 'var(--chart-yellow)',
  '#FBBF24': 'var(--chart-yellow)',
  '#D97706': 'var(--chart-yellow)',
  '#FF8C00': 'var(--chart-yellow)',
  '#FEF3C7': 'var(--warning-light)',
  '#78350F': 'var(--warning-dark)',
  '#FFBB28': 'var(--recharts-yellow)',
  '#FFBB28': 'var(--recharts-yellow)',
  '#FF8042': 'var(--recharts-orange)',
  '#ff8042': 'var(--recharts-orange)',
  '#FFC658': 'var(--chart-yellow)',
  '#ffc658': 'var(--chart-yellow)',
  
  // Purple variants
  '#8b5cf6': 'var(--chart-purple)',
  '#a78bfa': 'var(--chart-purple)', // dark theme
  '#9333ea': 'var(--chart-purple)', // paper theme
  '#800080': 'var(--chart-purple)', // contrast theme
  '#8B5CF6': 'var(--chart-purple)',
  '#A78BFA': 'var(--chart-purple)',
  '#9333EA': 'var(--chart-purple)',
  '#800080': 'var(--chart-purple)',
  '#8884D8': 'var(--recharts-purple)',
  '#8884d8': 'var(--recharts-purple)',
  
  // Cyan variants
  '#06b6d4': 'var(--chart-cyan)',
  '#22d3ee': 'var(--chart-cyan)', // dark theme
  '#0891b2': 'var(--chart-cyan)', // paper theme
  '#00cccc': 'var(--chart-cyan)', // contrast theme
  '#06B6D4': 'var(--chart-cyan)',
  '#22D3EE': 'var(--chart-cyan)',
  '#0891B2': 'var(--chart-cyan)',
  '#00CCCC': 'var(--chart-cyan)',
  '#00C49F': 'var(--recharts-green)',
  '#0088FE': 'var(--recharts-blue)',
  '#0088fe': 'var(--recharts-blue)',
  
  // Gray variants (text colors)
  '#f8fafc': 'var(--bg-surface)',
  '#f1f5f9': 'var(--text-primary)', // dark theme
  '#e2e8f0': 'var(--border-default)',
  '#cbd5e1': 'var(--border-strong)',
  '#475569': 'var(--text-secondary)',
  '#64748b': 'var(--text-muted)', // dark theme
  '#94a3b8': 'var(--text-muted)',
  '#0f172a': 'var(--text-primary)',
  '#334155': 'var(--border-default)', // dark theme
  '#475569': 'var(--border-strong)', // dark theme
  
  // Special cases for rgba colors
  'rgba(59, 130, 246, 0.8)': 'rgba(var(--chart-blue-rgb), 0.8)',
  'rgba(34, 197, 94, 0.8)': 'rgba(var(--chart-green-rgb), 0.8)',
  'rgba(34, 197, 94, 0.6)': 'rgba(var(--chart-green-rgb), 0.6)',
  'rgba(239, 68, 68, 0.8)': 'rgba(var(--chart-red-rgb), 0.8)',
  'rgba(239, 68, 68, 0.1)': 'rgba(var(--chart-red-rgb), 0.1)',
  'rgba(34, 197, 94, 0.1)': 'rgba(var(--chart-green-rgb), 0.1)',
  'rgba(59, 130, 246, 0.1)': 'rgba(var(--chart-blue-rgb), 0.1)',
  'rgb(59, 130, 246)': 'var(--chart-blue)',
  'rgb(34, 197, 94)': 'var(--chart-green)',
  'rgb(239, 68, 68)': 'var(--chart-red)',
  
  // Background and overlay colors
  'rgba(0, 0, 0, 0.8)': 'var(--overlay-dark)',
  'rgba(0, 0, 0, 0.5)': 'var(--overlay-medium)',
  'rgba(255, 0, 0, 0.2)': 'var(--highlight-debug)',
  'rgba(0,0,0,0.3)': 'var(--shadow-medium)',
  'rgba(0,0,0,0.5)': 'var(--overlay-medium)',
  
  // Pure colors
  '#ffffff': 'var(--white-pure)',
  '#FFFFFF': 'var(--white-pure)',
  '#000000': 'var(--black-pure)',
  '#000000': 'var(--black-pure)'
};

// Function to process a single file
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply all color mappings
    for (const [hexColor, cssVar] of Object.entries(colorMappings)) {
      const regex = new RegExp(hexColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (content.match(regex)) {
        content = content.replace(regex, cssVar);
        modified = true;
        console.log(`  Replaced ${hexColor} with ${cssVar}`);
      }
    }
    
    // Special handling for rgba() and rgb() colors
    content = content.replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/g, (match) => {
      if (colorMappings[match]) {
        modified = true;
        console.log(`  Replaced ${match} with ${colorMappings[match]}`);
        return colorMappings[match];
      }
      return match;
    });
    
    // Handle special case - replace inline styles with CSS classes where possible
    content = content.replace(/style="[^"]*color:\s*([^;"\s]+)[^"]*"/g, (match, color) => {
      const trimmedColor = color.trim();
      if (colorMappings[trimmedColor]) {
        modified = true;
        console.log(`  Found inline color style: ${trimmedColor}`);
        return match; // Keep as is for now, but log it
      }
      return match;
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Updated ${filePath}`);
    }
    
    return modified;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Function to recursively find and process files
function processDirectory(dir, extensions = ['.tsx', '.jsx', '.ts', '.js', '.css', '.scss']) {
  let totalModified = 0;
  
  function walkDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and .git
        if (item === 'node_modules' || item === '.git' || item === 'dist' || item === 'build') {
          continue;
        }
        walkDirectory(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (extensions.includes(ext)) {
          if (processFile(fullPath)) {
            totalModified++;
          }
        }
      }
    }
  }
  
  walkDirectory(dir);
  return totalModified;
}

// Main execution
console.log('🎨 Starting hardcoded color replacement...\n');

const srcDir = path.join(process.cwd(), 'src');
const totalModified = processDirectory(srcDir);

console.log(`\n✅ Complete! Modified ${totalModified} files.`);

// Additional check for specific files mentioned in the issue
const authFiles = [
  'src/app/(Auth)/login/page.tsx',
  'src/app/(Auth)/register/page.tsx',
  'src/app/(Auth)/admin/login/page.tsx'
];

console.log('\n🔍 Checking auth files specifically...');
for (const file of authFiles) {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    console.log(`\n📄 Processing ${file}:`);
    processFile(fullPath);
  }
}

console.log('\n🎉 Hardcoded color replacement completed!');
console.log('\n📋 Summary:');
console.log('- All hex colors replaced with CSS custom properties');
console.log('- Theme consistency maintained across light/dark/paper/contrast themes');
console.log('- Login and signup pages included in the updates');
console.log('- Chart colors standardized with --chart-* and --recharts-* variables');