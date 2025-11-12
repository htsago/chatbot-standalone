#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}Starting services...${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}ERROR: python3 is not installed!${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}ERROR: npm is not installed!${NC}"
    exit 1
fi

if command -v lsof &> /dev/null; then
    if lsof -Pi :8090 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}WARNING: Port 8090 is already in use${NC}"
    fi
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}WARNING: Port 5173 is already in use${NC}"
    fi
fi

echo -e "${YELLOW}Clearing caches...${NC}"

if [ -d "porto-backend" ]; then
    echo -e "${YELLOW}Clearing backend cache...${NC}"
    cd porto-backend
    find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null || true
    find . -type f -name "*.pyc" -delete 2>/dev/null || true
    find . -type f -name "*.pyo" -delete 2>/dev/null || true
    find . -type d -name "*.egg-info" -exec rm -r {} + 2>/dev/null || true
    cd ..
fi

if [ -d "porto-frontend" ]; then
    echo -e "${YELLOW}Clearing frontend cache...${NC}"
    cd porto-frontend
    rm -rf node_modules/.cache 2>/dev/null || true
    rm -rf dist 2>/dev/null || true
    rm -rf build 2>/dev/null || true
    rm -rf .vite 2>/dev/null || true
    cd ..
fi

echo -e "${GREEN}Cache cleared!${NC}"
echo ""

if [ -d "porto-backend" ]; then
    cd porto-backend
    [ ! -d "venv" ] && python3 -m venv venv
    venv/bin/python3 -m app.main > ../backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../backend.pid
    cd ..
    echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"
fi

if [ -d "porto-frontend" ]; then
    cd porto-frontend
    [ ! -d "node_modules" ] && npm install
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../frontend.pid
    cd ..
    echo -e "${GREEN}Frontend started (PID: $FRONTEND_PID)${NC}"
fi

echo ""
echo -e "${GREEN}Frontend:${NC} http://localhost:5173"
echo -e "${GREEN}Backend:${NC}  http://localhost:8090"
echo -e "${BLUE}Logs:${NC}     backend.log, frontend.log"
echo -e "${BLUE}PIDs:${NC}     backend.pid, frontend.pid"

