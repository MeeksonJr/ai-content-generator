-- Database Performance Optimization - Missing Indexes
-- This script adds indexes for frequently queried columns and filter combinations
-- Run this to improve query performance significantly

-- ============================================
-- BLOG_CONTENT TABLE INDEXES
-- ============================================
-- Index for published blog posts (most common filter)
CREATE INDEX IF NOT EXISTS idx_blog_content_is_published 
ON blog_content(is_published) 
WHERE is_published = true;

-- Composite index for published + category + date (common filter combo)
CREATE INDEX IF NOT EXISTS idx_blog_content_published_category_date 
ON blog_content(is_published, category, created_at DESC) 
WHERE is_published = true;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_blog_content_category 
ON blog_content(category) 
WHERE category IS NOT NULL;

-- Index for date range filtering
CREATE INDEX IF NOT EXISTS idx_blog_content_created_at 
ON blog_content(created_at DESC);

-- Index for view count sorting (most viewed)
CREATE INDEX IF NOT EXISTS idx_blog_content_view_count 
ON blog_content(view_count DESC) 
WHERE is_published = true;

-- Full-text search indexes (for search queries)
CREATE INDEX IF NOT EXISTS idx_blog_content_title_search 
ON blog_content USING gin(to_tsvector('english', title));

CREATE INDEX IF NOT EXISTS idx_blog_content_excerpt_search 
ON blog_content USING gin(to_tsvector('english', excerpt));

-- ============================================
-- CONTENT TABLE INDEXES
-- ============================================
-- Index for user content queries (most common)
CREATE INDEX IF NOT EXISTS idx_content_user_id 
ON content(user_id);

-- Composite index for user + type + date
CREATE INDEX IF NOT EXISTS idx_content_user_type_date 
ON content(user_id, content_type, created_at DESC);

-- Index for project content queries
CREATE INDEX IF NOT EXISTS idx_content_project_id 
ON content(project_id) 
WHERE project_id IS NOT NULL;

-- Index for content type filtering
CREATE INDEX IF NOT EXISTS idx_content_content_type 
ON content(content_type);

-- Index for moderation status
CREATE INDEX IF NOT EXISTS idx_content_moderation_status 
ON content(moderation_status) 
WHERE moderation_status IS NOT NULL;

-- ============================================
-- SUBSCRIPTIONS TABLE INDEXES
-- ============================================
-- Index for user subscription queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id 
ON subscriptions(user_id);

-- Composite index for active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
ON subscriptions(user_id, status, created_at DESC);

-- Index for plan type filtering
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type 
ON subscriptions(plan_type);

-- ============================================
-- USAGE_STATS TABLE INDEXES
-- ============================================
-- Index for user stats queries
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id 
ON usage_stats(user_id);

-- Composite index for user + date (for analytics)
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_date 
ON usage_stats(user_id, created_at DESC);

-- ============================================
-- CONTENT_TEMPLATES TABLE INDEXES
-- ============================================
-- Index for user templates
CREATE INDEX IF NOT EXISTS idx_content_templates_user_id 
ON content_templates(user_id);

-- Composite index for public templates (frequently queried)
CREATE INDEX IF NOT EXISTS idx_content_templates_public 
ON content_templates(is_public, content_type, created_at DESC) 
WHERE is_public = true;

-- Index for content type filtering
CREATE INDEX IF NOT EXISTS idx_content_templates_content_type 
ON content_templates(content_type);

-- Index for featured templates
CREATE INDEX IF NOT EXISTS idx_content_templates_featured 
ON content_templates(is_featured, usage_count DESC) 
WHERE is_featured = true;

-- ============================================
-- CONTENT_COMMENTS TABLE INDEXES
-- ============================================
-- Index for content comments (most common query)
CREATE INDEX IF NOT EXISTS idx_content_comments_content_id 
ON content_comments(content_id);

-- Composite index for content + date
CREATE INDEX IF NOT EXISTS idx_content_comments_content_date 
ON content_comments(content_id, created_at DESC);

-- Index for user comments
CREATE INDEX IF NOT EXISTS idx_content_comments_user_id 
ON content_comments(user_id);

-- ============================================
-- APPLICATIONS TABLE INDEXES
-- ============================================
-- Index for status filtering (common in admin)
CREATE INDEX IF NOT EXISTS idx_applications_status 
ON applications(status);

-- Composite index for status + date
CREATE INDEX IF NOT EXISTS idx_applications_status_date 
ON applications(status, submitted_at DESC);

-- Index for user applications
CREATE INDEX IF NOT EXISTS idx_applications_user_id 
ON applications(user_id) 
WHERE user_id IS NOT NULL;

-- ============================================
-- NOTIFICATIONS TABLE INDEXES
-- ============================================
-- Index for user notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
ON notifications(user_id);

-- Composite index for user + read status + date
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_date 
ON notifications(user_id, read, created_at DESC);

-- ============================================
-- PROJECTS TABLE INDEXES
-- ============================================
-- Index for user projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id 
ON projects(user_id);

-- Composite index for user + date
CREATE INDEX IF NOT EXISTS idx_projects_user_date 
ON projects(user_id, created_at DESC);

-- ============================================
-- PAYMENT_HISTORY TABLE INDEXES
-- ============================================
-- Index for user payment history
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id 
ON payment_history(user_id);

-- Index for payment date queries
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at 
ON payment_history(created_at DESC);

-- Composite index for user + status + date
CREATE INDEX IF NOT EXISTS idx_payment_history_user_status_date 
ON payment_history(user_id, status, created_at DESC);

-- ============================================
-- USER_PROFILES TABLE INDEXES
-- ============================================
-- Index for admin check queries (is_admin filtering)
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin 
ON user_profiles(is_admin) 
WHERE is_admin = true;

-- ============================================
-- VERIFY INDEXES WERE CREATED
-- ============================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

