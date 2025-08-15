-- Migration: Create users table with default data
-- Created: 2024-08-04
-- Description: Initialize users table with username, password, and role

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('super admin', 'admin', 'user') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
);

-- Insert default users with hashed passwords (bcrypt with salt rounds 10)
INSERT INTO users (username, password, role) VALUES
('admin', '$2b$10$xQX5h5rGz8yQ8vK4nJ2.9eF8rYwKbE1mK9tQ2vL3nH6sP7uR4wS8x', 'super admin'),
('manager', '$2b$10$yRY6i6sHz9zR9wL5oK3.0fG9sZxLcF2nL0uS3wM4oI7tQ8vS5xT9y', 'admin'),
('operator', '$2b$10$zSZ7j7tIz0aS0xM6pL4.1gH0tAyMdG3oM1vT4xN5pJ8uR9wT6yU0z', 'user'),
('user1', '$2b$10$aTa8k8uJa1bT1yN7qM5.2hI1uBzNhH4pN2wU5yO6qK9vS0xU7zV1a', 'user'),
('user2', '$2b$10$bUb9l9vKb2cU2zO8rN6.3iJ2vCaOiI5qO3xV6zP7rL0wT1yV8aW2b', 'user'),
('analyst', '$2b$10$cVc0m0wLc3dV3aP9sO7.4jK3wDbPjJ6rP4yW7aQ8sM1xU2zW9bX3c', 'admin');

-- Create sessions table for Redis backup
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    session_data JSON,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires (expires_at)
);

-- Create user_activity log table
CREATE TABLE IF NOT EXISTS user_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Create password_resets table
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires (expires_at)
);