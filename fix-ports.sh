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

echo -e "${BLUE}🔧 Fixing Port Conflicts for NGINX...${NC}"
echo ""

log_step "Checking port 80..."
if command -v ss &> /dev/null; then
    PORT80_PID=$(ss -tlnp | grep ':80 ' | grep -oP 'pid=\K[0-9]+' | head -1)
elif command -v netstat &> /dev/null; then
    PORT80_PID=$(netstat -tlnp | grep ':80 ' | grep -oP 'pid=\K[0-9]+' | head -1)
else
    log_warning "Cannot check ports (ss/netstat not available)"
    PORT80_PID=""
fi

if [ -n "$PORT80_PID" ]; then
    PORT80_PROCESS=$(ps -p "$PORT80_PID" -o comm= 2>/dev/null || echo "unknown")
    log_warning "Port 80 is in use by PID $PORT80_PID ($PORT80_PROCESS)"
    
    if [[ "$PORT80_PROCESS" == *"nginx"* ]] || [[ "$PORT80_PROCESS" == *"apache"* ]]; then
        log_step "Stopping system web server..."
        if command -v systemctl &> /dev/null; then
            systemctl stop nginx 2>/dev/null || systemctl stop apache2 2>/dev/null || systemctl stop httpd 2>/dev/null || true
            log_success "System web server stopped"
        else
            log_warning "Cannot stop system service (systemctl not available)"
            log_info "Please stop the service manually: sudo systemctl stop nginx"
        fi
    else
        log_info "Port 80 is used by: $PORT80_PROCESS (PID: $PORT80_PID)"
        read -p "Kill this process? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill "$PORT80_PID" 2>/dev/null || sudo kill "$PORT80_PID" 2>/dev/null || true
            sleep 1
            log_success "Process killed"
        fi
    fi
else
    log_success "Port 80 is free"
fi

log_step "Checking port 443..."
if command -v ss &> /dev/null; then
    PORT443_PID=$(ss -tlnp | grep ':443 ' | grep -oP 'pid=\K[0-9]+' | head -1)
elif command -v netstat &> /dev/null; then
    PORT443_PID=$(netstat -tlnp | grep ':443 ' | grep -oP 'pid=\K[0-9]+' | head -1)
fi

if [ -n "$PORT443_PID" ]; then
    PORT443_PROCESS=$(ps -p "$PORT443_PID" -o comm= 2>/dev/null || echo "unknown")
    log_warning "Port 443 is in use by PID $PORT443_PID ($PORT443_PROCESS)"
    
    if [[ "$PORT443_PROCESS" == *"nginx"* ]] || [[ "$PORT443_PROCESS" == *"apache"* ]]; then
        log_step "Stopping system web server..."
        if command -v systemctl &> /dev/null; then
            systemctl stop nginx 2>/dev/null || systemctl stop apache2 2>/dev/null || systemctl stop httpd 2>/dev/null || true
            log_success "System web server stopped"
        fi
    else
        log_info "Port 443 is used by: $PORT443_PROCESS (PID: $PORT443_PID)"
        read -p "Kill this process? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill "$PORT443_PID" 2>/dev/null || sudo kill "$PORT443_PID" 2>/dev/null || true
            sleep 1
            log_success "Process killed"
        fi
    fi
else
    log_success "Port 443 is free"
fi

log_step "Checking Docker containers..."
if command -v docker &> /dev/null; then
    if docker ps --format '{{.Names}}' | grep -q "herman-ai-nginx"; then
        log_warning "Docker NGINX container is running"
        log_info "Stopping Docker containers..."
        docker compose -f docker-compose.prod.yml stop nginx 2>/dev/null || true
        log_success "Docker NGINX stopped"
    fi
fi

echo ""
log_success "Port conflict check completed!"

