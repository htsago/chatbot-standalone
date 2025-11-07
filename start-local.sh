#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC}  $1"; }
log_success() { echo -e "${GREEN}✓${NC}  $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC}  $1"; }
log_error() { echo -e "${RED}✗${NC}  $1"; }
log_step() { echo -e "${CYAN}→${NC}  $1"; }

echo -e "${BLUE}🚀 Starting Herman AI Local Development Environment...${NC}"
echo ""

log_step "Clearing caches..."
if [ -d "porto-backend" ]; then
    log_step "Clearing backend cache..."
    find porto-backend -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find porto-backend -type f \( -name "*.pyc" -o -name "*.pyo" \) -delete 2>/dev/null || true
    find porto-backend -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
    log_success "Backend cache cleared"
else
    log_warning "porto-backend directory not found"
fi

if [ -d "porto-frontend" ]; then
    log_step "Clearing frontend cache..."
    rm -rf porto-frontend/{node_modules/.cache,dist,build,.vite} 2>/dev/null || true
    log_success "Frontend cache cleared"
else
    log_warning "porto-frontend directory not found"
fi

echo ""

if [ -d "porto-backend" ]; then
    log_step "Starting backend..."
    cd porto-backend
    
    if [ ! -d "venv" ]; then
        log_info "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    log_info "Installing/updating dependencies..."
    venv/bin/pip install -q -r requirements.txt
    
    if pgrep -f "app\.main" >/dev/null; then
        log_warning "Backend is already running"
    else
        nohup venv/bin/python3 -m app.main > ../backend.log 2>&1 &
        sleep 2
        if pgrep -f "app\.main" >/dev/null; then
            log_success "Backend started (port 8090)"
        else
            log_error "Failed to start backend. Check backend.log for details."
        fi
    fi
    
    cd ..
else
    log_warning "Backend not started: missing porto-backend directory"
fi

if [ -d "porto-frontend" ]; then
    log_step "Starting frontend..."
    cd porto-frontend
    
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm ci --silent
    fi
    
    if pgrep -f "porto-frontend.*vite" >/dev/null; then
        log_warning "Frontend is already running"
    else
        nohup npm run dev > ../frontend.log 2>&1 &
        sleep 2
        if pgrep -f "porto-frontend.*vite" >/dev/null; then
            log_success "Frontend started (port 5173)"
        else
            log_error "Failed to start frontend. Check frontend.log for details."
        fi
    fi
    
    cd ..
else
    log_warning "Frontend not started: missing porto-frontend directory"
fi

echo ""
log_success "Local development environment started!"
echo ""
echo -e "  ${GREEN}Frontend:${NC} http://localhost:5173"
echo -e "  ${GREEN}Backend:${NC}  http://localhost:8090"
echo -e "  ${GREEN}Logs:${NC}     backend.log, frontend.log"
