/**
 * Redis Cache Utilities
 * Provides caching layer using Upstash Redis for improved performance
 */

import { Redis } from "@upstash/redis"

// Initialize Redis client (will be undefined if env vars not set)
let redis: Redis | null = null

try {
  const upstashRedisRestUrl = process.env.UPSTASH_REDIS_REST_URL
  const upstashRedisRestToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (upstashRedisRestUrl && upstashRedisRestToken) {
    redis = new Redis({
      url: upstashRedisRestUrl,
      token: upstashRedisRestToken,
    })
  }
} catch (error) {
  console.warn("Redis not configured. Caching will be disabled.", error)
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redis !== null
}

/**
 * Get cached value
 */
export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) {
    return null
  }

  try {
    const value = await redis.get<T>(key)
    return value
  } catch (error) {
    console.error(`Cache get error for key ${key}:`, error)
    return null
  }
}

/**
 * Set cached value with TTL (Time To Live) in seconds
 */
export async function setCache<T>(key: string, value: T, ttlSeconds: number = 300): Promise<boolean> {
  if (!redis) {
    return false
  }

  try {
    await redis.setex(key, ttlSeconds, value)
    return true
  } catch (error) {
    console.error(`Cache set error for key ${key}:`, error)
    return false
  }
}

/**
 * Delete cached value
 */
export async function deleteCache(key: string): Promise<boolean> {
  if (!redis) {
    return false
  }

  try {
    await redis.del(key)
    return true
  } catch (error) {
    console.error(`Cache delete error for key ${key}:`, error)
    return false
  }
}

/**
 * Delete multiple cached values by pattern
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  if (!redis) {
    return 0
  }

  try {
    const keys = await redis.keys(pattern)
    if (keys.length === 0) {
      return 0
    }

    const deleted = await redis.del(...keys)
    return typeof deleted === "number" ? deleted : keys.length
  } catch (error) {
    console.error(`Cache pattern delete error for pattern ${pattern}:`, error)
    return 0
  }
}

/**
 * Invalidate cache for a specific key pattern
 * Useful for cache invalidation when data changes
 */
export async function invalidateCache(pattern: string): Promise<number> {
  return deleteCachePattern(pattern)
}

/**
 * Generate cache key helpers
 */
export const CacheKeys = {
  // Blog Posts
  blogPosts: (page: number, limit: number, filters?: string) => {
    const filterHash = filters ? `:${filters}` : ""
    return `blog-posts:page:${page}:limit:${limit}${filterHash}`
  },
  
  // Stats
  stats: () => "stats:landing",
  
  // Subscription
  subscription: (userId: string) => `subscription:${userId}`,
  
  // Analytics
  analytics: (userId: string, dateRange?: string) => {
    const rangeHash = dateRange ? `:${dateRange}` : ""
    return `analytics:${userId}${rangeHash}`
  },
  
  // Content
  content: (contentId: string) => `content:${contentId}`,
  
  // User Profile
  userProfile: (userId: string) => `user-profile:${userId}`,
  
  // Templates
  templates: (userId: string, filters?: string) => {
    const filterHash = filters ? `:${filters}` : ""
    return `templates:${userId}${filterHash}`
  },
  
  // Notifications
  notifications: (userId: string) => `notifications:${userId}`,
}

/**
 * Cache TTL constants (in seconds)
 */
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 900, // 15 minutes
  VERY_LONG: 3600, // 1 hour
} as const

/**
 * Get or set cache pattern
 * Fetches from cache if available, otherwise calls the fetcher and caches the result
 */
export async function getOrSetCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CacheTTL.MEDIUM
): Promise<T> {
  // Try to get from cache
  const cached = await getCache<T>(key)
  if (cached !== null) {
    return cached
  }

  // Fetch fresh data
  const data = await fetcher()

  // Cache the result (fire and forget)
  setCache(key, data, ttlSeconds).catch((error) => {
    console.error(`Failed to cache key ${key}:`, error)
  })

  return data
}

