# API Rate Limiting Implementation

**Date:** 2025-01-13  
**Status:** Implemented  
**Priority:** High

## Overview

Implemented time-based rate limiting (throttling) for API requests. This works alongside monthly usage quotas to provide both short-term and long-term limits.

## Features

### ✅ Implemented

1. **Per-Minute Rate Limiting**
   - Free: 10 requests/minute
   - Basic: 30 requests/minute
   - Professional: 100 requests/minute
   - Enterprise: 500 requests/minute

2. **Per-Hour Rate Limiting**
   - Free: 100 requests/hour
   - Basic: 500 requests/hour
   - Professional: 2000 requests/hour
   - Enterprise: 10000 requests/hour

3. **Per-API-Key Rate Limiting**
   - Each API key has its own rate limit tracking
   - Allows multiple keys per user with independent limits

4. **Rate Limit Headers**
   - `X-RateLimit-Limit`: Maximum requests allowed
   - `X-RateLimit-Remaining`: Remaining requests in window
   - `X-RateLimit-Reset`: Unix timestamp when limit resets
   - `X-RateLimit-Hourly-Limit`: Hourly limit
   - `X-RateLimit-Hourly-Remaining`: Remaining hourly requests
   - `X-RateLimit-Hourly-Reset`: Hourly reset timestamp

5. **Error Handling**
   - Returns 429 (Too Many Requests) when limit exceeded
   - Includes `Retry-After` header
   - User-friendly error messages

## Implementation Details

### Files Created

1. **`lib/utils/rate-limiter.ts`**
   - Core rate limiting logic
   - `checkRateLimit()` function
   - `getRateLimitHeaders()` function
   - `cleanupRateLimits()` function

2. **`docs/rate-limits-migration.sql`**
   - Database migration script
   - Creates `rate_limits` table
   - Sets up indexes and RLS policies

### Files Modified

1. **`app/api/v1/generate/route.ts`**
   - Integrated rate limiting checks
   - Added rate limit headers to responses
   - Updated authentication to return API key ID

## Database Schema

### `rate_limits` Table

```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY,
  identifier TEXT NOT NULL, -- "user:userId" or "api_key:keyId"
  user_id UUID REFERENCES auth.users(id),
  window_start INTEGER NOT NULL, -- Unix timestamp
  window_seconds INTEGER NOT NULL, -- 60 or 3600
  request_count INTEGER NOT NULL DEFAULT 1,
  last_request_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE(identifier, window_start)
);
```

## Usage

### In API Routes

```typescript
import { checkRateLimit, getRateLimitHeaders } from "@/lib/utils/rate-limiter"
import { RateLimitError } from "@/lib/utils/error-handler"

// Check rate limit
try {
  const minuteLimit = await checkRateLimit(userId, planType, apiKeyId, "minute")
  const hourLimit = await checkRateLimit(userId, planType, apiKeyId, "hour")
  
  const headers = {
    ...getRateLimitHeaders(minuteLimit),
    "X-RateLimit-Hourly-Limit": hourLimit.limit.toString(),
    "X-RateLimit-Hourly-Remaining": hourLimit.remaining.toString(),
    "X-RateLimit-Hourly-Reset": hourLimit.resetAt.toString(),
  }
  
  // Add headers to response
  return NextResponse.json(data, { headers })
} catch (error) {
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message },
      { 
        status: 429,
        headers: { "Retry-After": "60" }
      }
    )
  }
  throw error
}
```

## Setup Instructions

1. **Run Database Migration**
   ```sql
   -- Execute docs/rate-limits-migration.sql in Supabase SQL Editor
   ```

2. **Update API Routes**
   - Add rate limiting checks to all API endpoints
   - Include rate limit headers in responses

3. **Set Up Cleanup Job** (Optional)
   - Create a cron job to run `cleanupRateLimits()` periodically
   - Removes old rate limit records (>24 hours)

## Configuration

Rate limits are defined in `lib/utils/rate-limiter.ts`:

- `DEFAULT_RATE_LIMITS`: Per-minute limits
- `HOURLY_RATE_LIMITS`: Per-hour limits

To adjust limits, modify these constants.

## Testing

1. **Test Rate Limiting**
   - Make requests up to the limit
   - Verify 429 response when limit exceeded
   - Check rate limit headers in responses

2. **Test Per-Key Limiting**
   - Create multiple API keys
   - Verify each key has independent limits

3. **Test Window Reset**
   - Wait for window to reset
   - Verify limits reset correctly

## Next Steps

- [ ] Add rate limiting to other API endpoints
- [ ] Implement Redis-based rate limiting for better performance
- [ ] Add rate limit dashboard/analytics
- [ ] Set up automated cleanup job
- [ ] Add rate limit configuration to admin panel

## Notes

- Current implementation uses database for tracking (good for accuracy)
- For high-traffic scenarios, consider Redis for better performance
- Rate limits are enforced per-user or per-API-key
- Monthly quotas are still enforced separately

