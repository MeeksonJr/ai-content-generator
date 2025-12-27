/**
 * Rate Limiting Utility
 * 
 * Implements time-based rate limiting (throttling) for API requests.
 * Works alongside monthly usage quotas to provide both short-term and long-term limits.
 */

import { createServerSupabaseClient } from "@/lib/supabase/server-client"
import { logger } from "@/lib/utils/logger"
import { RateLimitError } from "@/lib/utils/error-handler"

export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number
  /** Time window in seconds (e.g., 60 for per-minute, 3600 for per-hour) */
  windowSeconds: number
  /** Plan type for this limit */
  planType: string
}

// Default rate limits per plan type
const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    maxRequests: 10,
    windowSeconds: 60, // 10 requests per minute
    planType: "free",
  },
  basic: {
    maxRequests: 30,
    windowSeconds: 60, // 30 requests per minute
    planType: "basic",
  },
  professional: {
    maxRequests: 100,
    windowSeconds: 60, // 100 requests per minute
    planType: "professional",
  },
  enterprise: {
    maxRequests: 500,
    windowSeconds: 60, // 500 requests per minute
    planType: "enterprise",
  },
}

// Per-hour limits (more lenient)
const HOURLY_RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    maxRequests: 100,
    windowSeconds: 3600, // 100 requests per hour
    planType: "free",
  },
  basic: {
    maxRequests: 500,
    windowSeconds: 3600, // 500 requests per hour
    planType: "basic",
  },
  professional: {
    maxRequests: 2000,
    windowSeconds: 3600, // 2000 requests per hour
    planType: "professional",
  },
  enterprise: {
    maxRequests: 10000,
    windowSeconds: 3600, // 10000 requests per hour
    planType: "enterprise",
  },
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Number of requests remaining in the current window */
  remaining: number
  /** When the current window resets (Unix timestamp) */
  resetAt: number
  /** Total limit for the window */
  limit: number
}

/**
 * Check and enforce rate limit for a user
 * 
 * @param userId - User ID to check rate limit for
 * @param planType - User's plan type
 * @param identifier - Optional identifier (e.g., API key ID) for per-key limiting
 * @param windowType - 'minute' or 'hour' for different rate limit windows
 * @returns Rate limit result with remaining requests and reset time
 */
export async function checkRateLimit(
  userId: string,
  planType: string = "free",
  identifier?: string,
  windowType: "minute" | "hour" = "minute"
): Promise<RateLimitResult> {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get rate limit config for the plan
    const limits = windowType === "minute" ? DEFAULT_RATE_LIMITS : HOURLY_RATE_LIMITS
    const config = limits[planType] || limits.free
    
    // Create a unique identifier for this rate limit check
    // Use API key ID if provided, otherwise use user ID
    const rateLimitKey = identifier ? `api_key:${identifier}` : `user:${userId}`
    
    // Calculate window start time
    const now = Math.floor(Date.now() / 1000) // Current time in seconds
    const windowStart = Math.floor(now / config.windowSeconds) * config.windowSeconds
    
    // Check if we have a rate limit record in the database
    // We'll use a simple in-memory cache for now, but could use Redis in production
    // For now, we'll track in a database table or use a simple approach
    
    // Get or create rate limit tracking record
    const trackingKey = `${rateLimitKey}:${windowStart}:${config.windowSeconds}`
    
    // Check existing requests in this window
    // For simplicity, we'll use a database table to track rate limits
    // In production, you might want to use Redis for better performance
    
    // Try to get existing rate limit record
    // @ts-ignore - rate_limits table exists but types may not be generated yet
    const { data: existingRecord, error: fetchError } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("identifier", trackingKey)
      .eq("window_start", windowStart)
      .maybeSingle()
    
    if (fetchError && fetchError.code !== "PGRST116") {
      logger.error("Error fetching rate limit", {
        context: "RateLimiter",
        data: { userId, planType, identifier, error: fetchError },
      })
      // On error, allow the request (fail open)
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt: windowStart + config.windowSeconds,
        limit: config.maxRequests,
      }
    }
    
    const record = existingRecord as any
    const currentCount = record?.request_count || 0
    
    // Check if limit exceeded
    if (currentCount >= config.maxRequests) {
      const resetAt = windowStart + config.windowSeconds
      
      logger.warn("Rate limit exceeded", {
        context: "RateLimiter",
        data: { userId, planType, identifier, currentCount, limit: config.maxRequests, resetAt },
      })
      
      throw new RateLimitError(
        `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${windowType}. Please try again after ${new Date(resetAt * 1000).toISOString()}`
      )
    }
    
    // Increment request count
    if (record) {
      // Update existing record
      const updateData: any = {
        request_count: currentCount + 1,
        last_request_at: new Date().toISOString(),
      }
      // @ts-ignore - rate_limits table exists but types may not be generated yet
      const { error: updateError } = (supabase as any)
        .from("rate_limits")
        .update(updateData)
        .eq("id", (record as any).id)
      
      if (updateError) {
        logger.error("Error updating rate limit", {
          context: "RateLimiter",
          data: { userId, error: updateError },
        })
      }
    } else {
      // Create new record
      // @ts-ignore - rate_limits table exists but types may not be generated yet
      const { error: insertError } = await supabase
        .from("rate_limits")
        .insert({
          identifier: trackingKey,
          user_id: userId,
          window_start: windowStart,
          window_seconds: config.windowSeconds,
          request_count: 1,
          last_request_at: new Date().toISOString(),
        } as any)
      
      if (insertError) {
        logger.error("Error creating rate limit record", {
          context: "RateLimiter",
          data: { userId, error: insertError },
        })
      }
    }
    
    const remaining = config.maxRequests - (currentCount + 1)
    const resetAt = windowStart + config.windowSeconds
    
    return {
      allowed: true,
      remaining: Math.max(0, remaining),
      resetAt,
      limit: config.maxRequests,
    }
  } catch (error) {
    // If it's a RateLimitError, re-throw it
    if (error instanceof RateLimitError) {
      throw error
    }
    
    // For other errors, log and allow the request (fail open)
    logger.error("Rate limit check error", {
      context: "RateLimiter",
      data: { userId, planType, identifier },
    }, error as Error)
    
    // Fail open - allow the request if rate limiting fails
    return {
      allowed: true,
      remaining: 999,
      resetAt: Math.floor(Date.now() / 1000) + 60,
      limit: 1000,
    }
  }
}

/**
 * Get rate limit headers for API responses
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.resetAt.toString(),
  }
}

/**
 * Clean up old rate limit records (should be run periodically)
 */
export async function cleanupRateLimits(): Promise<void> {
  try {
    const supabase = createServerSupabaseClient()
    const now = Math.floor(Date.now() / 1000)
    
    // Delete records older than 24 hours
    const cutoffTime = now - 86400 // 24 hours ago
    
    // @ts-ignore - rate_limits table exists but types may not be generated yet
    const { error } = await supabase
      .from("rate_limits")
      .delete()
      .lt("window_start", cutoffTime)
    
    if (error) {
      logger.error("Error cleaning up rate limits", {
        context: "RateLimiter",
        data: { error },
      })
    } else {
      logger.info("Rate limits cleaned up", {
        context: "RateLimiter",
        data: { cutoffTime },
      })
    }
  } catch (error) {
    logger.error("Rate limit cleanup error", {
      context: "RateLimiter",
    }, error as Error)
  }
}

