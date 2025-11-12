#!/bin/bash
set -e

# Check dependencies
command -v docker minikube &>/dev/null || { echo "ERROR: docker or minikube missing!"; exit 1; }

# Minikube setup
minikube delete && minikube start
eval $(minikube docker-env)

# Build images
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT/porto-backend" && docker build -t chatbot-backend:latest .
cd "$PROJECT_ROOT/porto-frontend" && docker build -t chatbot-frontend:latest .

echo "✓ Images built successfully!"