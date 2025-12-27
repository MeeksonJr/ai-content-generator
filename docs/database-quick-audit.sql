-- Quick Database Audit - Summary View
-- Run this for a quick overview, then run the full audit if needed

-- ============================================
-- QUICK SUMMARY
-- ============================================
SELECT 
    'Database Summary' as report_type,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as total_tables,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_rls_policies,
    (SELECT COUNT(*) FROM storage.buckets) as total_storage_buckets,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') as total_storage_policies;

-- ============================================
-- ALL TABLES WITH RLS STATUS
-- ============================================
SELECT 
    tablename as table_name,
    CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = t.tablename AND schemaname = 'public') as index_count,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename AND schemaname = 'public') as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- STORAGE BUCKETS
-- ============================================
SELECT 
    b.name as bucket_name,
    CASE WHEN b.public THEN '✅ Public' ELSE '🔒 Private' END as visibility,
    b.file_size_limit,
    b.created_at
FROM storage.buckets b
ORDER BY b.name;

-- ============================================
-- STORAGE POLICIES (All policies for storage.objects)
-- ============================================
SELECT 
    policyname,
    cmd as command,
    roles,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has USING clause'
        ELSE 'No USING clause'
    END as using_clause,
    CASE 
        WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
        ELSE 'No WITH CHECK clause'
    END as check_clause
FROM pg_policies
WHERE schemaname = 'storage'
    AND tablename = 'objects'
ORDER BY policyname;

-- ============================================
-- MISSING TABLES CHECK (Expected vs Actual)
-- ============================================
WITH expected_tables AS (
    SELECT unnest(ARRAY[
        'projects', 'content', 'subscriptions', 'usage_limits', 'usage_stats',
        'blog_content', 'user_profiles', 'applications', 'api_keys', 'rate_limits',
        'notifications', 'content_templates', 'project_shares', 'content_comments',
        'content_versions', 'payment_history'
    ]) as table_name
)
SELECT 
    et.table_name as expected_table,
    CASE 
        WHEN EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = et.table_name)
        THEN '✅ Exists'
        ELSE '❌ MISSING'
    END as status
FROM expected_tables et
ORDER BY status DESC, et.table_name;

-- ============================================
-- TABLES WITHOUT INDEXES (Performance Risk)
-- ============================================
SELECT 
    t.tablename as table_name,
    '⚠️ No indexes' as warning
FROM pg_tables t
LEFT JOIN pg_indexes i ON t.tablename = i.tablename AND t.schemaname = i.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.tablename
HAVING COUNT(i.indexname) = 0
ORDER BY t.tablename;

-- ============================================
-- TABLES WITH RLS DISABLED (Security Risk)
-- ============================================
SELECT 
    tablename as table_name,
    '⚠️ RLS Disabled' as warning
FROM pg_tables
WHERE schemaname = 'public'
    AND rowsecurity = false
    AND tablename NOT IN ('spatial_ref_sys') -- Exclude system tables
ORDER BY tablename;

