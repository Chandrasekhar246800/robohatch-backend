-- Migration 004: Add Payment Fields to Orders Table
-- Adds Razorpay payment tracking to existing orders

-- Add payment-related columns to orders table
ALTER TABLE orders
  ADD COLUMN payment_provider VARCHAR(50) DEFAULT 'razorpay' COMMENT 'Payment gateway used',
  ADD COLUMN payment_id VARCHAR(255) NULL COMMENT 'Razorpay payment_id after successful payment',
  ADD COLUMN payment_status ENUM('created', 'paid', 'failed') DEFAULT 'created' COMMENT 'Payment state',
  ADD COLUMN razorpay_order_id VARCHAR(255) NULL COMMENT 'Razorpay order_id for tracking',
  ADD INDEX idx_payment_status (payment_status),
  ADD INDEX idx_razorpay_order_id (razorpay_order_id);

-- Verify changes
DESCRIBE orders;

-- Expected new columns:
-- payment_provider    VARCHAR(50)    NOT NULL   DEFAULT 'razorpay'
-- payment_id          VARCHAR(255)   NULL
-- payment_status      ENUM           NOT NULL   DEFAULT 'created'
-- razorpay_order_id   VARCHAR(255)   NULL
