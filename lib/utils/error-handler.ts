/**
 * Centralized error handling utilities
 * Provides consistent error messages and handling across the application
 */

import { logger } from "./logger"

export interface ApiError {
  message: string
  code?: string
  statusCode: number
  details?: Record<string, any>
}

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code?: string
  public readonly details?: Record<string, any>
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

// Common error types
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, "VALIDATION_ERROR", details)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR")
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "You don't have permission to perform this action") {
    super(message, 403, "AUTHORIZATION_ERROR")
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND")
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, "CONFLICT", details)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = "Rate limit exceeded. Please try again later.") {
    super(message, 429, "RATE_LIMIT_EXCEEDED")
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `External service (${service}) is currently unavailable. Please try again later.`,
      502,
      "EXTERNAL_SERVICE_ERROR",
      { service }
    )
  }
}

/**
 * Convert any error to a user-friendly message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message
  }

  if (error instanceof Error) {
    // Map common error messages to user-friendly versions
    const errorMessage = error.message.toLowerCase()

    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return "Network error. Please check your internet connection and try again."
    }

    if (errorMessage.includes("timeout")) {
      return "Request timed out. Please try again."
    }

    if (errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
      return "You need to be logged in to perform this action."
    }

    if (errorMessage.includes("forbidden") || errorMessage.includes("403")) {
      return "You don't have permission to perform this action."
    }

    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      return "The requested resource was not found."
    }

    if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
      return "Too many requests. Please wait a moment and try again."
    }

    if (errorMessage.includes("validation") || errorMessage.includes("invalid")) {
      return "Invalid input. Please check your data and try again."
    }

    // For development, show the actual error message
    if (process.env.NODE_ENV === "development") {
      return error.message
    }

    // Generic fallback for production
    return "An unexpected error occurred. Please try again later."
  }

  return "An unexpected error occurred. Please try again later."
}

/**
 * Handle API errors and return appropriate response
 */
export function handleApiError(error: unknown, context?: string): { statusCode: number; error: ApiError } {
  // Log the error
  if (error instanceof Error) {
    logger.error("API error occurred", { context }, error)
  } else {
    logger.error("Unknown error occurred", { context, data: { error: String(error) } })
  }

  // Handle known error types
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      },
    }
  }

  // Handle Supabase errors
  if (error && typeof error === "object" && "code" in error) {
    const supabaseError = error as { code: string; message: string; details?: string }
    
    if (supabaseError.code === "PGRST116") {
      return {
        statusCode: 404,
        error: {
          message: "Resource not found",
          code: "NOT_FOUND",
          statusCode: 404,
        },
      }
    }

    if (supabaseError.code === "23505") {
      return {
        statusCode: 409,
        error: {
          message: "A record with this information already exists",
          code: "DUPLICATE_ENTRY",
          statusCode: 409,
        },
      }
    }

    return {
      statusCode: 400,
      error: {
        message: supabaseError.message || "Database error occurred",
        code: supabaseError.code,
        statusCode: 400,
        details: supabaseError.details ? { details: supabaseError.details } : undefined,
      },
    }
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      statusCode: 500,
      error: {
        message: getUserFriendlyErrorMessage(error),
        statusCode: 500,
      },
    }
  }

  // Fallback for unknown errors
  return {
    statusCode: 500,
    error: {
      message: "An unexpected error occurred. Please try again later.",
      statusCode: 500,
    },
  }
}

/**
 * Extract error message from API response
 */
export async function extractApiErrorMessage(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get("content-type")
    
    if (contentType?.includes("application/json")) {
      const data = await response.json()
      return data.error?.message || data.error || data.message || `HTTP ${response.status} ${response.statusText}`
    }
    
    const text = await response.text()
    if (text) {
      // Try to parse as JSON even if content-type is wrong
      try {
        const json = JSON.parse(text)
        return json.error?.message || json.error || json.message || text.substring(0, 200)
      } catch {
        return text.substring(0, 200) || `HTTP ${response.status} ${response.statusText}`
      }
    }
    
    return `HTTP ${response.status} ${response.statusText}`
  } catch (error) {
    return `HTTP ${response.status} ${response.statusText}`
  }
}

/**
 * Create standardized error response for Next.js API routes
 */
export function createErrorResponse(error: unknown, context?: string): Response {
  const { statusCode, error: apiError } = handleApiError(error, context)
  return Response.json(apiError, { status: statusCode })
}

