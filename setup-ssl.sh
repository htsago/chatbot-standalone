#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DOMAIN="agent-ai.herman-tsago.tech"
EMAIL="hermantsago67@gmail.com"

echo -e "${BLUE}🔒 Setting up SSL certificates for ${DOMAIN}...${NC}"
echo ""

if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}certbot not found. Installing...${NC}"
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y certbot
    elif command -v yum &> /dev/null; then
        yum install -y certbot
    else
        echo -e "${RED}Error: Could not install certbot. Please install it manually.${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}Checking if domain ${DOMAIN} is reachable...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}" | grep -q "200\|301\|302"; then
    echo -e "${YELLOW}Warning: Domain ${DOMAIN} might not be reachable.${NC}"
    echo -e "${YELLOW}Make sure DNS is configured correctly and port 80 is accessible.${NC}"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${BLUE}Stopping Docker nginx temporarily...${NC}"
docker-compose -f docker-compose.prod.yml stop nginx 2>/dev/null || true

echo -e "${BLUE}Requesting SSL certificate from Let's Encrypt...${NC}"
echo ""

certbot certonly --standalone \
    --preferred-challenges http \
    -d "${DOMAIN}" \
    --email "${EMAIL}" \
    --agree-tos \
    --non-interactive \
    --keep-until-expiring

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SSL certificate created successfully!${NC}"
    echo ""
    echo -e "${BLUE}Certificate location:${NC}"
    echo -e "  Certificate: /etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
    echo -e "  Private Key: /etc/letsencrypt/live/${DOMAIN}/privkey.pem"
    echo ""
    
    echo -e "${BLUE}Restarting Docker nginx...${NC}"
    docker-compose -f docker-compose.prod.yml up -d nginx 2>/dev/null || docker-compose -f docker-compose.prod.yml start nginx 2>/dev/null || true
    
    echo -e "${GREEN}✓ SSL setup complete!${NC}"
    echo ""
    echo -e "${GREEN}Your site should now be accessible via HTTPS:${NC}"
    echo -e "  https://${DOMAIN}"
    echo ""
    echo -e "${YELLOW}Note: Certificates expire in 90 days. Set up auto-renewal:${NC}"
    echo -e "  certbot renew --dry-run"
else
    echo -e "${RED}❌ Failed to create SSL certificate!${NC}"
    echo -e "${YELLOW}Restarting Docker nginx...${NC}"
    docker-compose -f docker-compose.prod.yml up -d nginx 2>/dev/null || docker-compose -f docker-compose.prod.yml start nginx 2>/dev/null || true
    exit 1
fi

