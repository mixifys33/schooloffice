/**
 * Test script for Super Admin API endpoints
 * Run with: node test-super-admin-api.js
 */

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

async function testSuperAdminAPI() {
  console.log('🧪 Testing Super Admin API endpoints...\n')

  try {
    // Test dashboard endpoint
    console.log('📊 Testing dashboard endpoint...')
    const dashboardResponse = await fetch(`${BASE_URL}/api/super-admin/dashboard?page=1&pageSize=10`)
    
    console.log(`Status: ${dashboardResponse.status}`)
    console.log(`Headers:`, Object.fromEntries(dashboardResponse.headers.entries()))
    
    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json()
      console.log('✅ Dashboard API working')
      console.log('Response structure:', {
        success: dashboardData.success,
        hasGlobalStats: !!dashboardData.data?.globalStats,
        hasSchools: !!dashboardData.data?.schools,
        hasPagination: !!dashboardData.data?.pagination,
        schoolCount: dashboardData.data?.schools?.length || 0
      })
    } else {
      const errorText = await dashboardResponse.text()
      console.log('❌ Dashboard API failed')
      console.log('Error:', errorText)
    }

    console.log('\n' + '='.repeat(50) + '\n')

    // Test schools endpoint
    console.log('🏫 Testing schools endpoint...')
    const schoolsResponse = await fetch(`${BASE_URL}/api/super-admin/schools?page=1&pageSize=10`)
    
    console.log(`Status: ${schoolsResponse.status}`)
    
    if (schoolsResponse.ok) {
      const schoolsData = await schoolsResponse.json()
      console.log('✅ Schools API working')
      console.log('Response structure:', {
        success: schoolsData.success,
        hasSchools: !!schoolsData.data?.schools,
        hasPagination: !!schoolsData.data?.pagination,
        hasFilters: !!schoolsData.data?.filters,
        schoolCount: schoolsData.data?.schools?.length || 0
      })
    } else {
      const errorText = await schoolsResponse.text()
      console.log('❌ Schools API failed')
      console.log('Error:', errorText)
    }

  } catch (error) {
    console.error('🚨 Test failed with error:', error.message)
  }
}

// Run the test
testSuperAdminAPI()