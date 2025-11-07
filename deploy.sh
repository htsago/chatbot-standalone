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

VPS_HOST="${VPS_HOST:-smart}"
VPS_PATH="${VPS_PATH:-/home/root}"
ARCHIVE_NAME="herman-ai-chatbot-$(date +%Y%m%d-%H%M%S).tar.gz"
AUTO_DEPLOY="${AUTO_DEPLOY:-false}"

echo -e "${BLUE}🚀 Starting Deploy Process for Herman AI Chatbot...${NC}"
echo ""

if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "docker-compose.prod.yml not found!"
    log_info "Please make sure you're in the project root directory."
    exit 1
fi

PROJECT_DIR="$(pwd)"
PROJECT_NAME="$(basename "$PROJECT_DIR")"
TEMP_DIR=$(mktemp -d)
ARCHIVE_PATH="${TEMP_DIR}/${ARCHIVE_NAME}"

log_step "Creating tar.gz archive..."

cd "$(dirname "$PROJECT_DIR")" || exit 1

tar --exclude='node_modules' \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='*.pyo' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='build' \
    --exclude='.vite' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='gmail_token.json' \
    --exclude='porto-backend/gmail_token.json' \
    --exclude='porto-backend/portfolio-db/*.faiss' \
    --exclude='porto-backend/portfolio-db/*.pkl' \
    --exclude='*.egg-info' \
    --exclude='backend.log' \
    --exclude='frontend.log' \
    --exclude='.DS_Store' \
    --exclude='Thumbs.db' \
    -czf "$ARCHIVE_PATH" "$PROJECT_NAME"

if [ $? -eq 0 ]; then
    ARCHIVE_SIZE=$(du -h "$ARCHIVE_PATH" | cut -f1)
    log_success "Archive created successfully: ${ARCHIVE_NAME} (${ARCHIVE_SIZE})"
else
    log_error "Failed to create archive!"
    rm -rf "$TEMP_DIR"
    exit 1
fi

log_step "Transferring archive to VPS (${VPS_HOST})..."
if scp "$ARCHIVE_PATH" "${VPS_HOST}:${VPS_PATH}/" 2>/dev/null; then
    log_success "Archive transferred successfully to VPS"
    log_info "Archive location on VPS: ${VPS_PATH}/${ARCHIVE_NAME}"
else
    log_error "Failed to transfer archive to VPS!"
    log_info "Make sure SSH access to ${VPS_HOST} is configured"
    rm -rf "$TEMP_DIR"
    exit 1
fi

if [ "$AUTO_DEPLOY" = "true" ] || [ "$1" = "--auto" ]; then
    log_step "Starting automatic deployment on server..."
    ssh "${VPS_HOST}" "cd ${VPS_PATH} && \
        tar -xzf ${ARCHIVE_NAME} -C chatbot-standalone --strip-components=1 && \
        cd chatbot-standalone && \
        ./start-prod.sh" || {
        log_error "Automatic deployment failed!"
        log_info "You can deploy manually by running on the server:"
        log_info "  cd ${VPS_PATH}/chatbot-standalone && ./start-prod.sh"
    }
else
    echo ""
    log_info "Next steps on the VPS:"
    echo -e "  1. ${CYAN}Extract archive:${NC} tar -xzf ${ARCHIVE_NAME}"
    echo -e "  2. ${CYAN}Change directory:${NC} cd chatbot-standalone"
    echo -e "  3. ${CYAN}Start services:${NC} ./start-prod.sh"
    echo ""
    log_info "Or use: ${CYAN}./deploy.sh --auto${NC} for automatic deployment"
fi

echo ""
read -p "🗑️  Delete local archive? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$TEMP_DIR"
    log_success "Local archive deleted"
else
    log_info "Archive saved in: ${ARCHIVE_PATH}"
fi

echo ""
log_success "Deploy process completed!"
