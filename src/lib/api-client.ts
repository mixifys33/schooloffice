/**
 * API Client Utilities
 * Requirements: 21.3 - Display error message describing failure and suggesting retry
 * 
 * Provides a type-safe wrapper for fetch with automatic error handling
 */

/**
 * API Error response structure from server
 */
export interface ApiErrorResponse {
  status: number
  code: string
  message: string
  details?: Record<string, string[]>
}

/**
 * API request result - either success with data or error
 */
export type ApiResult<T> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: ApiErrorResponse }

/**
 * Request options for API calls
 */
export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
}

/**
 * Build URL with query parameters
 */
function buildUrl(url: string, params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return url
  
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.append(key, String(value))
    }
  }
  
  const queryString = searchParams.toString()
  if (!queryString) return url
  
  return `${url}${url.includes('?') ? '&' : '?'}${queryString}`
}

/**
 * Make an API request with automatic error handling
 * Requirements: 21.3 - Handle server errors gracefully
 * 
 * @example
 * ```ts
 * const result = await apiRequest<Student[]>('/api/students')
 * if (result.success) {
 *   console.log(result.data)
 * } else {
 *   console.error(result.error.message)
 * }
 * ```
 */
export async function apiRequest<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<ApiResult<T>> {
  const { body, params, ...fetchOptions } = options
  
  try {
    const response = await fetch(buildUrl(url, params), {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    // Handle non-OK responses
    if (!response.ok) {
      let errorData: ApiErrorResponse
      
      try {
        const json = await response.json()
        errorData = json.error || {
          status: response.status,
          code: getErrorCodeFromStatus(response.status),
          message: json.message || getDefaultErrorMessage(response.status),
        }
      } catch {
        // Response wasn't JSON
        errorData = {
          status: response.status,
          code: getErrorCodeFromStatus(response.status),
          message: getDefaultErrorMessage(response.status),
        }
      }
      
      return { success: false, error: errorData }
    }

    // Handle successful response
    const data = await response.json() as T
    return { success: true, data }
    
  } catch (err) {
    // Handle network errors
    console.error('API request failed:', err)
    return {
      success: false,
      error: {
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to server. Please check your connection.',
      },
    }
  }
}

/**
 * Get error code from HTTP status
 */
function getErrorCodeFromStatus(status: number): string {
  switch (status) {
    case 400: return 'BAD_REQUEST'
    case 401: return 'UNAUTHORIZED'
    case 403: return 'FORBIDDEN'
    case 404: return 'NOT_FOUND'
    case 409: return 'CONFLICT'
    case 429: return 'RATE_LIMITED'
    case 500: return 'INTERNAL_ERROR'
    case 503: return 'SERVICE_UNAVAILABLE'
    default: return 'UNKNOWN_ERROR'
  }
}

/**
 * Get default error message from HTTP status
 * Requirements: 21.3 - Display error message describing failure
 */
function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400: return 'Invalid request. Please check your input.'
    case 401: return 'Your session has expired. Please log in again.'
    case 403: return 'You do not have permission to perform this action.'
    case 404: return 'The requested resource was not found.'
    case 409: return 'This action conflicts with existing data.'
    case 429: return 'Too many requests. Please try again later.'
    case 500: return 'Something went wrong on our end. Please try again.'
    case 503: return 'Service temporarily unavailable. Please try again later.'
    default: return 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Convenience methods for common HTTP methods
 */
export const api = {
  /**
   * GET request
   */
  get: <T>(url: string, params?: Record<string, string | number | boolean | undefined>) =>
    apiRequest<T>(url, { method: 'GET', params }),

  /**
   * POST request
   */
  post: <T>(url: string, body?: unknown) =>
    apiRequest<T>(url, { method: 'POST', body }),

  /**
   * PUT request
   */
  put: <T>(url: string, body?: unknown) =>
    apiRequest<T>(url, { method: 'PUT', body }),

  /**
   * PATCH request
   */
  patch: <T>(url: string, body?: unknown) =>
    apiRequest<T>(url, { method: 'PATCH', body }),

  /**
   * DELETE request
   */
  delete: <T>(url: string) =>
    apiRequest<T>(url, { method: 'DELETE' }),
}

/**
 * Hook-friendly wrapper that throws on error (for use with React Query, SWR, etc.)
 * 
 * @example
 * ```ts
 * // With React Query
 * const { data } = useQuery({
 *   queryKey: ['students'],
 *   queryFn: () => apiRequestOrThrow<Student[]>('/api/students')
 * })
 * ```
 */
export async function apiRequestOrThrow<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const result = await apiRequest<T>(url, options)
  
  if (!result.success) {
    const error = new Error(result.error.message) as Error & { 
      status: number
      code: string
      details?: Record<string, string[]>
    }
    error.status = result.error.status
    error.code = result.error.code
    error.details = result.error.details
    throw error
  }
  
  return result.data
}

/**
 * Check if an error is an API error with specific code
 */
export function isApiErrorCode(error: unknown, code: string): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code === code
  }
  return false
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return isApiErrorCode(error, 'NETWORK_ERROR')
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  return isApiErrorCode(error, 'UNAUTHORIZED')
}

/**
 * Check if error is a permission error
 */
export function isPermissionError(error: unknown): boolean {
  return isApiErrorCode(error, 'FORBIDDEN')
}
