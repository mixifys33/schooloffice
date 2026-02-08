/**
 * Quick script to find and highlight the staff onboarding button
 * Copy and paste this into your browser console
 */

console.log('🔍 Looking for Staff Onboarding Button...');

// Function to highlight an element
function highlightElement(element, color = 'red') {
  element.style.border = `3px solid ${color}`;
  element.style.boxShadow = `0 0 10px ${color}`;
  element.style.zIndex = '9999';
  element.style.position = 'relative';
}

// Function to create a floating indicator
function createIndicator(element, text) {
  const indicator = document.createElement('div');
  indicator.innerHTML = text;
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ef4444;
    color: white;
    padding: 10px 15px;
    border-radius: 8px;
    font-weight: bold;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: pulse 2s infinite;
  `;
  document.body.appendChild(indicator);
  
  // Remove after 10 seconds
  setTimeout(() => {
    if (indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }, 10000);
}

// Look for the button by different selectors
const selectors = [
  'button[title*="Staff Onboarding"]',
  'button[title*="onboarding"]',
  'button:has(svg):has([class*="UserCog"])',
  '[title*="Staff Onboarding"]'
];

let buttonFound = false;

for (const selector of selectors) {
  try {
    const button = document.querySelector(selector);
    if (button) {
      console.log('✅ Found onboarding button with selector:', selector);
      console.log('Button element:', button);
      
      highlightElement(button, '#fbbf24');
      createIndicator(button, '👆 Staff Onboarding Button Found!');
      
      // Scroll to button
      button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      buttonFound = true;
      break;
    }
  } catch (e) {
    // Ignore selector errors
  }
}

if (!buttonFound) {
  console.log('❌ Button not found with standard selectors, trying broader search...');
  
  // Look for buttons with UserCog icon or similar
  const allButtons = document.querySelectorAll('button');
  for (const button of allButtons) {
    const hasUserCogIcon = button.innerHTML.includes('UserCog') || 
                          button.innerHTML.includes('user-cog') ||
                          button.title?.toLowerCase().includes('onboarding') ||
                          button.title?.toLowerCase().includes('staff');
    
    if (hasUserCogIcon) {
      console.log('✅ Found potential onboarding button:', button);
      highlightElement(button, '#10b981');
      createIndicator(button, '🤔 Possible Onboarding Button');
      buttonFound = true;
      break;
    }
  }
}

if (!buttonFound) {
  console.log('❌ No onboarding button found. Checking user permissions...');
  
  // Check session
  fetch('/api/auth/session')
    .then(r => r.json())
    .then(session => {
      console.log('Current session:', session);
      
      if (!session?.user) {
        console.log('❌ Not logged in');
        createIndicator(null, '❌ Please log in first');
      } else if (session.user.role !== 'SCHOOL_ADMIN') {
        console.log('❌ Not a School Admin. Current role:', session.user.role);
        createIndicator(null, `❌ Need SCHOOL_ADMIN role (current: ${session.user.role})`);
      } else {
        console.log('✅ User has correct permissions');
        createIndicator(null, '🔄 Button should be visible - try refreshing page');
        
        // Check if we're on the right page
        if (!window.location.pathname.includes('/dashboard')) {
          console.log('💡 Try navigating to /dashboard/school-admin');
          createIndicator(null, '💡 Navigate to Dashboard page');
        }
      }
    })
    .catch(err => {
      console.error('Error checking session:', err);
      createIndicator(null, '❌ Error checking permissions');
    });
}

// Also check for the dashboard banner
setTimeout(() => {
  const banner = document.querySelector('[class*="amber"]:has([class*="AlertTriangle"])');
  if (banner) {
    console.log('✅ Found onboarding banner on dashboard');
    highlightElement(banner, '#10b981');
    createIndicator(banner, '📢 Onboarding Banner Found!');
  }
}, 1000);