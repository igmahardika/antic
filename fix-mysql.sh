#!/bin/bash

# Fix MySQL Authentication for HMS
echo "🔧 Fixing MySQL Authentication for HMS..."

# Stop MySQL
echo "Stopping MySQL service..."
systemctl stop mysql

# Start MySQL in safe mode  
echo "Starting MySQL in safe mode..."
mysqld_safe --skip-grant-tables --skip-networking &
MYSQL_PID=$!

# Wait for MySQL to start
sleep 10

# Reset root password and create user
echo "Resetting MySQL authentication..."
mysql -u root <<EOF
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY '';
FLUSH PRIVILEGES;
CREATE DATABASE IF NOT EXISTS hms_production_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'hms_user'@'localhost' IDENTIFIED BY 'HMS_SecurePassword2024';
GRANT ALL PRIVILEGES ON hms_production_db.* TO 'hms_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Kill safe mode MySQL
kill $MYSQL_PID
sleep 5

# Start MySQL normally
echo "Starting MySQL service normally..."
systemctl start mysql

# Test connection
echo "Testing connection..."
mysql -u hms_user -p'HMS_SecurePassword2024' -e "USE hms_production_db; SELECT 'Connection successful' as result;"

echo "✅ MySQL setup completed!"

