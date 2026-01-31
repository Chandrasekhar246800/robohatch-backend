-- Update order_items table to support custom STL designs
-- Run this SQL in your AWS RDS MySQL database

-- Modify order_items to support both products and custom designs
ALTER TABLE order_items 
  MODIFY COLUMN product_id INT NULL,
  ADD COLUMN custom_design_id INT NULL AFTER product_id,
  CHANGE COLUMN price price_at_order DECIMAL(10, 2) NOT NULL,
  ADD CONSTRAINT chk_product_or_design 
    CHECK ((product_id IS NOT NULL AND custom_design_id IS NULL) OR 
           (product_id IS NULL AND custom_design_id IS NOT NULL)),
  ADD CONSTRAINT fk_order_items_design 
    FOREIGN KEY (custom_design_id) REFERENCES custom_designs(id) ON DELETE RESTRICT;

-- Add index on custom_design_id
CREATE INDEX idx_order_items_design ON order_items(custom_design_id);

-- Verify changes
DESCRIBE order_items;

-- Expected structure:
-- id, order_id, product_id (NULL), custom_design_id (NULL), quantity, price_at_order
