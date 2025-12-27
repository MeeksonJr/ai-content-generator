-- Notifications System Migration
-- Creates the notifications table and related indexes

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'info', 'success', 'warning', 'error', 'payment', 'subscription', 'content', 'system'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT, -- Optional URL to navigate to when notification is clicked
  read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false, -- Track if email notification was sent
  metadata JSONB, -- Additional data (e.g., subscription_id, payment_id, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE -- Optional expiration date
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can manage all notifications" ON notifications;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role policy for system-generated notifications
CREATE POLICY "Service role can manage all notifications"
  ON notifications
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add notification preferences to user_profiles table
DO $$
BEGIN
  -- Add notification preferences columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'user_profiles' AND column_name = 'notification_preferences') THEN
    ALTER TABLE user_profiles 
    ADD COLUMN notification_preferences JSONB DEFAULT '{
      "email": true,
      "in_app": true,
      "payment": true,
      "subscription": true,
      "content": true,
      "system": true
    }'::jsonb;
  END IF;
END $$;

-- Create index on notification_preferences for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_notification_preferences 
ON user_profiles USING GIN (notification_preferences);

