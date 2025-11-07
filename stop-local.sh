#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC}  $1"; }
log_success() { echo -e "${GREEN}✓${NC}  $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC}  $1"; }
log_step() { echo -e "${CYAN}→${NC}  $1"; }

echo -e "${BLUE}🛑 Stopping Herman AI Local Development Environment...${NC}"
echo ""

log_step "Stopping backend..."
if pgrep -f "app\.main" >/dev/null; then
    pkill -f "app\.main"
    sleep 1
    if ! pgrep -f "app\.main" >/dev/null; then
        log_success "Backend stopped"
    else
        log_warning "Backend process still running, forcing kill..."
        pkill -9 -f "app\.main" || true
    fi
else
    log_warning "No backend process found"
fi

log_step "Stopping frontend..."
if pgrep -f "porto-frontend.*vite" >/dev/null; then
    pkill -f "porto-frontend.*vite"
    sleep 1
    if ! pgrep -f "porto-frontend.*vite" >/dev/null; then
        log_success "Frontend stopped"
    else
        log_warning "Frontend process still running, forcing kill..."
        pkill -9 -f "porto-frontend.*vite" || true
    fi
elif pgrep -f "porto-frontend" >/dev/null; then
    pkill -f "porto-frontend"
    log_success "Frontend stopped"
else
    log_warning "No frontend process found"
fi

if command -v docker &> /dev/null; then
    if docker ps --format '{{.Names}}' | grep -qE "(herman-ai|agent-v1)"; then
        log_step "Stopping Docker containers..."
        docker stop $(docker ps --format '{{.Names}}' | grep -E "(herman-ai|agent-v1)") >/dev/null 2>&1 || true
        log_success "Docker services stopped"
    fi
fi

echo ""
log_success "All local services stopped"
