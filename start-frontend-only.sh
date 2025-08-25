#!/bin/bash

# Helpdesk Management System Frontend Startup Script
echo "🌐 Starting Helpdesk Management System Frontend..."

# Set environment variables to prevent Qt issues
export QT_QPA_PLATFORM=offscreen
export DISPLAY=:99
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Start frontend
echo "🚀 Starting Vite dev server..."
npm run dev