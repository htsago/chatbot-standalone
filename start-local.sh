#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Starting services...${NC}"

echo -e "${YELLOW}Clearing caches...${NC}"

# Clear backend cache
echo -e "${YELLOW}Clearing backend cache...${NC}"
cd porto-backend
find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true
find . -type d -name "*.egg-info" -exec rm -r {} + 2>/dev/null || true
cd ..

# Clear frontend cache
echo -e "${YELLOW}Clearing frontend cache...${NC}"
cd porto-frontend
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf dist 2>/dev/null || true
rm -rf build 2>/dev/null || true
rm -rf .vite 2>/dev/null || true
cd ..

echo -e "${GREEN}Cache cleared!${NC}"
echo ""

cd porto-backend
[ ! -d "venv" ] && python3 -m venv venv
venv/bin/python3 -m app.main > ../backend.log 2>&1 &
cd ..


cd porto-frontend
[ ! -d "node_modules" ] && npm install
npm run dev > ../frontend.log 2>&1 &
cd ..

echo -e "${GREEN}Frontend:${NC} http://localhost:5173"
echo -e "${GREEN}Backend:${NC}  http://localhost:8090"
echo -e "${BLUE}Logs:${NC}     backend.log, frontend.log"

