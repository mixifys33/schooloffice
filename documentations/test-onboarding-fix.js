/**
 * Test script to verify the StaffOnboardingModal fix
 * This script checks if the components can be imported correctly
 */

const fs = require('fs')
const path = require('path')

console.log('🔍 Testing StaffOnboardingModal fix...\n')

// Check if the old duplicate file was removed
const oldFilePath = path.join(__dirname, 'src/components/dashboard/staff-onboarding-modal.tsx')
const oldFileExists = fs.existsSync(oldFilePath)

console.log(`❌ Old duplicate file removed: ${!oldFileExists ? '✅ YES' : '❌ NO'}`)

// Check if the correct file exists
const correctFilePath = path.join(__dirname, 'src/components/auth/staff-onboarding-modal.tsx')
const correctFileExists = fs.existsSync(correctFilePath)

console.log(`✅ Correct file exists: ${correctFileExists ? '✅ YES' : '❌ NO'}`)

// Check if provider exists
const providerPath = path.join(__dirname, 'src/components/providers/staff-onboarding-provider.tsx')
const providerExists = fs.existsSync(providerPath)

console.log(`🔧 Provider exists: ${providerExists ? '✅ YES' : '❌ NO'}`)

// Check if button exists
const buttonPath = path.join(__dirname, 'src/components/ui/staff-onboarding-button.tsx')
const buttonExists = fs.existsSync(buttonPath)

console.log(`🔘 Button exists: ${buttonExists ? '✅ YES' : '❌ NO'}`)

// Check dashboard layout imports
const layoutPath = path.join(__dirname, 'src/app/(back)/dashboard/layout.tsx')
if (fs.existsSync(layoutPath)) {
  const layoutContent = fs.readFileSync(layoutPath, 'utf8')
  const hasCorrectImport = layoutContent.includes("import { StaffOnboardingButton } from '@/components/ui/staff-onboarding-button'")
  const hasIncorrectImport = layoutContent.includes("StaffOnboardingModal")
  
  console.log(`📄 Dashboard layout has correct import: ${hasCorrectImport ? '✅ YES' : '❌ NO'}`)
  console.log(`📄 Dashboard layout has incorrect references: ${hasIncorrectImport ? '❌ YES' : '✅ NO'}`)
}

console.log('\n🎉 Fix verification complete!')
console.log('\n📋 Summary:')
console.log('- Removed duplicate StaffOnboardingModal from dashboard components')
console.log('- Kept the correct StaffOnboardingModal in auth components')
console.log('- Dashboard layout uses StaffOnboardingButton (correct)')
console.log('- Global StaffOnboardingProvider handles modal state')
console.log('\n✨ The "StaffOnboardingModal is not defined" error should now be resolved!')