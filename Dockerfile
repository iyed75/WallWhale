# ===================================
# Multi-stage Production Dockerfile
# ===================================

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies including git for dependency resolution
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl-dev \
    git

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install ALL dependencies for building (including dev dependencies)
RUN npm ci --silent && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build:prod

# Install production dependencies in a separate step
RUN rm -rf node_modules && \
    npm ci --only=production --silent && \
    npm cache clean --force

# ===================================
# Production stage
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    openssl \
    ca-certificates && \
    apk upgrade --no-cache

# Copy package files and install production dependencies only
COPY package*.json ./
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodeuser:nodejs /app/prisma ./prisma

# Copy DepotDownloaderMod from host
COPY --chown=nodeuser:nodejs DepotDownloaderMod/ ./DepotDownloaderMod/

# Create necessary directories
RUN mkdir -p /app/logs /app/certs /app/downloads /app/temp && \
    chown -R nodeuser:nodejs /app

# Copy and make executable the entrypoint script
COPY --chown=nodeuser:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Set security headers and limits
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=1024" \
    npm_config_cache=/tmp/.npm

# Switch to non-root user
USER nodeuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node dist/healthcheck.js || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["./docker-entrypoint.sh"]
