#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ${NC}  $1"; }
log_success() { echo -e "${GREEN}✓${NC}  $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC}  $1"; }
log_error() { echo -e "${RED}✗${NC}  $1"; }

COMPOSE_FILE="docker-compose.prod.yml"
DOMAIN="agent-ai.herman-tsago.tech"

if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    log_error "Docker Compose is not installed"
    exit 1
fi

echo -e "${BLUE}📊 Herman AI Production Environment Status${NC}"
echo ""

log_info "Container Status:"
echo ""
$DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" ps
echo ""

log_info "Health Status:"
for service in herman-ai-backend herman-ai-frontend herman-ai-nginx; do
    if docker ps --format '{{.Names}}' | grep -q "^${service}$"; then
        health=$(docker inspect --format='{{.State.Health.Status}}' "$service" 2>/dev/null || echo "no-healthcheck")
        if [ "$health" = "healthy" ]; then
            echo -e "  ${GREEN}✓${NC}  $service: healthy"
        elif [ "$health" = "unhealthy" ]; then
            echo -e "  ${RED}✗${NC}  $service: unhealthy"
        else
            echo -e "  ${YELLOW}⚠${NC}  $service: $health"
        fi
    else
        echo -e "  ${RED}✗${NC}  $service: not running"
    fi
done
echo ""

log_info "Resource Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
    $(docker ps --format '{{.Names}}' | grep "herman-ai") 2>/dev/null || log_warning "No containers running"
echo ""

log_success "Services are running:"
echo -e "  ${GREEN}Frontend:${NC}  http://${DOMAIN}"
echo -e "  ${GREEN}Backend:${NC}    http://${DOMAIN}/api/"
echo -e "  ${GREEN}Health:${NC}     http://${DOMAIN}/health"

