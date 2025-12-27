-- Content Moderation Migration
-- Adds moderation fields to content table

-- Add moderation-related columns to content table if they don't exist
DO $$
BEGIN
  -- Add moderation_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'content' AND column_name = 'moderation_status') THEN
    ALTER TABLE content 
    ADD COLUMN moderation_status VARCHAR(50) DEFAULT 'pending';
  END IF;

  -- Add flagged_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'content' AND column_name = 'flagged_at') THEN
    ALTER TABLE content 
    ADD COLUMN flagged_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;

  -- Add flagged_by column (user_id who flagged)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'content' AND column_name = 'flagged_by') THEN
    ALTER TABLE content 
    ADD COLUMN flagged_by UUID DEFAULT NULL;
  END IF;

  -- Add moderation_notes column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'content' AND column_name = 'moderation_notes') THEN
    ALTER TABLE content 
    ADD COLUMN moderation_notes TEXT DEFAULT NULL;
  END IF;

  -- Add reviewed_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'content' AND column_name = 'reviewed_at') THEN
    ALTER TABLE content 
    ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;

  -- Add reviewed_by column (admin user_id who reviewed)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'content' AND column_name = 'reviewed_by') THEN
    ALTER TABLE content 
    ADD COLUMN reviewed_by UUID DEFAULT NULL;
  END IF;

  -- Add flag_reason column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'content' AND column_name = 'flag_reason') THEN
    ALTER TABLE content 
    ADD COLUMN flag_reason TEXT DEFAULT NULL;
  END IF;
END $$;

-- Create indexes for moderation queries
CREATE INDEX IF NOT EXISTS idx_content_moderation_status 
ON content(moderation_status) WHERE moderation_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_flagged_at 
ON content(flagged_at) WHERE flagged_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_reviewed_at 
ON content(reviewed_at) WHERE reviewed_at IS NOT NULL;

-- Add comments to columns
COMMENT ON COLUMN content.moderation_status IS 'Status: pending, approved, rejected, flagged';
COMMENT ON COLUMN content.flagged_at IS 'Timestamp when content was flagged';
COMMENT ON COLUMN content.flagged_by IS 'User ID who flagged the content';
COMMENT ON COLUMN content.moderation_notes IS 'Admin notes during moderation';
COMMENT ON COLUMN content.reviewed_at IS 'Timestamp when content was reviewed';
COMMENT ON COLUMN content.reviewed_by IS 'Admin user ID who reviewed the content';
COMMENT ON COLUMN content.flag_reason IS 'Reason for flagging content';

