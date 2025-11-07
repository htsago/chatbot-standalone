FROM python:3.11-slim AS builder

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# -------- Final stage --------
FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/app

# Install runtime dependencies including gosu for user switching
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gosu \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /usr/local /usr/local

# Copy application files
COPY app/ ./app/
COPY data/ ./data/

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create directories for database
RUN mkdir -p /app/portfolio-db

# Create non-root user with specific UID/GID to match host permissions
RUN groupadd -r -g 1000 appuser && useradd -r -u 1000 -g appuser appuser
RUN chown -R appuser:appuser /app
RUN chmod -R 755 /app/portfolio-db
# Note: We don't set USER here - entrypoint will switch to appuser after fixing permissions

# Set entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]

EXPOSE 8090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8090/health || exit 1

CMD ["python", "-m", "app.main"]