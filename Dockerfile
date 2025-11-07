FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY porto/package*.json ./

# Install dependencies
RUN npm ci --no-audit --no-fund \
    && npm cache clean --force

# Copy source code
COPY porto/ .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install serve and wget for health checks
RUN npm install -g serve \
    && apk add --no-cache wget

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S vueuser -u 1001

# Set ownership and permissions
RUN chown -R vueuser:nodejs /app

# Switch to non-root user
USER vueuser

# Expose port
EXPOSE 3036

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3036 || exit 1

# Start the application
CMD ["serve", "-s", "dist", "-l", "3036"]