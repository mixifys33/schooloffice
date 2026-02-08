/**
 * Test script to verify staff onboarding modal functionality
 * Run this in the browser console when logged in as a school admin
 */

console.log('=== Testing Staff Onboarding Modal ===');

// Function to test the onboarding button click
function testOnboardingButton() {
  const button = document.querySelector('button[title="Staff Onboarding"]');
  
  if (!button) {
    console.error('❌ Onboarding button not found in DOM');
    console.log('Available buttons with titles:', 
      Array.from(document.querySelectorAll('button[title]')).map(b => b.title)
    );
    return false;
  }
  
  console.log('✅ Onboarding button found:', button);
  
  // Test click
  try {
    button.click();
    console.log('✅ Button clicked successfully');
    
    // Check if modal appears
    setTimeout(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (modal) {
        console.log('✅ Modal appeared in DOM:', modal);
        
        // Check modal content
        const title = modal.querySelector('h1, h2, h3');
        if (title) {
          console.log('✅ Modal title found:', title.textContent);
        }
        
        // Check if it's the staff onboarding modal
        const staffText = modal.textContent.toLowerCase();
        if (staffText.includes('staff') && staffText.includes('onboarding')) {
          console.log('✅ Staff onboarding modal confirmed');
        } else {
          console.log('⚠️ Modal might not be the staff onboarding modal');
          console.log('Modal content preview:', modal.textContent.substring(0, 200));
        }
      } else {
        console.error('❌ Modal did not appear after button click');
      }
    }, 500);
    
    return true;
  } catch (error) {
    console.error('❌ Error clicking button:', error);
    return false;
  }
}

// Function to check user session and permissions
async function checkUserPermissions() {
  try {
    const response = await fetch('/api/auth/session');
    const session = await response.json();
    
    console.log('Current session:', session);
    
    if (!session?.user) {
      console.error('❌ No user session');
      return false;
    }
    
    if (session.user.role !== 'SCHOOL_ADMIN') {
      console.error('❌ User is not SCHOOL_ADMIN, current role:', session.user.role);
      return false;
    }
    
    if (!session.user.schoolId) {
      console.error('❌ No schoolId in session');
      return false;
    }
    
    console.log('✅ User has correct permissions');
    return true;
  } catch (error) {
    console.error('❌ Error checking session:', error);
    return false;
  }
}

// Function to test the onboarding API
async function testOnboardingAPI() {
  try {
    const response = await fetch('/api/staff/onboarding/status');
    
    if (!response.ok) {
      console.error('❌ API request failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ API response:', data);
    
    const shouldShowModal = !data.isComplete && data.missingRoles.some(role => role.isRequired);
    console.log('Should show modal automatically:', shouldShowModal);
    
    return true;
  } catch (error) {
    console.error('❌ Error testing API:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('Starting comprehensive onboarding test...\n');
  
  const permissionsOk = await checkUserPermissions();
  if (!permissionsOk) {
    console.log('❌ Cannot proceed - user permissions issue');
    return;
  }
  
  const apiOk = await testOnboardingAPI();
  if (!apiOk) {
    console.log('❌ Cannot proceed - API issue');
    return;
  }
  
  // Wait a bit for the page to fully load
  setTimeout(() => {
    const buttonOk = testOnboardingButton();
    if (buttonOk) {
      console.log('✅ All tests passed! Onboarding should be working.');
    } else {
      console.log('❌ Button test failed');
    }
  }, 1000);
}

// Run the tests
runAllTests();