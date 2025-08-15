-- Migration: Create menu_permissions table
-- Created: 2024-12-20
-- Description: Initialize menu_permissions table for role-based access control

CREATE TABLE IF NOT EXISTS menu_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('super admin', 'admin', 'user') NOT NULL UNIQUE,
    menus JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role)
);

-- Insert default menu permissions
INSERT INTO menu_permissions (role, menus) VALUES
('super admin', JSON_ARRAY('Dashboard', 'Data Grid', 'Customer Analytics', 'Ticket Analytics', 'Agent Analytics', 'Upload Data', 'Master Data Agent', 'Rumus Analytics', 'Admin Panel')),
('admin', JSON_ARRAY('Dashboard', 'Data Grid', 'Customer Analytics', 'Ticket Analytics', 'Agent Analytics', 'Upload Data', 'Master Data Agent', 'Rumus Analytics')),
('user', JSON_ARRAY('Dashboard', 'Data Grid', 'Customer Analytics', 'Ticket Analytics'))
ON DUPLICATE KEY UPDATE 
    menus = VALUES(menus),
    updated_at = CURRENT_TIMESTAMP;