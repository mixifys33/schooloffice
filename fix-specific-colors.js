#!/usr/bin/env node

/**
 * Fix Remaining Hardcoded Colors in Specific Files
 * Focus on components and pages that were not fully updated
 */

const fs = require('fs');
const path = require('path');

// Specific color mappings for remaining issues
const specificMappings = {
  // Text colors in auth and UI components
  'text-blue-600': 'text-[var(--chart-blue)]',
  'text-green-600': 'text-[var(--chart-green)]',
  'text-red-600': 'text-[var(--chart-red)]',
  'text-yellow-600': 'text-[var(--chart-yellow)]',
  'text-purple-600': 'text-[var(--chart-purple)]',
  'text-blue-700': 'text-[var(--accent-hover)]',
  'text-green-700': 'text-[var(--chart-green)]',
  'text-red-700': 'text-[var(--chart-red)]',
  'text-orange-600': 'text-[var(--chart-yellow)]',
  'text-gray-600': 'text-[var(--text-secondary)]',
  'text-gray-700': 'text-[var(--text-primary)]',
  'text-gray-500': 'text-[var(--text-muted)]',
  'text-gray-400': 'text-[var(--text-muted)]',
  'text-gray-900': 'text-[var(--text-primary)]',
  'text-gray-800': 'text-[var(--text-primary)]',
  'text-white': 'text-[var(--white-pure)]',
  'text-black': 'text-[var(--black-pure)]',
  
  // Background colors
  'bg-blue-50': 'bg-[var(--info-light)]',
  'bg-green-50': 'bg-[var(--success-light)]',
  'bg-red-50': 'bg-[var(--danger-light)]',
  'bg-yellow-50': 'bg-[var(--warning-light)]',
  'bg-orange-50': 'bg-[var(--warning-light)]',
  'bg-gray-50': 'bg-[var(--bg-surface)]',
  'bg-blue-100': 'bg-[var(--info-light)]',
  'bg-green-100': 'bg-[var(--success-light)]',
  'bg-red-100': 'bg-[var(--danger-light)]',
  'bg-gray-100': 'bg-[var(--bg-surface)]',
  'bg-white': 'bg-[var(--bg-main)]',
  'bg-black': 'bg-[var(--text-primary)]',
  'dark:bg-gray-900': 'dark:bg-[var(--bg-main)]',
  'dark:bg-gray-800': 'dark:bg-[var(--bg-surface)]',
  'dark:bg-gray-700': 'dark:bg-[var(--border-default)]',
  
  // Border colors
  'border-blue-200': 'border-[var(--info-light)]',
  'border-green-200': 'border-[var(--success-light)]',
  'border-red-200': 'border-[var(--danger-light)]',
  'border-yellow-200': 'border-[var(--warning-light)]',
  'border-gray-200': 'border-[var(--border-default)]',
  'border-gray-300': 'border-[var(--border-default)]',
  'border-gray-800': 'border-[var(--border-strong)]',
  'dark:border-gray-800': 'dark:border-[var(--border-default)]',
  'dark:border-gray-700': 'dark:border-[var(--border-default)]',
  
  // Specific component colors
  'bg-green-500': 'bg-[var(--success)]',
  'bg-orange-500': 'bg-[var(--warning)]',
  'bg-gray-500': 'bg-[var(--text-muted)]',
  'hover:bg-black\\/5': 'hover:bg-[var(--overlay-medium)]',
  'hover:text-gray-900': 'hover:text-[var(--text-primary)]',
  'hover:text-white': 'hover:text-[var(--white-pure)]',
  'hover:text-gray-700': 'hover:text-[var(--text-primary)]',
  'hover:text-blue-700': 'hover:text-[var(--accent-hover)]',
  'hover:text-gray-300': 'hover:text-[var(--text-secondary)]',
  'dark:hover:text-white': 'dark:hover:text-[var(--text-primary)]',
  'dark:hover:text-gray-200': 'dark:hover:text-[var(--text-secondary)]',
  'dark:hover:text-blue-300': 'dark:hover:text-[var(--chart-blue)]',
  'dark:hover:text-purple-300': 'dark:hover:text-[var(--chart-purple)]',
  
  // Special cases
  'text-blue-600 dark:text-blue-400': 'text-[var(--chart-blue)] dark:text-[var(--chart-blue)]',
  'text-purple-600 dark:text-purple-400': 'text-[var(--chart-purple)] dark:text-[var(--chart-purple)]',
  'text-blue-700 dark:text-blue-300': 'text-[var(--accent-hover)] dark:text-[var(--chart-blue)]',
};

// Files to specifically target
const targetFiles = [
  'src/app/(Auth)/login/page.tsx',
  'src/app/(Auth)/register/page.tsx',
  'src/app/(Auth)/admin/login/page.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/card.tsx',
  'src/components/ui/badge.tsx',
  'src/components/ui/form-field.tsx',
  'src/components/ui/alert.tsx',
  'src/components/ui/alert-banner.tsx',
  'src/components/ui/error-banner.tsx',
  'src/components/ui/confirmation-dialog.tsx',
  'src/components/ui/toast.tsx',
  'src/components/ui/success-confirmation.tsx',
  'src/components/dashboard/stats-card.tsx',
  'src/components/dashboard/class-card.tsx',
  'src/components/dashboard/alert-card.tsx',
  'src/components/dashboard/quick-action-button.tsx',
  'src/components/teachers/teacher-list.tsx',
  'src/components/teachers/teacher-detail-view.tsx',
];

// Function to process a single file
function processFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply specific mappings
    for (const [oldClass, newClass] of Object.entries(specificMappings)) {
      const regex = new RegExp(oldClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      if (content.match(regex)) {
        content = content.replace(regex, newClass);
        modified = true;
        console.log(`  ✓ Replaced ${oldClass} with ${newClass}`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✓ Updated ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
console.log('🎨 Fixing remaining hardcoded colors in specific files...\n');

let totalModified = 0;

for (const file of targetFiles) {
  const fullPath = path.join(process.cwd(), file);
  console.log(`📄 Processing ${file}:`);
  if (processFile(fullPath)) {
    totalModified++;
  }
  console.log('');
}

// Also check for any remaining hex colors in these specific files
console.log('🔍 Checking for any remaining hex colors in target files...');

function hasHexColors(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const hexRegex = /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g;
    const matches = content.match(hexRegex);
    
    if (matches && matches.length > 0) {
      console.log(`  ⚠️  Found remaining hex colors in ${path.basename(filePath)}:`);
      matches.forEach(match => console.log(`    - ${match}`));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking ${filePath}:`, error.message);
    return false;
  }
}

let filesWithHexColors = 0;
for (const file of targetFiles) {
  const fullPath = path.join(process.cwd(), file);
  if (hasHexColors(fullPath)) {
    filesWithHexColors++;
  }
}

console.log(`\n✅ Complete! Modified ${totalModified} files.`);
if (filesWithHexColors > 0) {
  console.log(`⚠️  ${filesWithHexColors} files still contain hex colors that may need manual review.`);
} else {
  console.log(`🎉 No hex colors found in target files!`);
}

console.log('\n📋 Summary:');
console.log('- Tailwind color classes replaced with CSS custom properties');
console.log('- Auth pages (login/register) included in updates');
console.log('- UI components (buttons, cards, badges, etc.) updated');
console.log('- Theme consistency maintained across all color themes');