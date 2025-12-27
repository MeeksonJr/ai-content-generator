# Database Tables Verification

This document tracks the verification and creation of required database tables.

## Required Tables

### 1. `blog_content`
- **Status**: Defined in TypeScript types ✅
- **Needs Verification**: Check if table exists in Supabase
- **Schema**: See `lib/database.types.ts` lines 181-238

### 2. `user_profiles`
- **Status**: Defined in TypeScript types ✅
- **Needs Verification**: Check if table exists in Supabase
- **Schema**: See `lib/database.types.ts` lines 240-258

### 3. `career_applications`
- **Status**: Unknown
- **Referenced in**: `app/api/careers/apply/route.ts`
- **Needs**: Verification and creation if missing

## SQL Scripts for Table Creation

### Create `blog_content` table:
```sql
CREATE TABLE IF NOT EXISTS blog_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  search_query TEXT,
  category TEXT,
  author TEXT,
  image_url TEXT,
  image_prompt TEXT,
  tags TEXT[],
  read_time TEXT,
  view_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  ai_provider TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_content_slug ON blog_content(slug);
CREATE INDEX IF NOT EXISTS idx_blog_content_published ON blog_content(is_published);
CREATE INDEX IF NOT EXISTS idx_blog_content_category ON blog_content(category);
```

### Create `user_profiles` table:
```sql
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_admin ON user_profiles(is_admin);
```

### Create `career_applications` table (if needed):
```sql
CREATE TABLE IF NOT EXISTS career_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  position TEXT NOT NULL,
  linkedin_url TEXT,
  portfolio_url TEXT,
  experience TEXT,
  cover_letter TEXT,
  resume_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_career_applications_user ON career_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_career_applications_status ON career_applications(status);
```

## Next Steps

1. Run these SQL scripts in Supabase SQL Editor
2. Verify tables exist and have correct schema
3. Update roadmap when complete

