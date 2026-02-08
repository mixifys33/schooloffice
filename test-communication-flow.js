/**
 * Test Communication Flow
 * This script tests the complete communication flow to identify issues
 */

const testCommunicationFlow = async () => {
  console.log('🔍 Testing Communication Flow...\n')

  // Test 1: Environment Variables
  console.log('1. 📋 Environment Variables Check:')
  const requiredEnvVars = [
    'AFRICASTALKING_API_KEY',
    'AFRICASTALKING_USERNAME', 
    'AFRICASTALKING_ENVIRONMENT',
    'SENDGRID_API_KEY',
    'EMAIL_FROM',
    'DATABASE_URL'
  ]

  requiredEnvVars.forEach(varName => {
    const value = process.env[varName]
    console.log(`   ${varName}: ${value ? '✅ Set' : '❌ Missing'}`)
    if (v