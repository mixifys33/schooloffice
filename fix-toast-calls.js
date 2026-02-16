const fs = require('fs');

const filePath = 'src/components/settings/enhanced-academic-settings.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all showToast calls with toast calls
content = content.replace(/showToast\(\{\s*type:\s*'error',\s*message:\s*([^\}]+)\s*\}\);/g, 
  "toast({ title: 'Error', description: $1, variant: 'destructive' });");

content = content.replace(/showToast\(\{\s*type:\s*'success',\s*message:\s*([^\}]+)\s*\}\);/g, 
  "toast({ title: 'Success', description: $1, variant: 'success' });");

content = content.replace(/showToast\(\{\s*type:\s*'warning',\s*message:\s*([^\}]+)\s*\}\);/g, 
  "toast({ title: 'Warning', description: $1, variant: 'default' });");

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed all showToast calls in enhanced-academic-settings.tsx');
