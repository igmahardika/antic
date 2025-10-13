#!/bin/bash

# Complete MySQL setup and migration script for Helpdesk Management System
# This script will set up the database, run migrations, and start the services

echo "🚀 Helpdesk Management System - Complete MySQL Setup"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Step 1: Installing backend dependencies..."
cd helpdesk-backend
if [ ! -d "node_modules" ]; then
    npm install
else
    print_success "Backend dependencies already installed"
fi

print_status "Step 2: Setting up environment variables..."
if [ ! -f ".env" ]; then
    cp env.example .env
    print_success "Created .env file from example"
else
    print_success ".env file already exists"
fi

print_status "Step 3: Running database migrations..."
node run-migrations.js

if [ $? -eq 0 ]; then
    print_success "Database migrations completed successfully"
else
    print_error "Database migrations failed"
    exit 1
fi

print_status "Step 4: Installing frontend dependencies..."
cd ..
if [ ! -d "node_modules" ]; then
    npm install
else
    print_success "Frontend dependencies already installed"
fi

print_status "Step 5: Building frontend..."
npm run build

print_success "Setup completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Start the backend server:"
echo "   cd helpdesk-backend && npm start"
echo ""
echo "2. In another terminal, start the frontend:"
echo "   npm run dev"
echo ""
echo "3. Access the application:"
echo "   - Frontend: http://localhost:5173"
echo "   - Backend API: http://localhost:3001"
echo ""
echo "4. Login with default credentials:"
echo "   - Username: admin"
echo "   - Password: admin123"
echo ""
echo "5. Go to Admin Panel to migrate data from IndexedDB to MySQL"
echo ""
print_success "🎉 Helpdesk Management System is ready!"