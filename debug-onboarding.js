/**
 * Debug script to test staff onboarding functionality
 * Run this in the browser console when logged in as a school admin
 */

console.log('=== Staff Onboarding Debug ===');

// Check if user is logged in and has the right role
fetch('/api/auth/session')
  .then(response => response.json())
  .then(session => {
    console.log('Current session:', session);
    
    if (!session?.user) {
      console.error('❌ No user session found');
      return;
    }
    
    if (session.user.role !== 'SCHOOL_ADMIN') {
      console.error('❌ User is not a SCHOOL_ADMIN, current role:', session.user.role);
      return;
    }
    
    if (!session.user.schoolId) {
      console.error('❌ No schoolId found in session');
      return;
    }
    
    console.log('✅ User session valid for onboarding');
    console.log('School ID:', session.user.schoolId);
    
    // Test the onboarding status API
    return fetch('/api/staff/onboarding/status');
  })
  .then(response => {
    if (!response) return;
    
    console.log('Onboarding API response status:', response.status);
    
    if (!response.ok) {
      console.error('❌ Onboarding API failed with status:', response.status);
      return response.text().then(text => {
        console.error('Error response:', text);
      });
    }
    
    return response.json();
  })
  .then(data => {
    if (!data) return;
    
    console.log('✅ Onboarding status data:', data);
    console.log('Is complete:', data.isComplete);
    console.log('Missing roles:', data.missingRoles);
    console.log('Registered staff:', data.registeredStaff);
    
    // Check if modal should show
    const hasRequiredMissingRoles = data.missingRoles.some(role => role.isRequired);
    const shouldShowModal = !data.isComplete && hasRequiredMissingRoles;
    
    console.log('Should show modal:', shouldShowModal);
    console.log('Required missing roles:', data.missingRoles.filter(role => role.isRequired));
  })
  .catch(error => {
    console.error('❌ Error testing onboarding:', error);
  });

// Check if the onboarding button exists in the DOM
setTimeout(() => {
  const onboardingButton = document.querySelector('button[title="Staff Onboarding"]');
  if (onboardingButton) {
    console.log('✅ Onboarding button found in DOM:', onboardingButton);
  } else {
    console.error('❌ Onboarding button not found in DOM');
  }
  
  // Check if the modal exists
  const modal = document.querySelector('[role="dialog"]');
  if (modal) {
    console.log('✅ Modal found in DOM:', modal);
  } else {
    console.log('ℹ️ No modal currently in DOM (this is normal if not open)');
  }
}, 1000);