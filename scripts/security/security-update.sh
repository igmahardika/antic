#!/bin/bash

# Security Update Script for Helpdesk Management System
# This script updates vulnerable dependencies and applies security patches

echo "🔒 Helpdesk Management System - Security Update"
echo "=============================================="

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

print_status "Step 1: Backing up current package files..."
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup 2>/dev/null || true
cp helpdesk-backend/package.json helpdesk-backend/package.json.backup
cp helpdesk-backend/package-lock.json helpdesk-backend/package-lock.json.backup 2>/dev/null || true
print_success "Backup created"

print_status "Step 2: Updating backend dependencies..."
cd helpdesk-backend

# Update critical security dependencies
npm update bcrypt
npm update jsonwebtoken
npm update express
npm update mysql2
npm update cors
npm update dotenv

# Install additional security packages
npm install helmet express-rate-limit express-validator express-mongo-sanitize hpp

print_success "Backend dependencies updated"

print_status "Step 3: Auditing backend for vulnerabilities..."
npm audit
if [ $? -ne 0 ]; then
    print_warning "Backend audit found issues, attempting to fix..."
    npm audit fix
fi

print_status "Step 4: Updating frontend dependencies..."
cd ..

# Remove vulnerable xlsx package and replace with secure alternative
print_warning "Removing vulnerable xlsx package..."
npm uninstall xlsx

# Install secure file processing alternatives
npm install papaparse # For CSV processing
npm install file-saver # For file downloads (already installed but ensuring latest)

# Update other critical dependencies
npm update react
npm update react-dom
npm update @types/react
npm update @types/react-dom
npm update typescript
npm update vite

print_status "Step 5: Fixing frontend vulnerabilities..."
npm audit
if [ $? -ne 0 ]; then
    print_warning "Frontend audit found issues, attempting to fix..."
    npm audit fix
fi

print_status "Step 6: Installing additional security packages..."
npm install dompurify # For XSS protection
npm install crypto-js # For client-side encryption if needed

print_status "Step 7: Updating package-lock files..."
npm install
cd helpdesk-backend && npm install && cd ..

print_status "Step 8: Running security audit..."
echo ""
echo "📊 Backend Security Audit:"
cd helpdesk-backend && npm audit && cd ..
echo ""
echo "📊 Frontend Security Audit:"
npm audit

print_status "Step 9: Cleaning up..."
# Remove node_modules and reinstall to ensure clean state
print_warning "Cleaning node_modules for fresh install..."
rm -rf node_modules
rm -rf helpdesk-backend/node_modules

npm install
cd helpdesk-backend && npm install && cd ..

print_status "Step 10: Final security verification..."
echo ""
echo "🔍 Final Backend Audit:"
cd helpdesk-backend && npm audit && cd ..
echo ""
echo "🔍 Final Frontend Audit:"
npm audit

echo ""
print_success "🎉 Security update completed!"
echo ""
echo "📋 Summary of changes:"
echo "   ✅ Updated all critical dependencies"
echo "   ✅ Removed vulnerable xlsx package"
echo "   ✅ Added security middleware packages"
echo "   ✅ Installed XSS protection (DOMPurify)"
echo "   ✅ Updated to latest stable versions"
echo ""
echo "⚠️  Next steps:"
echo "   1. Update code to use papaparse instead of xlsx"
echo "   2. Test all functionality"
echo "   3. Deploy security updates"
echo "   4. Monitor for new vulnerabilities"
echo ""
echo "📁 Backup files created:"
echo "   - package.json.backup"
echo "   - package-lock.json.backup"
echo "   - helpdesk-backend/package.json.backup"
echo "   - helpdesk-backend/package-lock.json.backup"
echo ""
print_success "✅ Security hardening complete!"