-- Fix Database Access for HMS User
USE mysql;

-- Drop existing user if exists (ignore errors)
DROP USER IF EXISTS 'hms_user'@'localhost';
DROP USER IF EXISTS 'hms_user'@'%';

-- Create database
CREATE DATABASE IF NOT EXISTS hms_production_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user with proper privileges
CREATE USER 'hms_user'@'localhost' IDENTIFIED BY 'HMS_SecurePassword2024';
CREATE USER 'hms_user'@'%' IDENTIFIED BY 'HMS_SecurePassword2024';

-- Grant all privileges
GRANT ALL PRIVILEGES ON hms_production_db.* TO 'hms_user'@'localhost';
GRANT ALL PRIVILEGES ON hms_production_db.* TO 'hms_user'@'%';
GRANT ALL PRIVILEGES ON *.* TO 'hms_user'@'localhost';
GRANT ALL PRIVILEGES ON *.* TO 'hms_user'@'%';

-- Flush privileges
FLUSH PRIVILEGES;

-- Show users to verify
SELECT User, Host FROM mysql.user WHERE User = 'hms_user';

-- Test connection info
SELECT 'Database setup completed successfully' as status;

