#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}Stopping local services...${NC}"
echo ""

echo -e "${BLUE}Stopping backend...${NC}"
if [ -f "backend.pid" ]; then
    BACKEND_PID=$(cat backend.pid)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        kill $BACKEND_PID 2>/dev/null || true
        sleep 1
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Force killing backend...${NC}"
            kill -9 $BACKEND_PID 2>/dev/null || true
        fi
        echo -e "${GREEN}Backend stopped${NC}"
    else
        echo -e "${YELLOW}Backend process not found${NC}"
    fi
    rm -f backend.pid
elif pgrep -f "app\.main" >/dev/null; then
    pkill -f "app\.main" || true
    sleep 1
    if pgrep -f "app\.main" >/dev/null; then
        pkill -9 -f "app\.main" || true
    fi
    echo -e "${GREEN}Backend stopped${NC}"
else
    echo -e "${YELLOW}No backend process found${NC}"
fi

echo -e "${BLUE}Stopping frontend...${NC}"
if [ -f "frontend.pid" ]; then
    FRONTEND_PID=$(cat frontend.pid)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        kill $FRONTEND_PID 2>/dev/null || true
        sleep 1
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Force killing frontend...${NC}"
            kill -9 $FRONTEND_PID 2>/dev/null || true
        fi
        echo -e "${GREEN}Frontend stopped${NC}"
    else
        echo -e "${YELLOW}Frontend process not found${NC}"
    fi
    rm -f frontend.pid
elif pgrep -f "porto-frontend.*vite" >/dev/null; then
    pkill -f "porto-frontend.*vite" || true
    sleep 1
    if pgrep -f "porto-frontend.*vite" >/dev/null; then
        pkill -9 -f "porto-frontend.*vite" || true
    fi
    echo -e "${GREEN}Frontend stopped${NC}"
elif pgrep -f "porto-frontend" >/dev/null; then
    pkill -f "porto-frontend" || true
    echo -e "${GREEN}Frontend stopped${NC}"
else
    echo -e "${YELLOW}No frontend process found${NC}"
fi

echo ""
echo -e "${GREEN}All local services stopped${NC}"
