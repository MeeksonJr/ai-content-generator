-- Migration: Extend user_profiles table with profile management fields
-- Run this in Supabase SQL Editor

-- Add new columns to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS twitter_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT,
ADD COLUMN IF NOT EXISTS website_url TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.bio IS 'User biography/description';
COMMENT ON COLUMN user_profiles.avatar_url IS 'URL to user profile picture (stored in Supabase Storage)';
COMMENT ON COLUMN user_profiles.twitter_url IS 'Twitter profile URL';
COMMENT ON COLUMN user_profiles.linkedin_url IS 'LinkedIn profile URL';
COMMENT ON COLUMN user_profiles.github_url IS 'GitHub profile URL';
COMMENT ON COLUMN user_profiles.website_url IS 'Personal website URL';
COMMENT ON COLUMN user_profiles.location IS 'User location';
COMMENT ON COLUMN user_profiles.display_name IS 'Display name (overrides name from auth.users)';

