// Simple test to check if DOS API is working
// Run this with: node test-dos-api.js

const fetch = require('node-fetch');

async function testDosApi() {
  try {
    console.log('Testing DOS API...');
    
    // Test the simple test endpoint first
    const testResponse = await fetch('http://localhost:3000/api/dos/test');
    console.log('Test API Status:', testResponse.status);
    
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('Test API Response:', testData);
    } else {
      console.log('Test API failed:', await testResponse.text());
    }
    
    // Test the dashboard endpoint
    const dashboardResponse = await fetch('http://localhost:3000/api/dos/dashboard');
    console.log('Dashboard API Status:', dashboardResponse.status);
    
    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      console.log('Dashboard API Response:', JSON.stringify(dashboardData, null, 2));
    } else {
      console.log('Dashboard API failed:', await dashboardResponse.text());
    }
    
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testDosApi();