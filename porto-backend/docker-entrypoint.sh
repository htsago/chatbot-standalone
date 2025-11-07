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
    
    # Create gmail_token.json from environment variable if set (as root, then fix ownership)
    if [ -n "$GMAIL_TOKEN_JSON" ]; then
        echo "Creating gmail_token.json from GMAIL_TOKEN_JSON environment variable..."
        echo "$GMAIL_TOKEN_JSON" > /app/gmail_token.json
        chown appuser:appuser /app/gmail_token.json
        chmod 600 /app/gmail_token.json
        echo "gmail_token.json created successfully."
    fi
    
    # Switch to appuser and execute the main command
    exec gosu appuser "$@"
fi

# If already running as appuser (shouldn't happen with current setup, but handle gracefully)
# Create gmail_token.json from environment variable if set
if [ -n "$GMAIL_TOKEN_JSON" ]; then
    echo "Creating gmail_token.json from GMAIL_TOKEN_JSON environment variable..."
    echo "$GMAIL_TOKEN_JSON" > /app/gmail_token.json
    chmod 600 /app/gmail_token.json
    echo "gmail_token.json created successfully."
fi

# Ensure portfolio-db directory exists and is writable
if [ ! -d "/app/portfolio-db" ]; then
    mkdir -p /app/portfolio-db
    echo "Created portfolio-db directory."
fi

# Execute the main command
exec "$@"

