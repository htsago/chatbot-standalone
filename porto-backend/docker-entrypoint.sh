#!/bin/bash
set -e

# Fix permissions for portfolio-db directory if running as root
# (This will be skipped if already running as appuser)
if [ "$(id -u)" = "0" ]; then
    echo "Running as root, fixing permissions for portfolio-db directory..."
    if [ -d "/app/portfolio-db" ]; then
        chown -R appuser:appuser /app/portfolio-db
        chmod -R 755 /app/portfolio-db
        echo "Permissions fixed for portfolio-db directory."
    else
        mkdir -p /app/portfolio-db
        chown -R appuser:appuser /app/portfolio-db
        chmod -R 755 /app/portfolio-db
        echo "Created and fixed permissions for portfolio-db directory."
    fi
    
    # Switch to appuser and execute the main command
    exec gosu appuser "$@"
fi

# Ensure portfolio-db directory exists and is writable
if [ ! -d "/app/portfolio-db" ]; then
    mkdir -p /app/portfolio-db
    echo "Created portfolio-db directory."
fi

# Execute the main command
exec "$@"

