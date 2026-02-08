/**
 * Script to find remaining orange colors in the codebase
 * Run this in your browser console to highlight any remaining orange elements
 */

console.log('🔍 Searching for orange colors...');

// Function to highlight elements with orange colors
function highlightOrangeElements() {
  const orangeSelectors = [
    '[class*="orange"]',
    '[style*="orange"]',
    '[class*="bg-orange"]',
    '[class*="text-orange"]',
    '[class*="border-orange"]'
  ];
  
  let foundElements = [];
  
  orangeSelectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.outline = '3px solid red';
        el.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        foundElements.push({
          element: el,
          selector: selector,
          classes: el.className,
          styles: el.style.cssText
        });
      });
    } catch (e) {
      // Ignore invalid selectors
    }
  });
  
  // Also check computed styles for orange colors
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    const computed = window.getComputedStyle(el);
    const bgColor = computed.backgroundColor;
    const color = computed.color;
    const borderColor = computed.borderColor;
    
    if (bgColor.includes('255, 165, 0') || // orange
        bgColor.includes('255, 140, 0') || // darkorange
        color.includes('255, 165, 0') ||
        color.includes('255, 140, 0') ||
        borderColor.includes('255, 165, 0') ||
        borderColor.includes('255, 140, 0')) {
      
      el.style.outline = '3px solid blue';
      foundElements.push({
        element: el,
        selector: 'computed-orange',
        bgColor: bgColor,
        color: color,
        borderColor: borderColor
      });
    }
  });
  
  console.log(`Found ${foundElements.length} elements with orange colors:`, foundElements);
  
  if (foundElements.length === 0) {
    console.log('✅ No orange colors found!');
  } else {
    console.log('❌ Found orange colors that need fixing');
    foundElements.forEach((item, index) => {
      console.log(`${index + 1}. ${item.selector}:`, item.element);
    });
  }
  
  return foundElements;
}

// Function to remove highlights
function removeHighlights() {
  const highlighted = document.querySelectorAll('[style*="outline: 3px solid"]');
  highlighted.forEach(el => {
    el.style.outline = '';
    if (el.style.backgroundColor === 'rgba(255, 0, 0, 0.2)') {
      el.style.backgroundColor = '';
    }
  });
  console.log('Highlights removed');
}

// Function to check theme variables
function checkThemeVariables() {
  const root = document.documentElement;
  const computedStyle = window.getComputedStyle(root);
  
  const themeVars = [
    '--warning',
    '--warning-light', 
    '--warning-dark',
    '--danger',
    '--success',
    '--info',
    '--accent-primary'
  ];
  
  console.log('🎨 Current theme variables:');
  themeVars.forEach(varName => {
    const value = computedStyle.getPropertyValue(varName);
    console.log(`${varName}: ${value}`);
  });
}

// Run the checks
console.log('1. Checking theme variables...');
checkThemeVariables();

console.log('\n2. Looking for orange elements...');
const orangeElements = highlightOrangeElements();

console.log('\n3. Instructions:');
console.log('- Red outlines = elements with orange classes');
console.log('- Blue outlines = elements with computed orange colors');
console.log('- Run removeHighlights() to clear highlights');
console.log('- Check the console output for specific elements to fix');

// Export functions to global scope
window.removeHighlights = removeHighlights;
window.highlightOrangeElements = highlightOrangeElements;
window.checkThemeVariables = checkThemeVariables;