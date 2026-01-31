-- Update custom_designs table for STL file uploads
-- Run this SQL in your AWS RDS MySQL database

-- Add new columns for STL file metadata
ALTER TABLE custom_designs 
  CHANGE COLUMN image_url file_url TEXT,
  ADD COLUMN file_name VARCHAR(255) AFTER file_url,
  ADD COLUMN file_size INT AFTER file_name,
  ADD COLUMN file_type VARCHAR(50) DEFAULT 'stl' AFTER file_size;

-- Verify changes
DESCRIBE custom_designs;
