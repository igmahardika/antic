#!/bin/bash

# Fix Database Schema Script for HMS
# This script fixes the users table schema mismatch

echo "🔧 Fixing HMS Database Schema Mismatch..."

# Database credentials from .env (what the backend actually uses)
DB_HOST="localhost"
DB_USER="hmrnexa"
DB_PASS="7ynkgnqiiF6phLSRNHli"
DB_NAME="helpdesk"

echo "📊 Connecting to database: $DB_NAME on $DB_HOST..."

# Execute the schema fix
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < fix-users-table-schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Database schema fixed successfully!"
    echo "🔍 Verifying the fix..."
    
    # Verify the table structure
    mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME -e "
        DESCRIBE users;
        SELECT COUNT(*) as user_count FROM users;
    "
    
    echo "🎉 Schema fix completed! The admin panel should now work correctly."
else
    echo "❌ Failed to fix database schema. Please check the error messages above."
    exit 1
fi
