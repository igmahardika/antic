#!/bin/bash

# Database setup script for AN-TIC Analytics Dashboard
# This script creates all necessary tables and inserts default data

echo "🚀 Setting up AN-TIC Analytics Database..."

# Database credentials
DB_HOST="localhost"
DB_USER="hmrnexa"
DB_PASS="7ynkgnqiiF6phLSRNHli"
DB_NAME="helpdesk"

# Function to execute SQL
execute_sql() {
    mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME -e "$1" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ $2"
    else
        echo "❌ Failed: $2"
        exit 1
    fi
}

echo "📊 Creating database tables..."

# Create users table
execute_sql "CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('super admin','admin','user') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;" "Users table created"

# Insert default users
execute_sql "INSERT INTO users (username, password, role) VALUES 
('admin', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super admin'),
('manager', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('operator', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user'),
('user1', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user'),
('user2', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user'),
('analyst', '\$2b\$10\$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON DUPLICATE KEY UPDATE username=username;" "Default users inserted"

# Create user_sessions table
execute_sql "CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    session_data JSON,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires (expires_at)
);" "User sessions table created"

# Create user_activity table
execute_sql "CREATE TABLE IF NOT EXISTS user_activity (
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
);" "User activity table created"

# Create menu_permissions table
execute_sql "CREATE TABLE IF NOT EXISTS menu_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role ENUM('super admin', 'admin', 'user') NOT NULL UNIQUE,
    menus JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role)
);" "Menu permissions table created"

# Insert default menu permissions
execute_sql "INSERT INTO menu_permissions (role, menus) VALUES
('super admin', JSON_ARRAY('Dashboard', 'Data Grid', 'Customer Analytics', 'Ticket Analytics', 'Agent Analytics', 'Upload Data', 'Master Data Agent', 'Rumus Analytics', 'Admin Panel')),
('admin', JSON_ARRAY('Dashboard', 'Data Grid', 'Customer Analytics', 'Ticket Analytics', 'Agent Analytics', 'Upload Data', 'Master Data Agent', 'Rumus Analytics')),
('user', JSON_ARRAY('Dashboard', 'Data Grid', 'Customer Analytics', 'Ticket Analytics'))
ON DUPLICATE KEY UPDATE menus = VALUES(menus), updated_at = CURRENT_TIMESTAMP;" "Default menu permissions inserted"

# Create tickets table
execute_sql "CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(36) PRIMARY KEY,
    customer_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    cause TEXT,
    handling TEXT,
    open_time DATETIME NOT NULL,
    close_time DATETIME NULL,
    duration_raw_hours DECIMAL(10,2) DEFAULT 0,
    duration_formatted VARCHAR(50),
    close_handling TEXT,
    handling_duration_raw_hours DECIMAL(10,2) DEFAULT 0,
    handling_duration_formatted VARCHAR(50),
    classification VARCHAR(100),
    sub_classification VARCHAR(100),
    status VARCHAR(50) DEFAULT 'open',
    handling1 TEXT,
    close_handling1 TEXT,
    handling_duration1_raw_hours DECIMAL(10,2) DEFAULT 0,
    handling_duration1_formatted VARCHAR(50),
    handling2 TEXT,
    close_handling2 TEXT,
    handling_duration2_raw_hours DECIMAL(10,2) DEFAULT 0,
    handling_duration2_formatted VARCHAR(50),
    handling3 TEXT,
    close_handling3 TEXT,
    handling_duration3_raw_hours DECIMAL(10,2) DEFAULT 0,
    handling_duration3_formatted VARCHAR(50),
    handling4 TEXT,
    close_handling4 TEXT,
    handling_duration4_raw_hours DECIMAL(10,2) DEFAULT 0,
    handling_duration4_formatted VARCHAR(50),
    handling5 TEXT,
    close_handling5 TEXT,
    handling_duration5_raw_hours DECIMAL(10,2) DEFAULT 0,
    handling_duration5_formatted VARCHAR(50),
    open_by VARCHAR(255),
    cabang VARCHAR(100),
    upload_timestamp BIGINT NOT NULL,
    rep_class VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_open_time (open_time),
    INDEX idx_name (name),
    INDEX idx_upload_timestamp (upload_timestamp),
    INDEX idx_cabang (cabang),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_customer_id (customer_id),
    INDEX idx_rep_class (rep_class)
) ENGINE=InnoDB;" "Tickets table created"

# Create customers table
execute_sql "CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(255) PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    jenis_klien VARCHAR(100),
    layanan VARCHAR(100),
    kategori VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nama (nama),
    INDEX idx_jenis_klien (jenis_klien),
    INDEX idx_layanan (layanan),
    INDEX idx_kategori (kategori)
) ENGINE=InnoDB;" "Customers table created"

echo ""
echo "🎉 Database setup completed successfully!"
echo ""
echo "📋 Tables created:"
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME -e "SHOW TABLES;" 2>/dev/null

echo ""
echo "👥 Default users created:"
echo "   - admin (super admin) - Password: admin123"
echo "   - manager (admin) - Password: admin123" 
echo "   - operator (user) - Password: admin123"
echo "   - user1 (user) - Password: admin123"
echo "   - user2 (user) - Password: admin123"
echo "   - analyst (admin) - Password: admin123"
echo ""
echo "✅ Ready to start the application!"