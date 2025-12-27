-- Fix RLS Disabled Tables
-- This script enables RLS and adds basic policies for tables that currently have RLS disabled
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ENABLE RLS ON TABLES
-- ============================================

-- Enable RLS on career_applications
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on newsletter_subscribers
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on usage_limits
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. CREATE RLS POLICIES FOR career_applications
-- ============================================

-- Policy: Users can view their own applications
CREATE POLICY "Users can view own applications"
ON public.career_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own applications
CREATE POLICY "Users can insert own applications"
ON public.career_applications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own applications
CREATE POLICY "Users can update own applications"
ON public.career_applications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.career_applications
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Policy: Admins can update all applications
CREATE POLICY "Admins can update all applications"
ON public.career_applications
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- ============================================
-- 3. CREATE RLS POLICIES FOR newsletter_subscribers
-- ============================================

-- Policy: Anyone can insert (subscribe)
CREATE POLICY "Anyone can subscribe"
ON public.newsletter_subscribers
FOR INSERT
TO public
WITH CHECK (true);

-- Policy: Users can view their own subscription
CREATE POLICY "Users can view own subscription"
ON public.newsletter_subscribers
FOR SELECT
TO authenticated
USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Policy: Users can update their own subscription
CREATE POLICY "Users can update own subscription"
ON public.newsletter_subscribers
FOR UPDATE
TO authenticated
USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
    )
)
WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- Policy: Users can delete their own subscription
CREATE POLICY "Users can delete own subscription"
ON public.newsletter_subscribers
FOR DELETE
TO authenticated
USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- ============================================
-- 4. CREATE RLS POLICIES FOR usage_limits
-- ============================================

-- Policy: Anyone can view usage limits (public plan information)
CREATE POLICY "Anyone can view usage limits"
ON public.usage_limits
FOR SELECT
TO public
USING (true);

-- Policy: Only service role can insert/update/delete (admin operations)
-- Note: This is typically done via service role, but we'll add a policy for admin users
CREATE POLICY "Admins can manage usage limits"
ON public.usage_limits
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify RLS is enabled
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('career_applications', 'newsletter_subscribers', 'usage_limits')
ORDER BY tablename;

-- Verify policies were created
SELECT 
    tablename,
    policyname,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('career_applications', 'newsletter_subscribers', 'usage_limits')
ORDER BY tablename, policyname;

