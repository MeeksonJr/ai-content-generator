-- Database Audit Script
-- Run this in Supabase SQL Editor to get a comprehensive overview of your database
-- Copy the results and share them for analysis

-- ============================================
-- 1. LIST ALL TABLES IN PUBLIC SCHEMA
-- ============================================
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 2. TABLE STRUCTURES (Columns, Types, Constraints)
-- ============================================
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY'
        WHEN fk.column_name IS NOT NULL THEN 'FOREIGN KEY -> ' || fk.foreign_table_name || '.' || fk.foreign_column_name
        ELSE ''
    END as key_type
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku 
        ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
LEFT JOIN (
    SELECT
        ku.table_name,
        ku.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS ku
        ON tc.constraint_name = ku.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- ============================================
-- 3. INDEXES
-- ============================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- 4. RLS (Row Level Security) STATUS
-- ============================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 5. RLS POLICIES
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 6. STORAGE BUCKETS
-- ============================================
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets
ORDER BY name;

-- ============================================
-- 7. STORAGE POLICIES
-- ============================================
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression,
    roles
FROM pg_policies
WHERE schemaname = 'storage'
    AND tablename = 'objects'
ORDER BY policyname;

-- ============================================
-- 8. TABLE ROW COUNTS
-- ============================================
SELECT 
    schemaname,
    relname as tablename,
    n_live_tup as row_count,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;

-- ============================================
-- 9. MISSING INDEXES (Tables without indexes)
-- ============================================
SELECT 
    t.tablename,
    COUNT(i.indexname) as index_count
FROM pg_tables t
LEFT JOIN pg_indexes i ON t.tablename = i.tablename AND t.schemaname = i.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename
HAVING COUNT(i.indexname) = 0
ORDER BY t.tablename;

-- ============================================
-- 10. FOREIGN KEY CONSTRAINTS
-- ============================================
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 11. TABLES REFERENCED IN CODEBASE (Expected Tables)
-- ============================================
-- This is a reference list - check if these exist
SELECT 'Expected Tables from Codebase:' as info;

-- Core Tables
SELECT 'projects' as expected_table, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') as exists;
SELECT 'content' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content') as exists;
SELECT 'subscriptions' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') as exists;
SELECT 'usage_limits' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usage_limits') as exists;
SELECT 'usage_stats' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'usage_stats') as exists;
SELECT 'blog_content' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blog_content') as exists;
SELECT 'user_profiles' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') as exists;
SELECT 'applications' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'applications') as exists;
SELECT 'api_keys' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_keys') as exists;
SELECT 'rate_limits' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rate_limits') as exists;
SELECT 'notifications' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') as exists;
SELECT 'content_templates' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_templates') as exists;
SELECT 'project_shares' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'project_shares') as exists;
SELECT 'content_comments' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_comments') as exists;
SELECT 'content_versions' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_versions') as exists;
SELECT 'payment_history' as expected_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_history') as exists;

-- ============================================
-- 12. SUMMARY REPORT
-- ============================================
SELECT 
    'SUMMARY' as report_section,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_rls_policies,
    (SELECT COUNT(*) FROM storage.buckets) as total_storage_buckets,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') as total_storage_policies,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true) as tables_with_rls_enabled;

