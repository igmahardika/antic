-- Reset admin password to Kin6ArthUr
USE helpdesk;

-- Update admin password with bcrypt hash
-- Kin6ArthUr = $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewbynxU.6qC9MzT2
UPDATE users 
SET password = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewbynxU.6qC9MzT2',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin';

-- Verify the update
SELECT id, username, role, is_active, updated_at FROM users WHERE username = 'admin';
