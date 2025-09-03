-- Test with a simple password that we know works
USE helpdesk;

-- Update admin password with a known working hash (password: admin123)
UPDATE users 
SET password = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin';

-- Verify the update
SELECT id, username, role, LEFT(password, 20) as password_start, updated_at FROM users WHERE username = 'admin';
