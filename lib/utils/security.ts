/**
 * Security utilities for API routes
 * CORS, rate limiting helpers, and security headers
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export interface CorsOptions {
  origin?: string | string[] | boolean
  methods?: string[]
  allowedHeaders?: string[]
  credentials?: boolean
  maxAge?: number
}

/**
 * Creates CORS headers based on configuration
 */
export function createCorsHeaders(options: CorsOptions = {}): Record<string, string> {
  const {
    origin = process.env.NEXT_PUBLIC_APP_URL || "*",
    methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders = ["Content-Type", "Authorization"],
    credentials = true,
    maxAge = 86400, // 24 hours
  } = options

  const headers: Record<string, string> = {}

  // Handle origin
  if (origin === true) {
    headers["Access-Control-Allow-Origin"] = "*"
  } else if (typeof origin === "string") {
    headers["Access-Control-Allow-Origin"] = origin
  } else if (Array.isArray(origin)) {
    // In production, you'd check the request origin against this list
    headers["Access-Control-Allow-Origin"] = origin[0] || "*"
  }

  // Methods
  headers["Access-Control-Allow-Methods"] = methods.join(", ")

  // Headers
  headers["Access-Control-Allow-Headers"] = allowedHeaders.join(", ")

  // Credentials
  if (credentials && origin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true"
  }

  // Max age
  headers["Access-Control-Max-Age"] = maxAge.toString()

  return headers
}

/**
 * Creates security headers for API responses
 */
export function createSecurityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    // Only add CSP in production if needed
    ...(process.env.NODE_ENV === "production"
      ? {
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
        }
      : {}),
  }
}

/**
 * Creates a secure API response with CORS and security headers
 */
export function createSecureResponse(
  data: unknown,
  status = 200,
  corsOptions?: CorsOptions
): NextResponse {
  const response = NextResponse.json(data, { status })

  // Add CORS headers
  const corsHeaders = createCorsHeaders(corsOptions)
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Add security headers
  const securityHeaders = createSecurityHeaders()
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

/**
 * Validates request origin for CORS
 */
export function validateOrigin(request: NextRequest, allowedOrigins: string[]): boolean {
  const origin = request.headers.get("origin")

  if (!origin) {
    return false
  }

  // In development, allow localhost
  if (process.env.NODE_ENV === "development") {
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return true
    }
  }

  return allowedOrigins.includes(origin)
}

/**
 * Handles preflight OPTIONS request
 */
export function handlePreflight(request: NextRequest, corsOptions?: CorsOptions): NextResponse | null {
  if (request.method === "OPTIONS") {
    const headers = createCorsHeaders(corsOptions)
    return new NextResponse(null, { status: 204, headers })
  }
  return null
}

