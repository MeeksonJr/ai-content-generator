# Error Handling Guide

## Overview

The application now uses a centralized error handling system that provides consistent, user-friendly error messages across all API routes and components.

## Error Handler Utility

Located at `lib/utils/error-handler.ts`, this utility provides:

### Custom Error Classes

- `AppError` - Base error class
- `ValidationError` - 400 Bad Request
- `AuthenticationError` - 401 Unauthorized
- `AuthorizationError` - 403 Forbidden
- `NotFoundError` - 404 Not Found
- `ConflictError` - 409 Conflict
- `RateLimitError` - 429 Too Many Requests
- `ExternalServiceError` - 502 Bad Gateway

### Key Functions

#### `handleApiError(error, context?)`
Converts any error into a standardized API error response.

**Usage:**
```typescript
try {
  // ... code ...
} catch (error) {
  const { statusCode, error: apiError } = handleApiError(error, "Context Name")
  return NextResponse.json(apiError, { status: statusCode })
}
```

#### `getUserFriendlyErrorMessage(error)`
Converts technical errors into user-friendly messages.

**Usage:**
```typescript
const message = getUserFriendlyErrorMessage(error)
toast({ title: "Error", description: message, variant: "destructive" })
```

#### `extractApiErrorMessage(response)`
Extracts error message from API response.

**Usage:**
```typescript
if (!response.ok) {
  const errorMessage = await extractApiErrorMessage(response)
  throw new Error(errorMessage)
}
```

## Error Boundary Component

Located at `components/error-boundary.tsx`, provides React error boundary for catching component errors.

**Usage:**
```tsx
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

The error boundary is already added to the root layout.

## API Route Pattern

### Before:
```typescript
export async function GET() {
  try {
    // ... code ...
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    // ... code ...
  } catch (error) {
    logger.error("Error", { context: "API" }, error as Error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

### After:
```typescript
import { AuthenticationError, handleApiError } from "@/lib/utils/error-handler"

export async function GET() {
  try {
    // ... code ...
    if (!session) {
      const { statusCode, error } = handleApiError(new AuthenticationError(), "API Name")
      return NextResponse.json(error, { status: statusCode })
    }
    // ... code ...
  } catch (error) {
    const { statusCode, error: apiError } = handleApiError(error, "API Name")
    return NextResponse.json(apiError, { status: statusCode })
  }
}
```

## Component Pattern

### Before:
```typescript
try {
  const response = await fetch("/api/endpoint")
  if (!response.ok) {
    const error = await response.json()
    toast({ title: "Error", description: error.error || "Failed" })
  }
} catch (error: any) {
  toast({ title: "Error", description: error.message || "Failed" })
}
```

### After:
```typescript
import { extractApiErrorMessage, getUserFriendlyErrorMessage } from "@/lib/utils/error-handler"

try {
  const response = await fetch("/api/endpoint")
  if (!response.ok) {
    const errorMessage = await extractApiErrorMessage(response)
    toast({ title: "Error", description: errorMessage, variant: "destructive" })
    return
  }
  // ... success handling ...
} catch (error) {
  const errorMessage = getUserFriendlyErrorMessage(error)
  toast({ title: "Error", description: errorMessage, variant: "destructive" })
}
```

## Error Response Format

All API errors now follow this format:

```json
{
  "message": "User-friendly error message",
  "code": "ERROR_CODE",
  "statusCode": 400,
  "details": {
    // Optional additional details
  }
}
```

## Benefits

1. **Consistency** - All errors follow the same format
2. **User-Friendly** - Technical errors are converted to readable messages
3. **Logging** - All errors are automatically logged with context
4. **Type Safety** - Custom error classes provide type safety
5. **Maintainability** - Centralized error handling makes updates easier

## Migration Status

✅ **Updated Files:**
- `app/api/api-keys/route.ts`
- `app/api/profile/route.ts`
- `app/api/profile/upload-avatar/route.ts`
- `app/dashboard/settings/page.tsx`
- `app/layout.tsx` (added ErrorBoundary)

⏳ **Remaining Files** (can be updated incrementally):
- Other API routes can be migrated as needed
- Components can be updated to use `extractApiErrorMessage` and `getUserFriendlyErrorMessage`

## Best Practices

1. **Always use `handleApiError` in API routes** - Ensures consistent error responses
2. **Use specific error classes** - `ValidationError`, `AuthenticationError`, etc. instead of generic `AppError`
3. **Provide context** - Always pass a context string to `handleApiError` for better logging
4. **Use `extractApiErrorMessage` in components** - For consistent error message extraction
5. **Wrap components in ErrorBoundary** - For catching React errors gracefully

