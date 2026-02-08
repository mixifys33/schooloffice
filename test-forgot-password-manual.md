# Manual Testing Guide for Forgot Password Flow

## Prerequisites

1. **Start the development server**: `npm run dev`
2. **Ensure database is running** and connected
3. **Check environment variables** are properly set (already verified ✅)

## Test Data

- **School Code**: `VALLEY` (or any existing school code in your database)
- **Test Email**: `admin@valley.com` (or any existing user email)
- **Test Phone**: Any phone number associated with a user

## Step-by-Step Testing

### 1. Access the Forgot Password Page

- Navigate to: `http://localhost:3000/forgot-password`
- **Expected**: Modern card-based UI with step indicator showing "Step 1 of 4"

### 2. Test Step 1 - Identify Account (20% progress)

- **Input School Code**: Enter `VALLEY`
- **Input Identifier**: Enter `admin@valley.com`
- **Click**: "Continue" button
- **Expected**:
  - Form validation works
  - Progress bar moves to 40%
  - Advances to method selection step

### 3. Test Step 2 - Choose Recovery Method (40% progress)

- **See Options**: Email, SMS, Contact Admin
- **Visual Check**: Icons, descriptions, radio button selection
- **Select Email**: Click on email option
- **Click**: "Send Code" button
- **Expected**:
  - Progress bar moves to 60%
  - Advances to verification step
  - Shows masked email address
  - Debug panel appears (development mode)

### 4. Test Step 3 - Verify Code (60% progress)

- **Check Console**: Look for verification code in server logs
- **Check Debug Panel**: Code should be visible in development
- **Input Code**: Enter the 6-digit code
- **Test Resend**: Wait for countdown, test resend functionality
- **Click**: "Verify Code" button
- **Expected**:
  - Progress bar moves to 80%
  - Advances to password reset step

### 5. Test Step 4 - Reset Password (80% progress)

- **Input New Password**: Try weak password first
- **Check Strength Meter**: Should show "Weak" with red color
- **Input Strong Password**: `NewPassword123!`
- **Check Strength Meter**: Should show "Strong" with green color
- **Confirm Password**: Enter same password
- **Click**: "Reset Password" button
- **Expected**:
  - Progress bar moves to 100%
  - Advances to success step

### 6. Test Step 5 - Success (100% progress)

- **Visual Check**: Success icon and message
- **Click**: "Continue to Login" button
- **Expected**: Redirects to login page

## Additional Tests

### Test SMS Method

1. Go back to method selection
2. Choose SMS option
3. Check server logs for SMS sending attempts
4. Note: In sandbox mode, SMS won't be delivered but code will be logged

### Test Admin Contact

1. Go back to method selection
2. Choose "Contact Administrator"
3. Should redirect to contact admin page with pre-filled info

### Test Error Scenarios

1. **Invalid School Code**: Should still proceed (security feature)
2. **Invalid Verification Code**: Should show error message
3. **Expired Code**: Test after 15 minutes
4. **Weak Password**: Should prevent submission
5. **Password Mismatch**: Should show error

### Test Mobile Responsiveness

1. Open browser dev tools
2. Switch to mobile view
3. Test all steps on mobile
4. Check touch targets are 44px minimum

## Expected Behaviors

### Security Features ✅

- No information leakage (same response for valid/invalid users)
- Masked contact information display
- Time-limited codes (15 minutes)
- Strong password requirements
- Rate limiting on resend (2 minutes)

### UI/UX Features ✅

- Step-by-step progress indicator
- Touch-friendly mobile design
- Real-time password strength validation
- Clear error messages
- Loading states and animations
- Dark mode support

### Technical Features ✅

- TypeScript type safety
- Proper error handling
- Development debug information
- Comprehensive logging
- Email and SMS integration

## Troubleshooting

### If Email Doesn't Send

- Check server console for detailed logs
- Verify SMTP credentials in .env
- Check debug panel for error details
- Email service will fall back to SendGrid if Gmail fails

### If SMS Doesn't Send

- Check Africa's Talking configuration
- Verify API key and username
- In sandbox mode, SMS won't be delivered (expected)
- Check server logs for SMS gateway responses

### If Database Errors Occur

- Ensure MongoDB is running
- Check database connection
- Verify user exists with the test email
- Check school code exists in database

## Success Criteria

The forgot password flow is working correctly if:

1. ✅ All 5 steps complete without errors
2. ✅ UI is responsive and accessible
3. ✅ Email/SMS codes are generated and logged
4. ✅ Password strength validation works
5. ✅ Security features prevent information leakage
6. ✅ Error handling works for edge cases
7. ✅ Mobile experience is touch-friendly
8. ✅ Debug information is available in development

## Performance Expectations

- Page loads in < 2 seconds
- Step transitions are smooth (< 300ms)
- Form validation is instant
- API responses in < 5 seconds
- No console errors or warnings
