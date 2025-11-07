#!/bin/bash

# Start script for local development (without Docker)
# This script starts both the backend and frontend services locally

set -e

echo "Starting Portfolio Chatbot locally..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0
    else
        return 1
    fi
}

# Check if backend port is already in use
if check_port 8090; then
    echo -e "${YELLOW}WARNING: Port 8090 is already in use. Backend might already be running.${NC}"
else
    echo -e "${BLUE}Starting Backend on port 8090...${NC}"
    cd porto-backend
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}WARNING: Virtual environment not found. Creating one...${NC}"
        python3 -m venv venv
    fi
    
    # Install dependencies if needed
    if [ ! -f "venv/bin/python3" ]; then
        echo -e "${YELLOW}WARNING: Virtual environment seems broken. Recreating...${NC}"
        rm -rf venv
        python3 -m venv venv
    fi
    
    # Start backend in background
    venv/bin/python3 -m app.main > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"
    echo -e "${BLUE}   Logs: backend.log${NC}"
    cd ..
    
    # Wait for backend to be ready
    echo -e "${BLUE}Waiting for backend to be ready...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:8090/health > /dev/null 2>&1; then
            echo -e "${GREEN}Backend is ready!${NC}"
            break
        fi
        sleep 1
    done
fi

# Check if frontend port is already in use
if check_port 5173; then
    echo -e "${YELLOW}WARNING: Port 5173 is already in use. Frontend might already be running.${NC}"
else
    echo -e "${BLUE}Starting Frontend on port 5173...${NC}"
    cd porto-frontend
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}WARNING: Dependencies not found. Installing...${NC}"
        npm install
    fi
    
    # Start frontend in background
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${GREEN}Frontend started (PID: $FRONTEND_PID)${NC}"
    echo -e "${BLUE}   Logs: frontend.log${NC}"
    cd ..
fi

echo ""
echo -e "${GREEN}Services are starting!${NC}"
echo ""
echo -e "${BLUE}Frontend:${NC} http://localhost:5173"
echo -e "${BLUE}Backend API:${NC} http://localhost:8090"
echo -e "${BLUE}Health Check:${NC} http://localhost:8090/health"
echo ""
echo -e "${YELLOW}To stop the services, run:${NC}"
echo -e "   pkill -f 'app.main'  # Stop backend"
echo -e "   pkill -f 'vite'      # Stop frontend"
echo ""
echo -e "${YELLOW}Or use:${NC} ./stop-local.sh"
echo ""

