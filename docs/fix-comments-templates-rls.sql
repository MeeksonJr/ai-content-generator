-- Fix RLS Policies for Comments and Templates
-- Run this in Supabase SQL Editor if comments or templates are not working

-- ============================================
-- 1. VERIFY RLS IS ENABLED
-- ============================================

-- Check RLS status
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('content_comments', 'content_templates')
ORDER BY tablename;

-- ============================================
-- 2. ENABLE RLS IF NOT ENABLED
-- ============================================

ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. DROP EXISTING POLICIES (if needed)
-- ============================================

-- Drop content_comments policies
DROP POLICY IF EXISTS "Users can view comments on accessible content" ON public.content_comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.content_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.content_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.content_comments;
DROP POLICY IF EXISTS "Service role can manage all collaboration data" ON public.content_comments;

-- Drop content_templates policies
DROP POLICY IF EXISTS "Users can view own templates" ON public.content_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON public.content_templates;
DROP POLICY IF EXISTS "Users can create own templates" ON public.content_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.content_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.content_templates;
DROP POLICY IF EXISTS "Service role can manage all templates" ON public.content_templates;

-- ============================================
-- 4. CREATE CONTENT_COMMENTS POLICIES
-- ============================================

-- Policy: Users can view comments on content they have access to
CREATE POLICY "Users can view comments on accessible content"
  ON public.content_comments
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own comments
    auth.uid() = user_id
    OR
    -- User can see comments on content they own
    EXISTS (
      SELECT 1 FROM public.content
      WHERE id = content_comments.content_id
      AND user_id = auth.uid()
    )
    OR
    -- User can see comments on content in shared projects
    EXISTS (
      SELECT 1 FROM public.content c
      INNER JOIN public.project_shares ps ON ps.project_id = c.project_id
      WHERE c.id = content_comments.content_id
      AND ps.shared_with_user_id = auth.uid()
    )
  );

-- Policy: Users can create comments on accessible content
CREATE POLICY "Users can create comments"
  ON public.content_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- User owns the content
      EXISTS (
        SELECT 1 FROM public.content
        WHERE id = content_comments.content_id
        AND user_id = auth.uid()
      )
      OR
      -- User has access via project share
      EXISTS (
        SELECT 1 FROM public.content c
        INNER JOIN public.project_shares ps ON ps.project_id = c.project_id
        WHERE c.id = content_comments.content_id
        AND ps.shared_with_user_id = auth.uid()
      )
    )
  );

-- Policy: Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON public.content_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.content_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all comments
CREATE POLICY "Service role can manage all collaboration data"
  ON public.content_comments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 5. CREATE CONTENT_TEMPLATES POLICIES
-- ============================================

-- Policy: Users can view their own templates
CREATE POLICY "Users can view own templates"
  ON public.content_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can view public templates
CREATE POLICY "Users can view public templates"
  ON public.content_templates
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Policy: Users can create their own templates
CREATE POLICY "Users can create own templates"
  ON public.content_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON public.content_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON public.content_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can manage all templates
CREATE POLICY "Service role can manage all templates"
  ON public.content_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 6. VERIFICATION QUERIES
-- ============================================

-- Verify RLS is enabled
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('content_comments', 'content_templates')
ORDER BY tablename;

-- Verify policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('content_comments', 'content_templates')
ORDER BY tablename, policyname;

