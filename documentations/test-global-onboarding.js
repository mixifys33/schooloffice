/**
 * Test script to verify global staff onboarding functionality
 * Run this in the browser console when logged in as a school admin
 */

console.log('🧪 Testing Global Staff Onboarding...');

// Test 1: Check if user is school admin
async function testUserRole() {
  try {
    const response = await fetch('/api/auth/session');
    const session = await response.json();
    
    console.log('1. User Role Check:');
    console.log('   Current role:', session?.user?.role);
    console.log('   Is School Admin:', session?.user?.role === 'SCHOOL_ADMIN');
    console.log('   School ID:', session?.user?.schoolId);
    
    return session?.user?.role === 'SCHOOL_ADMIN';
  } catch (error) {
    console.error('   ❌ Error checking user role:', error);
    return false;
  }
}

// Test 2: Check if onboarding button exists
function testButtonExists() {
  console.log('2. Button Existence Check:');
  
  const button = document.querySelector('button[title*="Staff Onboarding"]');
  if (button) {
    console.log('   ✅ Onboarding button found:', button);
    
    // Highlight the button
    button.style.outline = '3px solid lime';
    button.style.boxShadow = '0 0 10px lime';
    
    return button;
  } else {
    console.log('   ❌ Onboarding button not found');
    
    // Look for any UserCog icons
    const userCogButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
      btn.innerHTML.includes('UserCog') || btn.innerHTML.includes('user-cog')
    );
    
    if (userCogButtons.length > 0) {
      console.log('   🔍 Found potential onboarding buttons:', userCogButtons);
      userCogButtons.forEach(btn => {
        btn.style.outline = '2px solid orange';
      });
    }
    
    return null;
  }
}

// Test 3: Test button click
function testButtonClick(button) {
  if (!button) return false;
  
  console.log('3. Button Click Test:');
  
  try {
    // Click the button
    button.click();
    console.log('   ✅ Button clicked successfully');
    
    // Wait for modal to appear
    setTimeout(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        console.log('   ✅ Modal appeared:', modal);
        
        // Check modal content
        const modalText = modal.textContent.toLowerCase();
        if (modalText.includes('staff') && modalText.includes('onboarding')) {
          console.log('   ✅ Modal contains staff onboarding content');
        } else {
          console.log('   ⚠️ Modal might not be the staff onboarding modal');
          console.log('   Modal content preview:', modal.textContent.substring(0, 200));
        }
      } else {
        console.log('   ❌ Modal did not appear after button click');
        
        // Check if there are any error messages
        const errors = document.querySelectorAll('[role="alert"], .error, [class*="error"]');
        if (errors.length > 0) {
          console.log('   🔍 Found potential error messages:', errors);
        }
      }
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('   ❌ Error clicking button:', error);
    return false;
  }
}

// Test 4: Check onboarding API
async function testOnboardingAPI() {
  console.log('4. Onboarding API Test:');
  
  try {
    const response = await fetch('/api/staff/onboarding/status');
    
    if (!response.ok) {
      console.log('   ❌ API request failed:', response.status, response.statusText);
      return false;
    }
    
    const data = await response.json();
    console.log('   ✅ API response:', data);
    console.log('   Setup complete:', data.isComplete);
    console.log('   Missing roles:', data.missingRoles?.length || 0);
    console.log('   Registered staff:', data.registeredStaff?.length || 0);
    
    return true;
  } catch (error) {
    console.error('   ❌ API error:', error);
    return false;
  }
}

// Test 5: Check global provider
function testGlobalProvider() {
  console.log('5. Global Provider Test:');
  
  // Check if React DevTools can find the provider
  if (window.React) {
    console.log('   ✅ React is available');
  }
  
  // Check if the modal exists in DOM (even if hidden)
  const modals = document.querySelectorAll('[role="dialog"]');
  console.log('   Found modals in DOM:', modals.length);
  
  // Check for any staff onboarding related elements
  const onboardingElements = document.querySelectorAll('[class*="onboarding"], [id*="onboarding"]');
  console.log('   Found onboarding elements:', onboardingElements.length);
  
  return true;
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Global Onboarding Tests...\n');
  
  const isSchoolAdmin = await testUserRole();
  console.log('');
  
  if (!isSchoolAdmin) {
    console.log('❌ Cannot proceed - user is not a School Admin');
    return;
  }
  
  const button = testButtonExists();
  console.log('');
  
  await testOnboardingAPI();
  console.log('');
  
  testGlobalProvider();
  console.log('');
  
  if (button) {
    testButtonClick(button);
  }
  
  console.log('🏁 Tests completed! Check the results above.');
  console.log('💡 If the modal still doesn\'t appear, try refreshing the page.');
}

// Run the tests
runAllTests();