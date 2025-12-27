# Database Audit Instructions

## Purpose
This script provides a comprehensive audit of your Supabase database to identify:
- All tables and their structures
- Missing columns or tables
- RLS (Row Level Security) policies
- Storage buckets and policies
- Indexes and performance considerations
- Foreign key relationships

## How to Run

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run the Audit Script**
   - Open the file `docs/database-audit-script.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **Run** (or press Ctrl+Enter)

3. **Export Results**
   - The script will return multiple result sets
   - For each result set:
     - Click the **Download** button (CSV icon) in the results panel
     - OR copy the results manually
   - Save all results in a text file or document

4. **Share Results**
   - Share the results with the development team
   - The results will be analyzed to identify:
     - Missing tables or columns
     - Missing RLS policies
     - Missing indexes
     - Storage bucket configuration issues

## What to Look For

### Critical Issues
- ✅ All expected tables exist
- ✅ All columns referenced in code exist in tables
- ✅ RLS is enabled on sensitive tables
- ✅ Storage buckets have proper policies

### Performance Issues
- ⚠️ Tables without indexes (especially on foreign keys and frequently queried columns)
- ⚠️ Missing indexes on `user_id`, `created_at`, `status` columns

### Security Issues
- ⚠️ Tables with RLS disabled that should have it enabled
- ⚠️ Missing RLS policies for authenticated users
- ⚠️ Storage buckets without proper access policies

## Expected Tables (from codebase)

### Core Tables
- `projects` - User projects
- `content` - Generated content
- `subscriptions` - User subscriptions
- `usage_limits` - Plan limits
- `usage_stats` - Usage tracking
- `user_profiles` - User profile data
- `api_keys` - API key management
- `rate_limits` - Rate limiting tracking

### Feature Tables
- `blog_content` - Blog posts
- `applications` - Job applications
- `notifications` - User notifications
- `content_templates` - Content templates
- `project_shares` - Project collaboration
- `content_comments` - Content comments
- `content_versions` - Version history
- `payment_history` - Payment records

## Expected Storage Buckets

- `resumes` - Job application resumes
- `generated-images` - Generated images
- `avatars` - User profile pictures (if implemented)

## Next Steps

After running the audit:
1. Review the results
2. Identify missing tables/columns
3. Identify missing RLS policies
4. Identify missing indexes
5. Create migration scripts to fix issues
6. Re-run audit to verify fixes

