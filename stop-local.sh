#!/bin/bash

# Stop script for local development services

echo "Stopping local services..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Stop backend
if pkill -f "app.main" 2>/dev/null; then
    echo -e "${GREEN}Backend stopped${NC}"
else
    echo -e "${YELLOW}WARNING: No backend process found${NC}"
fi

# Stop frontend (vite processes in porto-frontend directory)
if pkill -f "porto-frontend.*vite" 2>/dev/null; then
    echo -e "${GREEN}Frontend stopped${NC}"
else
    # Try alternative method
    if pgrep -f "porto-frontend" > /dev/null; then
        pkill -f "porto-frontend"
        echo -e "${GREEN}Frontend stopped${NC}"
    else
        echo -e "${YELLOW}WARNING: No frontend process found${NC}"
    fi
fi

echo ""
echo -e "${GREEN}All services stopped!${NC}"

