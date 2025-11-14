# Supabase Connection Fix

## Issues Fixed

1. **Unified Supabase Client** - Created `lib/supabase/server-client.ts` for consistent server-side API route usage
2. **URL Format Handling** - Automatically fixes Supabase URLs missing `.co` extension
3. **Better Error Handling** - Added detailed error messages for connection issues
4. **Environment Variable Validation** - Checks for required variables with helpful error messages

## Changes Made

### 1. Created `lib/supabase/server-client.ts`
- Unified client creation for all API routes
- Handles URL formatting automatically
- Better error messages for missing configuration

### 2. Updated API Routes
- `app/api/blog-posts/route.ts` - Now uses unified client
- `app/api/blog/generate/route.ts` - Updated to use unified client
- `app/api/blog/[id]/route.ts` - Updated to use unified client
- `app/api/generate/route.ts` - Updated to use unified client

### 3. URL Format Fix
The client now automatically fixes Supabase URLs:
- `https://xxx.supabase` → `https://xxx.supabase.co`
- Handles URLs with or without protocol
- Removes trailing slashes

## Environment Variables Required

Make sure these are set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://wmgapinfphnrxhrdhocq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Note:** The URL should include `.co` but the code will auto-fix if missing.

## Testing

1. Restart Docker container:
   ```powershell
   docker-compose down
   docker-compose up -d
   ```

2. Check logs for connection:
   ```powershell
   docker-compose logs -f app
   ```

3. Test the API:
   - Visit: `http://localhost:3000/api/blog-posts`
   - Should return blog posts or a helpful error message

## Common Issues

### "fetch failed" Error
- **Cause:** Network connectivity issue or wrong Supabase URL
- **Fix:** 
  - Verify Supabase URL is correct and includes `.co`
  - Check if Supabase project is active
  - Ensure Docker container has internet access

### "Missing Supabase" Error
- **Cause:** Environment variables not set
- **Fix:** 
  - Check `.env.local` file exists
  - Verify variables are loaded: `docker-compose logs app | grep Supabase`

### "Table does not exist" Error
- **Cause:** `blog_content` table not created in Supabase
- **Fix:** Create the table in your Supabase dashboard

## Next Steps

After fixing the connection:
1. Verify blog posts load correctly
2. Test login functionality
3. Check dashboard data loading
4. Proceed with roadmap implementation

