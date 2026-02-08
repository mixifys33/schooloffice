// Debug script to test DOS dashboard API
// Open browser console and paste this code to test

console.log('🔍 Testing DOS Dashboard API...');

// Test if we can reach the API
fetch('/api/dos/dashboard')
  .then(response => {
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      return response.json();
    } else {
      return response.text().then(text => {
        throw new Error(`API Error ${response.status}: ${text}`);
      });
    }
  })
  .then(data => {
    console.log('✅ DOS Dashboard API Response:', data);
    console.log('📊 Curriculum Status:', data.curriculumStatus);
    console.log('📊 Assessment Status:', data.assessmentStatus);
    console.log('📊 Exam Status:', data.examStatus);
    console.log('📊 Final Scores Status:', data.finalScoresStatus);
    console.log('📊 Report Card Status:', data.reportCardStatus);
    console.log('📊 Recent Activity:', data.recentActivity);
    console.log('📊 Alerts:', data.alerts);
  })
  .catch(error => {
    console.error('❌ DOS Dashboard API Error:', error);
  });

// Also test the simple test endpoint
fetch('/api/dos/test')
  .then(response => response.json())
  .then(data => {
    console.log('✅ DOS Test API Response:', data);
  })
  .catch(error => {
    console.error('❌ DOS Test API Error:', error);
  });