#!/bin/bash

# Helpdesk Management System - Automated Setup Script
# This script automates the setup process for the entire application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${BLUE}🚀 $1${NC}"
    echo "=================================================="
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_header "Checking Prerequisites"
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        log_success "Node.js found: $NODE_VERSION"
    else
        log_error "Node.js not found. Please install Node.js >= 18.0.0"
        exit 1
    fi
    
    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        log_success "npm found: $NPM_VERSION"
    else
        log_error "npm not found. Please install npm"
        exit 1
    fi
    
    # Check MySQL
    if command_exists mysql; then
        MYSQL_VERSION=$(mysql --version)
        log_success "MySQL found: $MYSQL_VERSION"
    else
        log_error "MySQL not found. Please install MySQL >= 8.0"
        exit 1
    fi
    
    # Check Redis (optional)
    if command_exists redis-cli; then
        REDIS_VERSION=$(redis-cli --version)
        log_success "Redis found: $REDIS_VERSION"
        REDIS_AVAILABLE=true
    else
        log_warning "Redis not found. Will use memory cache fallback"
        REDIS_AVAILABLE=false
    fi
    
    log_success "Prerequisites check completed"
}

# Setup database
setup_database() {
    log_header "Setting up Database"
    
    # Prompt for database credentials
    echo "Please provide MySQL credentials:"
    read -p "MySQL root username (default: root): " DB_ROOT_USER
    DB_ROOT_USER=${DB_ROOT_USER:-root}
    
    read -s -p "MySQL root password: " DB_ROOT_PASS
    echo
    
    read -p "Database name (default: antic_db): " DB_NAME
    DB_NAME=${DB_NAME:-antic_db}
    
    read -p "Create dedicated user? (y/n, default: y): " CREATE_USER
    CREATE_USER=${CREATE_USER:-y}
    
    if [[ $CREATE_USER == "y" ]]; then
        read -p "Database username (default: antic_user): " DB_USER
        DB_USER=${DB_USER:-antic_user}
        
        read -s -p "Database password: " DB_PASS
        echo
    else
        DB_USER=$DB_ROOT_USER
        DB_PASS=$DB_ROOT_PASS
    fi
    
    # Create database and user
    log_info "Creating database and user..."
    
    mysql -u "$DB_ROOT_USER" -p"$DB_ROOT_PASS" << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF
    
    if [[ $CREATE_USER == "y" && $DB_USER != $DB_ROOT_USER ]]; then
        mysql -u "$DB_ROOT_USER" -p"$DB_ROOT_PASS" << EOF
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
    fi
    
    log_success "Database setup completed"
}

# Setup Redis
setup_redis() {
    if [[ $REDIS_AVAILABLE == true ]]; then
        log_header "Setting up Redis"
        
        # Test Redis connection
        if redis-cli ping > /dev/null 2>&1; then
            log_success "Redis is running and accessible"
            
            read -p "Set Redis password? (y/n, default: n): " SET_REDIS_PASS
            SET_REDIS_PASS=${SET_REDIS_PASS:-n}
            
            if [[ $SET_REDIS_PASS == "y" ]]; then
                read -s -p "Redis password: " REDIS_PASSWORD
                echo
                redis-cli CONFIG SET requirepass "$REDIS_PASSWORD"
                log_success "Redis password set"
            else
                REDIS_PASSWORD=""
            fi
        else
            log_warning "Redis is not running. Starting Redis..."
            if command_exists systemctl; then
                sudo systemctl start redis-server
            elif command_exists brew; then
                brew services start redis
            else
                log_error "Cannot start Redis automatically. Please start Redis manually."
                exit 1
            fi
        fi
    else
        log_info "Skipping Redis setup (not available)"
        REDIS_PASSWORD=""
    fi
}

# Setup backend
setup_backend() {
    log_header "Setting up Backend"
    
    cd helpdesk-backend
    
    # Install dependencies
    log_info "Installing backend dependencies..."
    npm install
    log_success "Backend dependencies installed"
    
    # Create .env file
    log_info "Creating environment configuration..."
    
    # Generate secrets
    JWT_SECRET=$(openssl rand -base64 32)
    SESSION_SECRET=$(openssl rand -base64 32)
    
    cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DB_NAME=$DB_NAME
DB_PORT=3306

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_DB=0

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Session Configuration
SESSION_SECRET=$SESSION_SECRET
SESSION_MAX_AGE=86400000

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
EOF
    
    log_success "Environment configuration created"
    
    # Run migrations
    log_info "Running database migrations..."
    npm run migrate
    log_success "Database migrations completed"
    
    cd ..
}

# Setup frontend
setup_frontend() {
    log_header "Setting up Frontend"
    
    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm install
    log_success "Frontend dependencies installed"
    
    # Create API configuration
    log_info "Creating API configuration..."
    mkdir -p src/lib
    
    cat > src/lib/config.ts << EOF
export const API_CONFIG = {
  baseURL: 'http://localhost:3001',
  timeout: 10000,
  retries: 3
};

export const APP_CONFIG = {
      name: 'Helpdesk Management System',
  version: '1.0.0',
  description: 'Insightful Ticket Analytics & Agent Performance'
};
EOF
    
    log_success "API configuration created"
}

# Test setup
test_setup() {
    log_header "Testing Setup"
    
    # Start backend in background
    log_info "Starting backend server..."
    cd helpdesk-backend
    npm start &
    BACKEND_PID=$!
    cd ..
    
    # Wait for backend to start
    sleep 5
    
    # Test health endpoint
    log_info "Testing backend health..."
    if curl -s http://localhost:3001/health > /dev/null; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    # Test login endpoint
    log_info "Testing login endpoint..."
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/login \
        -H "Content-Type: application/json" \
        -d '{"username": "admin", "password": "admin123"}')
    
    if echo "$LOGIN_RESPONSE" | grep -q "success"; then
        log_success "Login test passed"
    else
        log_error "Login test failed"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    # Stop backend
    kill $BACKEND_PID 2>/dev/null || true
    sleep 2
    
    log_success "All tests passed"
}

# Create startup scripts
create_startup_scripts() {
    log_header "Creating Startup Scripts"
    
    # Backend startup script
    cat > start-backend.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Helpdesk Management System Backend..."
cd helpdesk-backend
npm start
EOF
    
    # Frontend startup script
    cat > start-frontend.sh << 'EOF'
#!/bin/bash
echo "🌐 Starting Helpdesk Management System Frontend..."
npm run dev
EOF
    
    # Combined startup script
    cat > start-all.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting Helpdesk Management System..."

# Start backend in background
echo "Starting backend..."
cd helpdesk-backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 5

# Start frontend
echo "Starting frontend..."
npm run dev &
FRONTEND_PID=$!

echo "✅ Both servers started!"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for interrupt
trap 'echo "Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT
wait
EOF
    
    # Make scripts executable
    chmod +x start-backend.sh start-frontend.sh start-all.sh
    
    log_success "Startup scripts created"
}

# Print final instructions
print_final_instructions() {
    log_header "Setup Complete!"
    
    echo -e "${GREEN}🎉 Helpdesk Management System setup completed successfully!${NC}\n"
    
    echo "📋 Default Users Created:"
    echo "  • Username: admin     | Password: admin123     | Role: super admin"
    echo "  • Username: manager   | Password: manager123   | Role: admin"
    echo "  • Username: operator  | Password: operator123  | Role: user"
    echo ""
    
    echo "🚀 How to start the application:"
    echo "  • Start everything: ./start-all.sh"
    echo "  • Start backend only: ./start-backend.sh"
    echo "  • Start frontend only: ./start-frontend.sh"
    echo ""
    
    echo "🌐 URLs:"
    echo "  • Frontend: http://localhost:5173"
    echo "  • Backend API: http://localhost:3001"
    echo "  • Health Check: http://localhost:3001/health"
    echo ""
    
    echo "📚 Documentation:"
    echo "  • Setup Guide: SETUP_GUIDE.md"
    echo "  • Backend API: helpdesk-backend/README.md"
    echo ""
    
    echo "🔧 Configuration files:"
    echo "  • Backend env: helpdesk-backend/.env"
    echo "  • Frontend config: src/lib/config.ts"
    echo ""
    
    if [[ $REDIS_AVAILABLE == true ]]; then
        echo -e "${GREEN}✅ Redis caching enabled${NC}"
    else
        echo -e "${YELLOW}⚠️  Using memory cache (Redis not available)${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Ready to go! Run ./start-all.sh to start the application.${NC}"
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "   Helpdesk Management System Setup Script"
    echo "=================================================="
    echo -e "${NC}"
    
    check_prerequisites
    setup_database
    setup_redis
    setup_backend
    setup_frontend
    test_setup
    create_startup_scripts
    print_final_instructions
}

# Run main function
main "$@"