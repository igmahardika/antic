-- Simple Database Setup for HMS
-- Run this as root user

-- Create database
CREATE DATABASE IF NOT EXISTS hms_production_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (try different approaches)
CREATE USER IF NOT EXISTS 'hms_user'@'localhost' IDENTIFIED BY 'HMS_SecurePassword2024';
CREATE USER IF NOT EXISTS 'hms_user'@'%' IDENTIFIED BY 'HMS_SecurePassword2024';

-- Grant privileges
GRANT ALL PRIVILEGES ON hms_production_db.* TO 'hms_user'@'localhost';
GRANT ALL PRIVILEGES ON hms_production_db.* TO 'hms_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Show users
SELECT User, Host FROM mysql.user WHERE User='hms_user';

-- Show result
SELECT 'HMS Database setup completed' as result;

