-- Collaboration Features Migration
-- Creates tables for project sharing, comments, and version history

-- 1. Project Shares Table (for sharing projects with team members)
CREATE TABLE IF NOT EXISTS project_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission VARCHAR(50) NOT NULL DEFAULT 'view', -- view, edit, admin
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, shared_with_user_id)
);

-- 2. Content Comments Table
CREATE TABLE IF NOT EXISTS content_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  parent_comment_id UUID REFERENCES content_comments(id) ON DELETE CASCADE, -- For threaded comments
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Content Versions Table (for version history)
CREATE TABLE IF NOT EXISTS content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  change_summary TEXT, -- Brief description of what changed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(content_id, version_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_shares_project_id ON project_shares(project_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_shared_with ON project_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_project_shares_shared_by ON project_shares(shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_content_id ON content_comments(content_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_user_id ON content_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_parent ON content_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_versions_content_id ON content_versions(content_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_user_id ON content_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_version ON content_versions(content_id, version_number);

-- Enable RLS (Row Level Security)
ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running the script)
DROP POLICY IF EXISTS "Users can view shared projects" ON project_shares;
DROP POLICY IF EXISTS "Users can manage own project shares" ON project_shares;
DROP POLICY IF EXISTS "Users can view comments on accessible content" ON content_comments;
DROP POLICY IF EXISTS "Users can create comments" ON content_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON content_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON content_comments;
DROP POLICY IF EXISTS "Users can view versions of accessible content" ON content_versions;
DROP POLICY IF EXISTS "Users can create versions" ON content_versions;
DROP POLICY IF EXISTS "Service role can manage all collaboration data" ON project_shares;
DROP POLICY IF EXISTS "Service role can manage all collaboration data" ON content_comments;
DROP POLICY IF EXISTS "Service role can manage all collaboration data" ON content_versions;

-- Project Shares Policies
CREATE POLICY "Users can view shared projects"
  ON project_shares
  FOR SELECT
  USING (
    auth.uid() = shared_with_user_id OR 
    auth.uid() = shared_by_user_id OR
    auth.uid() IN (SELECT user_id FROM projects WHERE id = project_id)
  );

CREATE POLICY "Users can manage own project shares"
  ON project_shares
  FOR ALL
  USING (
    auth.uid() = shared_by_user_id OR
    auth.uid() IN (SELECT user_id FROM projects WHERE id = project_id)
  );

-- Content Comments Policies
CREATE POLICY "Users can view comments on accessible content"
  ON content_comments
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT user_id FROM content WHERE id = content_id) OR
    auth.uid() IN (
      SELECT shared_with_user_id FROM project_shares 
      WHERE project_id IN (SELECT project_id FROM content WHERE id = content_id)
    )
  );

CREATE POLICY "Users can create comments"
  ON content_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      auth.uid() IN (SELECT user_id FROM content WHERE id = content_id) OR
      auth.uid() IN (
        SELECT shared_with_user_id FROM project_shares 
        WHERE project_id IN (SELECT project_id FROM content WHERE id = content_id)
      )
    )
  );

CREATE POLICY "Users can update own comments"
  ON content_comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON content_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Content Versions Policies
CREATE POLICY "Users can view versions of accessible content"
  ON content_versions
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT user_id FROM content WHERE id = content_id) OR
    auth.uid() IN (
      SELECT shared_with_user_id FROM project_shares 
      WHERE project_id IN (SELECT project_id FROM content WHERE id = content_id)
    )
  );

CREATE POLICY "Users can create versions"
  ON content_versions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      auth.uid() IN (SELECT user_id FROM content WHERE id = content_id) OR
      auth.uid() IN (
        SELECT shared_with_user_id FROM project_shares 
        WHERE project_id IN (SELECT project_id FROM content WHERE id = content_id)
        AND permission IN ('edit', 'admin')
      )
    )
  );

-- Service role policies
CREATE POLICY "Service role can manage all collaboration data"
  ON project_shares
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all collaboration data"
  ON content_comments
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage all collaboration data"
  ON content_versions
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comments
COMMENT ON TABLE project_shares IS 'Stores project sharing relationships between users';
COMMENT ON TABLE content_comments IS 'Stores comments on content items';
COMMENT ON TABLE content_versions IS 'Stores version history for content items';
COMMENT ON COLUMN project_shares.permission IS 'Permission level: view (read-only), edit (can modify), admin (full control)';
COMMENT ON COLUMN content_comments.parent_comment_id IS 'For threaded/reply comments';

