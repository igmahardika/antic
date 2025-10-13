#!/bin/bash

# Test Script untuk Ticket Analytics Fixes
echo "🧪 Testing Ticket Analytics Fixes..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Testing Ticket Analytics Page${NC}"

# Check if servers are running
echo "🔍 Checking servers..."

# Check backend
if curl -s http://localhost:3001/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is running${NC}"
else
    echo -e "${RED}❌ Backend API is not running${NC}"
    echo "Starting backend..."
    cd helpdesk-backend && npm start &
    sleep 5
    cd ..
fi

# Check frontend
if curl -s http://localhost:5173 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running${NC}"
else
    echo -e "${RED}❌ Frontend is not running${NC}"
    echo "Starting frontend..."
    npm run dev &
    sleep 10
fi

echo ""
echo -e "${YELLOW}🎯 Test Instructions:${NC}"
echo "1. Open browser: http://localhost:5173/ticket/ticket-analytics"
echo "2. Login with: admin / admin123"
echo "3. Check Developer Console (F12) for debug logs:"
echo "   - [DEBUG] Sample tickets"
echo "   - [DEBUG] Open tickets analysis"
echo "   - [DEBUG] Monthly Stats"
echo "   - [TicketAnalyticsContext] Loaded tickets"
echo ""
echo -e "${YELLOW}📋 Expected Results:${NC}"
echo "✅ Open Tickets Card should show > 0 (not 0)"
echo "✅ Area Chart: Closed ≠ Incoming (should be different)"
echo "✅ Console logs should show actual ticket data"
echo ""
echo -e "${YELLOW}🐛 If still issues:${NC}"
echo "1. Check console logs for actual data format"
echo "2. Verify ticket status values in IndexedDB"
echo "3. Check if data is being filtered out by date range"
echo ""
echo -e "${GREEN}🚀 Test completed! Check the browser now.${NC}"