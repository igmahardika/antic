-- Final fix for admin password
USE helpdesk;

-- Update admin password with a hash that definitely works
-- This is the hash from the migration file for password: admin123
UPDATE users 
SET password = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin';

-- Also create a new user with a simple password for testing
INSERT INTO users (username, password, role) VALUES 
('testadmin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON DUPLICATE KEY UPDATE 
    password = VALUES(password),
    updated_at = CURRENT_TIMESTAMP;

-- Verify the updates
SELECT id, username, role, LEFT(password, 20) as password_start, updated_at FROM users WHERE username IN ('admin', 'testadmin');
