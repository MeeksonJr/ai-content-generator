-- Payment History Table Migration
-- This table stores payment transaction history for subscriptions
-- This script is idempotent and can be run multiple times safely

-- Drop existing constraints if they exist (to allow re-running the script)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_history') THEN
    ALTER TABLE payment_history DROP CONSTRAINT IF EXISTS payment_history_user_id_fkey;
    ALTER TABLE payment_history DROP CONSTRAINT IF EXISTS payment_history_subscription_id_fkey;
  END IF;
END $$;

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscription_id UUID,
  paypal_subscription_id TEXT,
  transaction_id TEXT UNIQUE, -- PayPal transaction ID
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(50) NOT NULL, -- completed, pending, failed, refunded
  payment_method VARCHAR(50), -- paypal, credit_card, etc.
  description TEXT,
  invoice_id TEXT, -- Generated invoice ID
  receipt_url TEXT, -- PayPal receipt URL
  metadata JSONB, -- Additional payment data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payment_history_user_id_fkey' 
    AND table_name = 'payment_history'
  ) THEN
    ALTER TABLE payment_history 
    ADD CONSTRAINT payment_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payment_history_subscription_id_fkey' 
    AND table_name = 'payment_history'
  ) THEN
    ALTER TABLE payment_history 
    ADD CONSTRAINT payment_history_subscription_id_fkey 
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_transaction_id ON payment_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);

-- Enable RLS (Row Level Security)
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running the script)
DROP POLICY IF EXISTS "Users can view own payment history" ON payment_history;
DROP POLICY IF EXISTS "Service role can manage payment history" ON payment_history;

-- Policy: Users can only see their own payment history
CREATE POLICY "Users can view own payment history"
  ON payment_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for server-side operations)
CREATE POLICY "Service role can manage payment history"
  ON payment_history
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Add comment
COMMENT ON TABLE payment_history IS 'Stores payment transaction history for subscriptions';

