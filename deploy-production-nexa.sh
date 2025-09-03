#!/bin/bash

# =============================================================================
# PRODUCTION DEPLOYMENT SCRIPT - HMS NEXA
# =============================================================================
# Deploy Helpdesk Management System to:
# - Frontend: hms.nexa.net.id (/home/nexa-hms/htdocs/hms.nexa.net.id)
# - Backend API: api.hms.nexa.net.id (/home/nexa-api-hms/htdocs/api.hms.nexa.net.id)
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Deployment paths
FRONTEND_DEPLOY_PATH="/home/nexa-hms/htdocs/hms.nexa.net.id"
BACKEND_DEPLOY_PATH="/home/nexa-api-hms/htdocs/api.hms.nexa.net.id"
PROJECT_ROOT="/var/www/hms/antic"

# Functions for colored output
print_header() {
    echo -e "${PURPLE}==================================================================${NC}"
    echo -e "${PURPLE}  $1${NC}"
    echo -e "${PURPLE}==================================================================${NC}"
}

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

# Error handling
set -e
trap 'print_error "Deployment failed at line $LINENO. Exit code: $?"' ERR

# Check if running as root or with proper permissions
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. Make sure this is intended."
    fi
    
    # Check if deployment directories exist and are writable
    for path in "$FRONTEND_DEPLOY_PATH" "$BACKEND_DEPLOY_PATH"; do
        if [[ ! -d "$path" ]]; then
            print_error "Directory $path does not exist"
            exit 1
        fi
        
        if [[ ! -w "$path" ]]; then
            print_error "No write permission to $path"
            exit 1
        fi
    done
}

# Pre-deployment checks
pre_deployment_checks() {
    print_header "PRE-DEPLOYMENT CHECKS"
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        print_error "package.json not found in $PROJECT_ROOT"
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_status "Node.js version: $NODE_VERSION"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check if backend environment exists
    if [[ ! -f "helpdesk-backend/env.production" ]]; then
        print_error "Backend production environment file not found"
        exit 1
    fi
    
    print_success "Pre-deployment checks passed"
}

# Backup current deployment
backup_current_deployment() {
    print_header "CREATING BACKUP"
    
    BACKUP_DIR="/tmp/hms-backup-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup frontend
    if [[ -d "$FRONTEND_DEPLOY_PATH" ]] && [[ "$(ls -A $FRONTEND_DEPLOY_PATH)" ]]; then
        print_status "Backing up frontend to $BACKUP_DIR/frontend"
        cp -r "$FRONTEND_DEPLOY_PATH" "$BACKUP_DIR/frontend"
    fi
    
    # Backup backend
    if [[ -d "$BACKEND_DEPLOY_PATH" ]] && [[ "$(ls -A $BACKEND_DEPLOY_PATH)" ]]; then
        print_status "Backing up backend to $BACKUP_DIR/backend"
        cp -r "$BACKEND_DEPLOY_PATH" "$BACKUP_DIR/backend"
    fi
    
    print_success "Backup created at $BACKUP_DIR"
    echo "export HMS_BACKUP_DIR='$BACKUP_DIR'" > /tmp/hms_backup_path.sh
}

# Build frontend
build_frontend() {
    print_header "BUILDING FRONTEND"
    
    cd "$PROJECT_ROOT"
    
    # Copy production environment
    print_status "Setting up production environment"
    cp env.production .env.production
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm ci --only=production
    
    # Build for production
    print_status "Building frontend for production..."
    npm run build
    
    if [[ ! -d "dist" ]]; then
        print_error "Build failed - dist directory not found"
        exit 1
    fi
    
    print_success "Frontend build completed"
}

# Deploy frontend
deploy_frontend() {
    print_header "DEPLOYING FRONTEND"
    
    cd "$PROJECT_ROOT"
    
    # Clear destination directory (but keep .htaccess if exists)
    print_status "Clearing frontend deployment directory"
    find "$FRONTEND_DEPLOY_PATH" -mindepth 1 -not -name '.htaccess' -delete
    
    # Copy built files
    print_status "Copying frontend files to $FRONTEND_DEPLOY_PATH"
    cp -r dist/* "$FRONTEND_DEPLOY_PATH/"
    
    # Set proper permissions
    print_status "Setting file permissions"
    chmod -R 755 "$FRONTEND_DEPLOY_PATH"
    find "$FRONTEND_DEPLOY_PATH" -type f -exec chmod 644 {} \;
    
    # Create .htaccess for Apache (if needed)
    if [[ ! -f "$FRONTEND_DEPLOY_PATH/.htaccess" ]]; then
        print_status "Creating .htaccess for SPA routing"
        cat > "$FRONTEND_DEPLOY_PATH/.htaccess" << 'EOF'
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # Handle Angular/React Router
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Frame-Options SAMEORIGIN
    Header always set X-Content-Type-Options nosniff
    Header always set X-XSS-Protection "1; mode=block"
</IfModule>
EOF
    fi
    
    print_success "Frontend deployed successfully"
}

# Deploy backend
deploy_backend() {
    print_header "DEPLOYING BACKEND"
    
    cd "$PROJECT_ROOT"
    
    # Stop existing backend processes
    print_status "Stopping existing backend processes"
    pkill -f "node.*server.mjs" || true
    sleep 3
    
    # Clear backend deployment directory
    print_status "Clearing backend deployment directory"
    rm -rf "$BACKEND_DEPLOY_PATH"/*
    
    # Copy backend files
    print_status "Copying backend files to $BACKEND_DEPLOY_PATH"
    cp -r helpdesk-backend/* "$BACKEND_DEPLOY_PATH/"
    
    # Set up production environment
    print_status "Setting up backend production environment"
    cp helpdesk-backend/env.production "$BACKEND_DEPLOY_PATH/.env"
    
    # Install backend dependencies
    print_status "Installing backend dependencies"
    cd "$BACKEND_DEPLOY_PATH"
    npm ci --only=production
    
    # Set proper permissions
    chmod -R 755 "$BACKEND_DEPLOY_PATH"
    chmod 600 "$BACKEND_DEPLOY_PATH/.env"
    
    print_success "Backend deployed successfully"
}

# Start backend service
start_backend_service() {
    print_header "STARTING BACKEND SERVICE"
    
    cd "$BACKEND_DEPLOY_PATH"
    
    # Start backend with PM2 (if available) or nohup
    if command -v pm2 &> /dev/null; then
        print_status "Starting backend with PM2"
        pm2 delete hms-backend || true
        pm2 start server.mjs --name hms-backend --env production
        pm2 save
    else
        print_status "Starting backend with nohup"
        nohup node server.mjs > /var/log/hms-backend.log 2>&1 &
        echo $! > /var/run/hms-backend.pid
    fi
    
    # Wait for service to start
    sleep 5
    
    print_success "Backend service started"
}

# Configure web server
configure_webserver() {
    print_header "CONFIGURING WEB SERVER"
    
    # Check if nginx is available
    if command -v nginx &> /dev/null; then
        print_status "Configuring Nginx"
        
        # Copy nginx configuration
        if [[ -f "$PROJECT_ROOT/nginx-sites-available-hms.conf" ]]; then
            print_status "Installing Nginx configuration"
            cp "$PROJECT_ROOT/nginx-sites-available-hms.conf" /etc/nginx/sites-available/hms-nexa
            
            # Enable site
            ln -sf /etc/nginx/sites-available/hms-nexa /etc/nginx/sites-enabled/
            
            # Test nginx configuration
            if nginx -t; then
                print_status "Reloading Nginx"
                systemctl reload nginx
                print_success "Nginx configured and reloaded"
            else
                print_error "Nginx configuration test failed"
            fi
        else
            print_warning "Nginx configuration file not found"
        fi
    else
        print_warning "Nginx not found. Please configure your web server manually"
    fi
}

# Health checks
run_health_checks() {
    print_header "RUNNING HEALTH CHECKS"
    
    # Wait for services to stabilize
    sleep 10
    
    # Check backend health
    print_status "Checking backend health..."
    BACKEND_HEALTH=$(curl -s http://localhost:3001/health | jq -r '.status' 2>/dev/null || echo "failed")
    
    if [[ "$BACKEND_HEALTH" == "ok" ]]; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
        print_status "Backend logs:"
        tail -20 /var/log/hms-backend.log
        exit 1
    fi
    
    # Check frontend accessibility
    print_status "Checking frontend accessibility..."
    if [[ -f "$FRONTEND_DEPLOY_PATH/index.html" ]]; then
        print_success "Frontend deployment verified"
    else
        print_error "Frontend index.html not found"
        exit 1
    fi
    
    print_success "All health checks passed"
}

# Post-deployment tasks
post_deployment() {
    print_header "POST-DEPLOYMENT TASKS"
    
    # Clean up build artifacts
    print_status "Cleaning up build artifacts"
    rm -rf "$PROJECT_ROOT/dist"
    rm -f "$PROJECT_ROOT/.env.production"
    
    # Create deployment info file
    cat > "$FRONTEND_DEPLOY_PATH/deployment-info.json" << EOF
{
    "deployment_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "deployed_by": "$(whoami)",
    "version": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
    "environment": "production",
    "frontend_path": "$FRONTEND_DEPLOY_PATH",
    "backend_path": "$BACKEND_DEPLOY_PATH"
}
EOF
    
    print_success "Post-deployment tasks completed"
}

# Main deployment function
main() {
    print_header "HMS NEXA - PRODUCTION DEPLOYMENT"
    echo -e "${BLUE}Frontend: https://hms.nexa.net.id${NC}"
    echo -e "${BLUE}Backend API: https://api.hms.nexa.net.id${NC}"
    echo ""
    
    # Confirm deployment
    read -p "Are you sure you want to deploy to production? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled"
        exit 0
    fi
    
    # Record start time
    START_TIME=$(date +%s)
    
    # Run deployment steps
    check_permissions
    pre_deployment_checks
    backup_current_deployment
    build_frontend
    deploy_frontend
    deploy_backend
    start_backend_service
    configure_webserver
    run_health_checks
    post_deployment
    
    # Calculate deployment time
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    # Success message
    print_header "DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo -e "${GREEN}🎉 HMS Nexa is now live!${NC}"
    echo ""
    echo -e "${BLUE}📋 Application URLs:${NC}"
    echo -e "   Frontend: https://hms.nexa.net.id"
    echo -e "   API: https://api.hms.nexa.net.id"
    echo ""
    echo -e "${BLUE}📊 Deployment Info:${NC}"
    echo -e "   Duration: ${DURATION}s"
    echo -e "   Frontend Path: $FRONTEND_DEPLOY_PATH"
    echo -e "   Backend Path: $BACKEND_DEPLOY_PATH"
    echo ""
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo -e "   View backend logs: tail -f /var/log/hms-backend.log"
    echo -e "   Check backend status: curl http://localhost:3001/health"
    echo -e "   Restart backend: systemctl restart hms-backend"
    echo ""
    
    if [[ -f "/tmp/hms_backup_path.sh" ]]; then
        source /tmp/hms_backup_path.sh
        echo -e "${YELLOW}💾 Backup Location: $HMS_BACKUP_DIR${NC}"
    fi
}

# Run main function
main "$@"

