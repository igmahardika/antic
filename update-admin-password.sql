-- Update admin password with valid bcrypt hash for Kin6ArthUr
USE helpdesk;

-- Update admin password with a valid bcrypt hash
-- This hash was generated with bcrypt using 12 salt rounds
UPDATE users 
SET password = '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin';

-- Verify the update
SELECT id, username, role, LEFT(password, 20) as password_start, updated_at FROM users WHERE username = 'admin';
