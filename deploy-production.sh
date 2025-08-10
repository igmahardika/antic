#!/bin/bash

# Production deployment script for AN-TIC Analytics Dashboard
# This script builds and deploys the application to production

echo "🚀 AN-TIC Analytics Dashboard - Production Deployment"
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

# Check available disk space (require at least 1GB free)
AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
if [ "$AVAILABLE_SPACE" -lt 1048576 ]; then
    print_warning "Low disk space detected. Cleaning up..."
    
    # Clean npm cache
    print_status "Cleaning npm cache..."
    npm cache clean --force 2>/dev/null || true
    rm -rf /root/.npm/_cacache /root/.npm/_logs/* 2>/dev/null || true
    
    # Clean apt cache
    print_status "Cleaning apt cache..."
    apt-get clean 2>/dev/null || true
    
    # Clean old logs
    print_status "Cleaning old logs..."
    journalctl --vacuum-time=7d 2>/dev/null || true
    
    # Check space again
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 1048576 ]; then
        print_error "Insufficient disk space. Please free up more space manually."
        print_error "Available: $(df -h / | awk 'NR==2 {print $4}')"
        exit 1
    else
        print_success "Disk cleanup completed. Available: $(df -h / | awk 'NR==2 {print $4}')"
    fi
fi

print_status "Step 1: Installing dependencies..."
# Install dev dependencies first for TypeScript and build tools
npm install
if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies"
    exit 1
fi

print_status "Step 2: Building frontend..."
# Set environment variables for headless build with software rendering
export NODE_ENV=production
export QT_QPA_PLATFORM=offscreen
export LIBGL_ALWAYS_SOFTWARE=1
export MESA_GL_VERSION_OVERRIDE=3.3
export MESA_GLSL_VERSION_OVERRIDE=330
export GALLIUM_DRIVER=llvmpipe
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_SKIP_DOWNLOAD=true

print_status "Building with software rendering..."
npm run build
if [ $? -ne 0 ]; then
    print_error "Failed to build frontend"
    exit 1
fi

# Clean up after build to save space
print_status "Cleaning up build artifacts..."
rm -rf node_modules/.cache 2>/dev/null || true
npm cache clean --force 2>/dev/null || true

print_status "Step 3: Deploying to web server..."
cp -r dist/* /home/nexa-hms/htdocs/hms.nexa.net.id/
if [ $? -ne 0 ]; then
    print_error "Failed to deploy frontend"
    exit 1
fi

print_status "Step 4: Installing backend dependencies..."
cd antic-backend
# Check if backend dependencies are already installed
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    npm ci --only=production --no-optional --ignore-scripts
    if [ $? -ne 0 ]; then
        print_warning "Backend production install failed, trying regular install..."
        npm install --no-optional
        if [ $? -ne 0 ]; then
            print_error "Failed to install backend dependencies"
            exit 1
        fi
    fi
else
    print_success "Backend dependencies already installed, skipping..."
fi

# Clean backend cache
npm cache clean --force 2>/dev/null || true

print_status "Step 5: Restarting backend service..."
# Kill existing processes
pkill -f "node.*server.mjs" || true
sleep 2

# Start backend in background
nohup node server.mjs > /var/log/antic-backend.log 2>&1 &
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
echo "   tail -f /var/log/antic-backend.log"
echo ""
print_success "✅ AN-TIC Analytics Dashboard is live!"