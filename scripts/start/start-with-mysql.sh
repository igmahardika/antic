#!/bin/bash

# Helpdesk Management System - MySQL Version Startup Script
echo "🚀 Starting Helpdesk Management System with MySQL..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if process is running on port
check_port() {
    local port=$1
    if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        return 0
    else
        return 1
    fi
}

# Set environment variables to prevent Qt issues
export QT_QPA_PLATFORM=offscreen
export DISPLAY=:99
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

echo "🔧 Setting up environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "antic-backend" ]; then
    echo -e "${RED}❌ Error: Please run this script from the antic project root directory${NC}"
    exit 1
fi

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install --legacy-peer-deps
fi

# Install backend dependencies if needed
if [ ! -d "antic-backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd antic-backend
    npm install
    cd ..
fi

# Check MySQL connection
echo "🗄️  Testing MySQL connection..."
if mysql -u hmrnexa -p7ynkgnqiiF6phLSRNHli -h localhost helpdesk -e "SELECT 1;" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ MySQL connection successful${NC}"
else
    echo -e "${RED}❌ MySQL connection failed. Please check database credentials.${NC}"
    echo "Database: helpdesk"
    echo "Username: hmrnexa"
    echo "Password: 7ynkgnqiiF6phLSRNHli"
    exit 1
fi

# Start backend server
echo "🖥️  Starting Backend API Server..."
cd antic-backend

# Kill existing backend process if running
if check_port 3001; then
    echo "🔄 Stopping existing backend server..."
    pkill -f "node.*server.mjs" || true
    sleep 2
fi

# Start backend in background
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
for i in {1..30}; do
    if check_port 3001; then
        echo -e "${GREEN}✅ Backend API started successfully on port 3001${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend failed to start after 30 seconds${NC}"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# Test backend health
echo "🏥 Testing backend health..."
if curl -s http://localhost:3001/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend health check passed${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend server
echo "🌐 Starting Frontend Development Server..."

# Kill existing frontend process if running
if check_port 5173; then
    echo "🔄 Stopping existing frontend server..."
    pkill -f "node.*vite" || true
    sleep 2
fi

# Start frontend in background
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "⏳ Waiting for frontend to start..."
for i in {1..30}; do
    if check_port 5173; then
        echo -e "${GREEN}✅ Frontend started successfully on port 5173${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Frontend failed to start after 30 seconds${NC}"
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# Display success message
echo ""
echo -e "${GREEN}🎉 Helpdesk Management System is now running!${NC}"
echo ""
echo "📋 Application URLs:"
echo -e "   ${BLUE}Frontend:${NC} http://localhost:5173"
echo -e "   ${BLUE}Backend API:${NC} http://localhost:3001"
echo -e "   ${BLUE}Health Check:${NC} http://localhost:3001/health"
echo ""
echo "🔐 Default Login Credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo "   Role: super admin"
echo ""
echo "🗄️  Database Information:"
echo "   Type: MySQL"
echo "   Database: helpdesk"
echo "   Authentication: JWT + Redis Sessions"
echo ""
echo "⚠️  Press Ctrl+C to stop both servers"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✅ Servers stopped successfully${NC}"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup INT TERM

# Wait for user interrupt
echo "🔄 Servers are running. Monitoring..."
while true; do
    # Check if processes are still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "${RED}❌ Backend process died unexpectedly${NC}"
        break
    fi
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "${RED}❌ Frontend process died unexpectedly${NC}"
        break
    fi
    sleep 5
done

cleanup