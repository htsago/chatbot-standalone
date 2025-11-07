#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
COMPOSE_FILE="docker-compose.prod.yml"

log_info() { echo -e "${BLUE}ℹ${NC}  $1"; }
log_success() { echo -e "${GREEN}✓${NC}  $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC}  $1"; }
log_error() { echo -e "${RED}✗${NC}  $1"; }

echo -e "${BLUE}🛑 Stopping Herman AI Production Environment...${NC}"
echo ""

if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "docker-compose.prod.yml not found!"
    exit 1
fi

if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    log_error "Docker Compose is not installed"
    exit 1
fi

REMOVE_VOLUMES=false
if [ "$1" = "--volumes" ] || [ "$1" = "-v" ]; then
    REMOVE_VOLUMES=true
    log_warning "Volumes will be removed!"
fi

log_info "Stopping containers..."
if [ "$REMOVE_VOLUMES" = true ]; then
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" down -v
else
    $DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" down
fi

log_success "Services stopped successfully"
