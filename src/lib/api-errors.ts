/**
 * API Error Handling Utilities
 * Requirements: 21.3 - Display error message describing failure and suggesting retry
 * Requirements: 22.5 - Return HTTP 401 for unauthenticated requests
 * Requirements: 22.6 - Return HTTP 403 for unauthorized requests
 */

/**
 * Custom API Error class for server-side error handling
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ApiError'
  }

  /**
   * Convert to JSON response format
   */
  toJSON() {
    return {
      error: {
        status: this.status,
        code: this.code,
        message: this.message,
        details: this.details,
      }
    }
  }
}

/**
 * Standard error factory functions
 * Requirements: 22.5, 22.6 - Return appropriate HTTP status codes
 */
export const Errors = {
  /**
   * 401 Unauthorized - No valid authentication
   * Requirements: 22.5 - Return HTTP 401 for unauthenticated requests
   */
  Unauthorized: (message = 'Authentication required') =>
    new ApiError(401, 'UNAUTHORIZED', message),

  /**
   * 403 Forbidden - Authenticated but insufficient permissions
   * Requirements: 22.6 - Return HTTP 403 for unauthorized requests
   */
  Forbidden: (message = 'Insufficient permissions') =>
    new ApiError(403, 'FORBIDDEN', message),

  /**
   * 404 Not Found - Resource doesn't exist
   */
  NotFound: (resource: string) =>
    new ApiError(404, 'NOT_FOUND', `${resource} not found`),

  /**
   * 400 Bad Request - Validation failed
   */
  ValidationError: (details: Record<string, string[]>, message = 'Validation failed') =>
    new ApiError(400, 'VALIDATION_ERROR', message, details),

  /**
   * 400 Bad Request - Invalid input
   */
  BadRequest: (message: string) =>
    new ApiError(400, 'BAD_REQUEST', message),

  /**
   * 403 Subscription Expired
   */
  SubscriptionExpired: () =>
    new ApiError(403, 'SUBSCRIPTION_EXPIRED', 'School subscription has expired. Please contact support.'),

  /**
   * 403 School Suspended
   */
  SchoolSuspended: () =>
    new ApiError(403, 'SCHOOL_SUSPENDED', 'Account suspended. Please contact support.'),

  /**
   * 403 Student Unpaid - Cannot perform action for unpaid student
   */
  StudentUnpaid: () =>
    new ApiError(403, 'STUDENT_UNPAID', 'Cannot perform this action - student fees are unpaid'),

  /**
   * 403 Pilot Limit Reached
   */
  PilotLimitReached: (limit: 'student' | 'sms') =>
    new ApiError(403, 'PILOT_LIMIT_REACHED', `Pilot ${limit} limit reached. Upgrade to continue.`),

  /**
   * 409 Conflict - Resource already exists
   */
  Conflict: (message: string) =>
    new ApiError(409, 'CONFLICT', message),

  /**
   * 429 Too Many Requests - Rate limited
   */
  RateLimited: (message = 'Too many requests. Please try again later.') =>
    new ApiError(429, 'RATE_LIMITED', message),

  /**
   * 500 Internal Server Error
   */
  InternalError: (message = 'An unexpected error occurred. Please try again.') =>
    new ApiError(500, 'INTERNAL_ERROR', message),

  /**
   * 503 Service Unavailable
   */
  ServiceUnavailable: (message = 'Service temporarily unavailable. Please try again later.') =>
    new ApiError(503, 'SERVICE_UNAVAILABLE', message),
}

/**
 * Check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Create a JSON response from an ApiError
 */
export function errorResponse(error: ApiError): Response {
  return Response.json(error.toJSON(), { status: error.status })
}

/**
 * Handle unknown errors and convert to ApiError
 */
export function handleError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error
  }

  if (error instanceof Error) {
    // Log the actual error for debugging
    console.error('Unhandled error:', error)
    return Errors.InternalError()
  }

  console.error('Unknown error:', error)
  return Errors.InternalError()
}

/**
 * Wrapper for API route handlers with error handling
 * 
 * @example
 * ```ts
 * export const GET = withErrorHandling(async (request) => {
 *   const data = await fetchData()
 *   return Response.json(data)
 * })
 * ```
 */
export function withErrorHandling(
  handler: (request: Request, context?: { params: Record<string, string> }) => Promise<Response>
) {
  return async (request: Request, context?: { params: Record<string, string> }): Promise<Response> => {
    try {
      return await handler(request, context)
    } catch (error) {
      const apiError = handleError(error)
      return errorResponse(apiError)
    }
  }
}

/**
 * Validate request body and throw ValidationError if invalid
 */
export function validateRequestBody<T>(
  body: unknown,
  validator: (data: unknown) => { isValid: boolean; errors: Record<string, string[]> }
): T {
  const result = validator(body)
  if (!result.isValid) {
    throw Errors.ValidationError(result.errors)
  }
  return body as T
}

/**
 * Assert condition or throw error
 */
export function assertOrThrow(condition: boolean, error: ApiError): asserts condition {
  if (!condition) {
    throw error
  }
}

/**
 * Assert resource exists or throw NotFound
 */
export function assertExists<T>(
  resource: T | null | undefined,
  resourceName: string
): asserts resource is T {
  if (resource === null || resource === undefined) {
    throw Errors.NotFound(resourceName)
  }
}
