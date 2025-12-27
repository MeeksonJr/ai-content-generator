-- Refunds Management Migration
-- Adds refund tracking to payment_history table

-- Add refund-related columns to payment_history if they don't exist
DO $$
BEGIN
  -- Add refund_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payment_history' AND column_name = 'refund_status') THEN
    ALTER TABLE payment_history 
    ADD COLUMN refund_status VARCHAR(50) DEFAULT NULL;
  END IF;

  -- Add refund_amount column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payment_history' AND column_name = 'refund_amount') THEN
    ALTER TABLE payment_history 
    ADD COLUMN refund_amount DECIMAL(10, 2) DEFAULT NULL;
  END IF;

  -- Add refund_currency column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payment_history' AND column_name = 'refund_currency') THEN
    ALTER TABLE payment_history 
    ADD COLUMN refund_currency VARCHAR(10) DEFAULT NULL;
  END IF;

  -- Add refund_id column (PayPal refund ID)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payment_history' AND column_name = 'refund_id') THEN
    ALTER TABLE payment_history 
    ADD COLUMN refund_id VARCHAR(255) DEFAULT NULL;
  END IF;

  -- Add refund_reason column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payment_history' AND column_name = 'refund_reason') THEN
    ALTER TABLE payment_history 
    ADD COLUMN refund_reason TEXT DEFAULT NULL;
  END IF;

  -- Add refunded_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payment_history' AND column_name = 'refunded_at') THEN
    ALTER TABLE payment_history 
    ADD COLUMN refunded_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;

  -- Add refunded_by column (user_id of admin who processed refund)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'payment_history' AND column_name = 'refunded_by') THEN
    ALTER TABLE payment_history 
    ADD COLUMN refunded_by UUID DEFAULT NULL;
  END IF;
END $$;

-- Create index for refund queries
CREATE INDEX IF NOT EXISTS idx_payment_history_refund_status 
ON payment_history(refund_status) WHERE refund_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_history_refund_id 
ON payment_history(refund_id) WHERE refund_id IS NOT NULL;

-- Add comment to columns
COMMENT ON COLUMN payment_history.refund_status IS 'Status of refund: pending, completed, failed, partial';
COMMENT ON COLUMN payment_history.refund_amount IS 'Amount refunded (can be partial)';
COMMENT ON COLUMN payment_history.refund_currency IS 'Currency of refund';
COMMENT ON COLUMN payment_history.refund_id IS 'PayPal refund transaction ID';
COMMENT ON COLUMN payment_history.refund_reason IS 'Reason for refund';
COMMENT ON COLUMN payment_history.refunded_at IS 'Timestamp when refund was processed';
COMMENT ON COLUMN payment_history.refunded_by IS 'User ID of admin who processed the refund';

