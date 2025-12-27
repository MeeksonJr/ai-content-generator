-- Content Templates Migration
-- Creates table for storing content templates

-- Create content_templates table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content_type VARCHAR(100) NOT NULL,
  template_content TEXT NOT NULL,
  template_prompt TEXT,
  variables JSONB, -- Store template variables/placeholders
  is_public BOOLEAN DEFAULT false, -- Whether template is shared publicly
  is_featured BOOLEAN DEFAULT false, -- Admin can feature templates
  usage_count INTEGER DEFAULT 0, -- Track how many times template is used
  category VARCHAR(100), -- Category for organizing templates
  tags TEXT[], -- Tags for searching templates
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_templates_user_id ON content_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_content_templates_content_type ON content_templates(content_type);
CREATE INDEX IF NOT EXISTS idx_content_templates_is_public ON content_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_content_templates_is_featured ON content_templates(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_content_templates_category ON content_templates(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_templates_tags ON content_templates USING GIN(tags) WHERE tags IS NOT NULL;

-- Enable RLS (Row Level Security)
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running the script)
DROP POLICY IF EXISTS "Users can view own templates" ON content_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON content_templates;
DROP POLICY IF EXISTS "Users can create own templates" ON content_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON content_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON content_templates;
DROP POLICY IF EXISTS "Service role can manage all templates" ON content_templates;

-- Policy: Users can view their own templates
CREATE POLICY "Users can view own templates"
  ON content_templates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can view public templates
CREATE POLICY "Users can view public templates"
  ON content_templates
  FOR SELECT
  USING (is_public = true);

-- Policy: Users can create their own templates
CREATE POLICY "Users can create own templates"
  ON content_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON content_templates
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON content_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for server-side operations)
CREATE POLICY "Service role can manage all templates"
  ON content_templates
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comments
COMMENT ON TABLE content_templates IS 'Stores reusable content templates for content generation';
COMMENT ON COLUMN content_templates.variables IS 'JSON object storing template variable definitions';
COMMENT ON COLUMN content_templates.is_public IS 'Whether template is shared publicly with all users';
COMMENT ON COLUMN content_templates.is_featured IS 'Whether template is featured (admin-controlled)';
COMMENT ON COLUMN content_templates.usage_count IS 'Number of times template has been used';

