#!/bin/bash

# Production deployment script for Helpdesk Management System
# This script builds and deploys the application to production

echo "🚀 Helpdesk Management System - Production Deployment"
echo "====================================================="

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

print_status "Step 1: Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

print_status "Step 2: Building frontend..."
npm run build
if [ $? -ne 0 ]; then
    print_error "Failed to build frontend"
    exit 1
fi

print_status "Step 3: Deploying to web server..."
cp -r dist/* /home/nexa-hms/htdocs/hms.nexa.net.id/
if [ $? -ne 0 ]; then
    print_error "Failed to deploy frontend"
    exit 1
fi

print_status "Step 4: Installing backend dependencies..."
cd helpdesk-backend
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install backend dependencies"
    exit 1
fi

print_status "Step 5: Restarting backend service..."
# Kill existing processes
pkill -f "node.*server.mjs" || true
sleep 2

# Start backend in background
nohup node server.mjs > /var/log/helpdesk-backend.log 2>&1 &
if [ $? -eq 0 ]; then
    print_success "Backend service started"
else
    print_error "Failed to start backend service"
    exit 1
fi

print_status "Step 6: Reloading Nginx..."
systemctl reload nginx
if [ $? -eq 0 ]; then
    print_success "Nginx reloaded"
else
    print_error "Failed to reload Nginx"
    exit 1
fi

print_status "Step 7: Testing deployment..."
sleep 3

# Test API health
API_HEALTH=$(curl -s https://api.hms.nexa.net.id/health | grep -o '"status":"ok"')
if [ "$API_HEALTH" = '"status":"ok"' ]; then
    print_success "API health check passed"
else
    print_error "API health check failed"
    exit 1
fi

# Test frontend
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://hms.nexa.net.id)
if [ "$FRONTEND_STATUS" = "200" ]; then
    print_success "Frontend deployment verified"
else
    print_error "Frontend deployment failed"
    exit 1
fi

print_success "🎉 Deployment completed successfully!"
echo ""
echo "📋 Application URLs:"
echo "   - Frontend: https://hms.nexa.net.id"
echo "   - Admin Panel: https://hms.nexa.net.id/admin"
echo "   - API: https://api.hms.nexa.net.id"
echo ""
echo "🔑 Default Login Credentials:"
echo "   - Username: admin"
echo "   - Password: admin123"
echo "   - Role: super admin"
echo ""
echo "📊 Backend Log:"
echo "   tail -f /var/log/helpdesk-backend.log"
echo ""
print_success "✅ Helpdesk Management System is live!"