#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'
COMPOSE_FILE="docker-compose.prod.yml"
DOMAIN="agent-ai.herman-tsago.tech"

log_info() { echo -e "${BLUE}ℹ${NC}  $1"; }
log_success() { echo -e "${GREEN}✓${NC}  $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC}  $1"; }
log_error() { echo -e "${RED}✗${NC}  $1"; }
log_step() { echo -e "${CYAN}→${NC}  $1"; }

echo -e "${BLUE}🚀 Starting Herman AI Production Environment...${NC}"
echo ""

if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "docker-compose.prod.yml not found!"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed"
    exit 1
fi

if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running"
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

if [ ! -f "nginx.conf" ]; then
    log_error "nginx.conf not found!"
    exit 1
fi

if [ -f "porto-backend/.env" ]; then
    if [ ! -f ".env" ]; then
        log_info "Creating .env from porto-backend/.env..."
    else
        log_info "Updating .env from porto-backend/.env..."
    fi
    
    if [ ! -f "docker-compose.prod.env.example" ]; then
        log_error "docker-compose.prod.env.example not found!"
        exit 1
    fi
    
    cp docker-compose.prod.env.example .env
    
    VARS=("GROQ_API_KEY" "OPENAI_API_KEY" "TAVILY_API_KEY" "GOOGLE_CLIENT_ID" "GOOGLE_CLIENT_SECRET" "GMAIL_TOKEN_JSON")
    for VAR in "${VARS[@]}"; do
        if grep -q "^${VAR}=" porto-backend/.env 2>/dev/null; then
            VALUE=$(grep "^${VAR}=" porto-backend/.env | cut -d'=' -f2- | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            ESCAPED_VALUE=$(printf '%s\n' "$VALUE" | sed 's/[[\.*^$()+?{|]/\\&/g')
            if grep -q "^${VAR}=" .env; then
                sed -i "s|^${VAR}=.*|${VAR}=${ESCAPED_VALUE}|" .env
            else
                echo "${VAR}=${ESCAPED_VALUE}" >> .env
            fi
        fi
    done
    log_success ".env synchronized from porto-backend/.env"
elif [ ! -f ".env" ]; then
    log_warning "porto-backend/.env not found!"
    if [ -f "docker-compose.prod.env.example" ]; then
        log_info "Creating .env from example..."
        cp docker-compose.prod.env.example .env
        log_warning "Please edit .env and add your API keys before continuing!"
        read -r
    else
        log_error "docker-compose.prod.env.example not found!"
        exit 1
    fi
fi

if [ -f ".env" ]; then
    log_info "Loading environment variables from .env..."
    set -a
    source .env
    set +a
fi

if command -v systemctl &> /dev/null && systemctl is-active --quiet nginx 2>/dev/null; then
    log_step "Stopping system nginx..."
    systemctl stop nginx 2>/dev/null || true
    log_success "System nginx stopped"
fi

PORTS_IN_USE=()
if command -v ss &> /dev/null; then
    ss -tuln | grep -q ':80 ' && PORTS_IN_USE+=("80")
    ss -tuln | grep -q ':443 ' && PORTS_IN_USE+=("443")
elif command -v netstat &> /dev/null; then
    netstat -tuln | grep -q ':80 ' && PORTS_IN_USE+=("80")
    netstat -tuln | grep -q ':443 ' && PORTS_IN_USE+=("443")
fi

if [ ${#PORTS_IN_USE[@]} -gt 0 ]; then
    log_warning "Ports ${PORTS_IN_USE[*]} are in use."
    if [ -f "./fix-ports.sh" ]; then
        log_info "Running fix-ports.sh to resolve conflicts..."
        bash ./fix-ports.sh
        sleep 2
    else
        log_error "Please free ports 80 and 443 manually."
        exit 1
    fi
fi

if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] && \
   [ -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]; then
    log_success "SSL certificates found - HTTPS will be available"
else
    log_warning "SSL certificates not found for ${DOMAIN}"
    log_info "Site will work over HTTP only. Run ./setup-ssl.sh to set up SSL certificates"
    log_warning "Note: If nginx fails to start due to missing SSL certificates,"
    log_warning "      you may need to temporarily comment out the HTTPS server block in nginx.conf"
fi

log_step "Stopping existing containers (if any)..."
$DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" down 2>/dev/null || true

log_step "Cleaning up orphaned containers..."
for container in herman-ai-nginx herman-ai-frontend herman-ai-backend; do
    if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
        docker rm -f "$container" 2>/dev/null || true
    fi
done

log_step "Building Docker images..."
$DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" build --no-cache

log_step "Starting Docker containers..."
$DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" up -d

log_success "Containers started"

sleep 5

log_info "Service status:"
echo ""
$DOCKER_COMPOSE_CMD -f "$COMPOSE_FILE" ps
echo ""

log_success "Services are running:"
echo -e "  ${GREEN}Frontend:${NC}  http://${DOMAIN}"
echo -e "  ${GREEN}Backend:${NC}    http://${DOMAIN}/api/"
echo -e "  ${GREEN}Health:${NC}     http://${DOMAIN}/health"
echo ""

log_success "Production environment started successfully!"
