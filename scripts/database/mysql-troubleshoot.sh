#!/bin/bash

echo "🔍 MySQL Troubleshooting Script"
echo "================================="

# Check MySQL service
echo "1. Checking MySQL service status..."
if systemctl is-active --quiet mysql; then
    echo "✅ MySQL service is running"
else
    echo "❌ MySQL service is not running"
    echo "   Try: sudo systemctl start mysql"
    exit 1
fi

# Test different authentication methods
echo ""
echo "2. Testing MySQL authentication methods..."

echo "   Testing: mysql -uroot (no password)"
if mysql -uroot -e "SELECT 1;" >/dev/null 2>&1; then
    echo "   ✅ Works: mysql -uroot"
    WORKING_CMD="mysql -uroot"
else
    echo "   ❌ Failed: mysql -uroot"
fi

echo "   Testing: mysql -uroot -p'' (empty password)"
if mysql -uroot -p"" -e "SELECT 1;" >/dev/null 2>&1; then
    echo "   ✅ Works: mysql -uroot -p''"
    WORKING_CMD="mysql -uroot -p''"
else
    echo "   ❌ Failed: mysql -uroot -p''"
fi

echo "   Testing: sudo mysql (auth_socket)"
if sudo mysql -e "SELECT 1;" >/dev/null 2>&1; then
    echo "   ✅ Works: sudo mysql"
    WORKING_CMD="sudo mysql"
else
    echo "   ❌ Failed: sudo mysql"
fi

# If we found a working command, test creating database
if [ -n "$WORKING_CMD" ]; then
    echo ""
    echo "3. Testing database creation with: $WORKING_CMD"
    
    DB_NAME="helpdesk"
    DB_USER="hmrnexa"
    DB_PASS="7ynkgnqiiF6phLSRNHli"
    
    $WORKING_CMD <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL
    
    if [ $? -eq 0 ]; then
        echo "✅ Database and user created successfully!"
        echo ""
        echo "4. Testing new user connection..."
        if mysql -u"$DB_USER" -p"$DB_PASS" -e "USE $DB_NAME; SELECT 1;" >/dev/null 2>&1; then
            echo "✅ New user can connect to database"
            echo ""
            echo "🎉 MySQL setup is complete!"
            echo "   Database: $DB_NAME"
            echo "   User: $DB_USER"
            echo "   You can now run the deploy script again."
        else
            echo "❌ New user cannot connect to database"
        fi
    else
        echo "❌ Failed to create database and user"
    fi
else
    echo ""
    echo "❌ No working MySQL authentication method found!"
    echo ""
    echo "🔧 Manual solutions:"
    echo "1. Set MySQL root password:"
    echo "   sudo mysql_secure_installation"
    echo ""
    echo "2. Or reset root password:"
    echo "   sudo mysql"
    echo "   ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'newpassword';"
    echo "   FLUSH PRIVILEGES;"
    echo "   EXIT;"
    echo ""
    echo "3. Or use existing MySQL user if available"
fi

echo ""
echo "5. Current MySQL users:"
if [ -n "$WORKING_CMD" ]; then
    $WORKING_CMD -e "SELECT User, Host, plugin FROM mysql.user WHERE User IN ('root', 'hmrnexa');"
fi