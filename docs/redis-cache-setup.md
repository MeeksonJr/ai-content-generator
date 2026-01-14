# Redis Cache Setup Guide

This guide explains how to set up Upstash Redis for caching API responses to improve performance.

## Prerequisites

- Upstash account (free tier available at https://upstash.com/)
- Environment variables configured

## Setup Steps

### 1. Create Upstash Redis Database

1. Go to https://console.upstash.com/
2. Click "Create Database"
3. Choose "Global" or "Regional" (Regional recommended for better latency)
4. Name your database (e.g., "ai-content-generator-cache")
5. Click "Create"

### 2. Get Connection String

1. After creating the database, click on it
2. Go to the "REST API" tab
3. Copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 3. Add to Environment Variables

Add these to your `.env.local` file:

```env
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

For Vercel deployment:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add both variables for Production, Preview, and Development

### 4. Verify Installation

The Redis client is automatically initialized when the app starts. If environment variables are not set, caching will gracefully degrade (no errors, just no caching).

## Cached Routes

The following routes are cached:

- **Blog Posts** (`/api/blog-posts`) - 5 minutes TTL
- **Stats** (`/api/stats`) - 15 minutes TTL
- **Subscription** (`/api/subscription`) - 2 minutes TTL
- **Templates** (`/api/templates`) - 5 minutes TTL
- **Notifications** (`/api/notifications`) - 1 minute TTL

## Cache Invalidation

Caches are automatically invalidated when:
- New blog post is created → invalidates blog-posts cache
- New content is created → invalidates stats cache
- Subscription changes → invalidates subscription cache
- Content/template is updated → invalidates relevant caches

## Manual Cache Clearing

For admin purposes, you can manually clear caches by pattern:

```typescript
import { invalidateCache } from "@/lib/cache/redis"

// Clear all blog posts cache
await invalidateCache("blog-posts:*")

// Clear all stats cache
await invalidateCache("stats:*")

// Clear all caches (use with caution)
await invalidateCache("*")
```

## Monitoring

Monitor cache hit rates and performance in:
- Upstash Console (database metrics)
- Application logs (cache errors if any)
- Vercel Analytics (API response times)

## Cost

Upstash Free Tier:
- 10,000 commands/day
- 256 MB storage
- Global replication

This should be sufficient for moderate traffic. Upgrade if needed.

## Troubleshooting

**Caching not working:**
- Check environment variables are set correctly
- Verify Redis database is active in Upstash console
- Check application logs for Redis connection errors

**High costs:**
- Review cache TTL values (reduce if data changes frequently)
- Consider reducing cached routes
- Check for unnecessary cache invalidation

