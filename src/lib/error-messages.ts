/**
 * User-Friendly Error Messages
 * 
 * Centralized error message handling to provide clear, actionable feedback to users
 */

export interface UserError {
  message: string
  field?: string
  code?: string
}

/**
 * Convert technical errors to user-friendly messages
 */
export function getUserFriendlyError(error: any): UserError {
  const errorMessage = error?.message || error?.toString() || 'An unexpected error occurred'
  
  // Database constraint violations
  if (errorMessage.includes('Unique constraint')) {
    if (errorMessage.includes('User_schoolId_email_key')) {
      return {
        message: 'A user with this email address already exists in your school.',
        field: 'email',
        code: 'EMAIL_EXISTS'
      }
    }
    
    if (errorMessage.includes('User_schoolId_phone_key')) {
      return {
        message: 'A user with this phone number already exists in your school.',
        field: 'phone',
        code: 'PHONE_EXISTS'
      }
    }
    
    if (errorMessage.includes('User_schoolId_username_key')) {
      return {
        message: 'A user with this username already exists. Please try a different name combination.',
        field: 'username',
        code: 'USERNAME_EXISTS'
      }
    }
    
    if (errorMessage.includes('Staff_schoolId_employeeNumber_key')) {
      return {
        message: 'This employee number is already in use. Please choose a different one.',
        field: 'employeeNumber',
        code: 'EMPLOYEE_NUMBER_EXISTS'
      }
    }
    
    if (errorMessage.includes('School_code_key')) {
      return {
        message: 'This school code is already taken. Please choose a different one.',
        field: 'schoolCode',
        code: 'SCHOOL_CODE_EXISTS'
      }
    }
    
    // Generic unique constraint
    return {
      message: 'This information is already in use. Please check your entries and try again.',
      code: 'DUPLICATE_DATA'
    }
  }
  
  // Validation errors
  if (errorMessage.includes('User with this email or phone already exists')) {
    return {
      message: 'A staff member with this email or phone number already exists in your school.',
      code: 'USER_EXISTS'
    }
  }
  
  if (errorMessage.includes('School not found')) {
    return {
      message: 'School information could not be found. Please contact support.',
      code: 'SCHOOL_NOT_FOUND'
    }
  }
  
  if (errorMessage.includes('Teacher not found')) {
    return {
      message: 'The teacher you are looking for could not be found.',
      code: 'TEACHER_NOT_FOUND'
    }
  }
  
  if (errorMessage.includes('Staff not found')) {
    return {
      message: 'The staff member you are looking for could not be found.',
      code: 'STAFF_NOT_FOUND'
    }
  }
  
  // Authentication errors
  if (errorMessage.includes('Invalid credentials')) {
    return {
      message: 'The email or password you entered is incorrect. Please try again.',
      code: 'INVALID_CREDENTIALS'
    }
  }
  
  if (errorMessage.includes('Account locked')) {
    return {
      message: 'Your account has been temporarily locked due to multiple failed login attempts. Please try again later.',
      code: 'ACCOUNT_LOCKED'
    }
  }
  
  // Permission errors
  if (errorMessage.includes('Insufficient permissions') || errorMessage.includes('Access denied')) {
    return {
      message: 'You do not have permission to perform this action.',
      code: 'ACCESS_DENIED'
    }
  }
  
  // Network/Connection errors
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Network error')) {
    return {
      message: 'Unable to connect to the server. Please check your internet connection and try again.',
      code: 'CONNECTION_ERROR'
    }
  }
  
  // File upload errors
  if (errorMessage.includes('File too large')) {
    return {
      message: 'The file you are trying to upload is too large. Please choose a smaller file.',
      field: 'file',
      code: 'FILE_TOO_LARGE'
    }
  }
  
  if (errorMessage.includes('Invalid file type')) {
    return {
      message: 'The file type you are trying to upload is not supported. Please choose a different file.',
      field: 'file',
      code: 'INVALID_FILE_TYPE'
    }
  }
  
  // SMS/Communication errors
  if (errorMessage.includes('SMS limit exceeded')) {
    return {
      message: 'You have reached your SMS limit for this term. Please contact your administrator.',
      code: 'SMS_LIMIT_EXCEEDED'
    }
  }
  
  if (errorMessage.includes('Invalid phone number')) {
    return {
      message: 'The phone number format is invalid. Please enter a valid phone number.',
      field: 'phone',
      code: 'INVALID_PHONE'
    }
  }
  
  // Payment errors
  if (errorMessage.includes('Payment failed')) {
    return {
      message: 'Payment could not be processed. Please check your payment details and try again.',
      code: 'PAYMENT_FAILED'
    }
  }
  
  // Data validation errors
  if (errorMessage.includes('Required field')) {
    return {
      message: 'Please fill in all required fields before continuing.',
      code: 'REQUIRED_FIELDS'
    }
  }
  
  if (errorMessage.includes('Invalid email')) {
    return {
      message: 'Please enter a valid email address.',
      field: 'email',
      code: 'INVALID_EMAIL'
    }
  }
  
  if (errorMessage.includes('Password too weak')) {
    return {
      message: 'Password must be at least 8 characters long and include letters, numbers, and special characters.',
      field: 'password',
      code: 'WEAK_PASSWORD'
    }
  }
  
  // Generic fallback for unknown errors
  if (errorMessage.includes('Internal server error') || errorMessage.includes('500')) {
    return {
      message: 'Something went wrong on our end. Please try again in a few moments.',
      code: 'SERVER_ERROR'
    }
  }
  
  // If we can't categorize the error, provide a generic but helpful message
  return {
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    code: 'UNKNOWN_ERROR'
  }
}

/**
 * Format error for API responses
 */
export function formatApiError(error: any): { error: string; field?: string; code?: string } {
  const userError = getUserFriendlyError(error)
  return {
    error: userError.message,
    field: userError.field,
    code: userError.code
  }
}

/**
 * Common success messages
 */
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User account created successfully.',
  STAFF_REGISTERED: 'Staff member registered successfully.',
  TEACHER_REGISTERED: 'Teacher registered successfully.',
  SCHOOL_REGISTERED: 'School registered successfully.',
  PASSWORD_RESET: 'Password reset successfully.',
  DATA_SAVED: 'Information saved successfully.',
  DATA_UPDATED: 'Information updated successfully.',
  DATA_DELETED: 'Information deleted successfully.',
  EMAIL_SENT: 'Email sent successfully.',
  SMS_SENT: 'SMS sent successfully.',
  FILE_UPLOADED: 'File uploaded successfully.',
  PAYMENT_PROCESSED: 'Payment processed successfully.',
} as const