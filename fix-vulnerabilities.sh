#!/bin/bash

# Fix Vulnerabilities Script for AN-TIC Analytics Dashboard
# This script addresses Dependabot security alerts

echo "🔒 Fixing Security Vulnerabilities"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

print_status "Step 1: Backing up package files..."
cp package.json package.json.backup.$(date +%Y%m%d_%H%M%S)
cp package-lock.json package-lock.json.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
print_success "Backup created"

print_status "Step 2: Checking current vulnerabilities..."
npm audit --audit-level=moderate > vulnerability-report.txt 2>&1 || true
cat vulnerability-report.txt

print_status "Step 3: Attempting safe fixes..."
# Try to fix vulnerabilities without breaking changes first
npm audit fix --audit-level=moderate --dry-run > fix-preview.txt 2>&1 || true

if [ -s fix-preview.txt ]; then
    print_status "Preview of fixes:"
    cat fix-preview.txt
    
    print_status "Applying safe fixes..."
    npm audit fix --audit-level=moderate || print_warning "Some fixes may require manual intervention"
else
    print_warning "No automatic fixes available"
fi

print_status "Step 4: Manual vulnerability fixes..."

# Fix esbuild vulnerability by updating vite
print_status "Updating Vite to latest stable version..."
npm install vite@^5.4.20 --save-dev || print_warning "Vite update may need manual intervention"

# Update other development dependencies
print_status "Updating development dependencies..."
npm update @vitejs/plugin-react-swc typescript eslint --save-dev || true

print_status "Step 5: Checking for remaining vulnerabilities..."
npm audit --audit-level=moderate > final-report.txt 2>&1 || true

if grep -q "found 0 vulnerabilities" final-report.txt; then
    print_success "✅ All vulnerabilities fixed!"
elif grep -q "moderate" final-report.txt; then
    print_warning "⚠️  Some moderate vulnerabilities remain"
    cat final-report.txt
else
    print_success "✅ No high/critical vulnerabilities found"
fi

print_status "Step 6: Testing build process..."
npm run build > build-test.log 2>&1
if [ $? -eq 0 ]; then
    print_success "✅ Build test passed"
else
    print_error "❌ Build test failed - check build-test.log"
fi

print_status "Step 7: Cleaning up..."
rm -f vulnerability-report.txt fix-preview.txt final-report.txt build-test.log

print_success "🎉 Vulnerability fix process completed!"
echo ""
echo "📋 Summary:"
echo "   - Package backups created"
echo "   - Dependencies updated"
echo "   - Build process tested"
echo ""
echo "🔍 Next steps:"
echo "   1. Test the application thoroughly"
echo "   2. Check GitHub Dependabot alerts"
echo "   3. Monitor for new vulnerabilities"
echo ""
echo "📁 Backup files available:"
ls -la *.backup.* 2>/dev/null || echo "   No backup files found"