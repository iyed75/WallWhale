#!/bin/sh

# ===================================
# Docker Entrypoint Script
# ===================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[ENTRYPOINT]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[ENTRYPOINT]${NC} $1"
}

error() {
    echo -e "${RED}[ENTRYPOINT]${NC} $1"
}

# Function to wait for database
wait_for_database() {
    if [ -n "$DATABASE_URL" ]; then
        log "Waiting for database to be ready..."
        
        # Extract database type from URL
        if echo "$DATABASE_URL" | grep -q "postgresql://"; then
            # PostgreSQL
            until npx prisma db execute --inline 'SELECT 1' > /dev/null 2>&1; do
                warn "Database not ready, waiting..."
                sleep 2
            done
        elif echo "$DATABASE_URL" | grep -q "mysql://"; then
            # MySQL
            until npx prisma db execute --inline 'SELECT 1' > /dev/null 2>&1; do
                warn "Database not ready, waiting..."
                sleep 2
            done
        else
            # SQLite or others - skip wait
            log "Using SQLite or other database, skipping wait..."
        fi
        
        log "Database is ready!"
    fi
}

# Function to run database migrations
run_migrations() {
    if [ "$RUN_MIGRATIONS" = "true" ]; then
        log "Running database migrations..."
        npx prisma migrate deploy
        log "Migrations completed!"
    else
        log "Skipping migrations (RUN_MIGRATIONS not set to true)"
    fi
}

# Function to generate Prisma client if needed
generate_client() {
    if [ ! -d "node_modules/.prisma" ]; then
        log "Generating Prisma client..."
        npx prisma generate
        log "Prisma client generated!"
    fi
}

# Function to validate environment
validate_environment() {
    log "Validating environment configuration..."
    
    # Check required environment variables
    required_vars="NODE_ENV SAVE_ROOT STEAM_ACCOUNTS"
    for var in $required_vars; do
        if [ -z "$(eval echo \$$var)" ]; then
            error "Required environment variable $var is not set!"
            exit 1
        fi
    done
    
    # Production-specific checks
    if [ "$NODE_ENV" = "production" ]; then
        prod_vars="JWT_SECRET API_KEY_SALT"
        for var in $prod_vars; do
            val=$(eval echo \$$var)
            if [ -z "$val" ] || [ "$val" = "dev-secret" ] || [ "$val" = "dev-salt" ]; then
                error "Production environment variable $var is not properly configured!"
                exit 1
            fi
        done
    fi
    
    log "Environment validation passed!"
}

# Function to setup directories
setup_directories() {
    log "Setting up application directories..."
    
    # Create necessary directories
    mkdir -p "$SAVE_ROOT" 2>/dev/null || true
    mkdir -p /app/logs 2>/dev/null || true
    mkdir -p /app/downloads 2>/dev/null || true
    
    # Set permissions (if running as root, which we shouldn't be)
    if [ "$(id -u)" = "0" ]; then
        warn "Running as root! This is not recommended."
        chown -R nodeuser:nodejs /app/logs /app/downloads 2>/dev/null || true
    fi
    
    log "Directories setup complete!"
}

# Function to handle graceful shutdown
cleanup() {
    log "Received shutdown signal, cleaning up..."
    # Add any cleanup logic here
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Main execution
main() {
    log "Starting WallWhale Server..."
    log "Node.js version: $(node --version)"
    log "Environment: $NODE_ENV"
    
    # Validate environment
    validate_environment
    
    # Setup directories
    setup_directories
    
    # Generate Prisma client if needed
    generate_client
    
    # Wait for database (if needed)
    wait_for_database
    
    # Run migrations (if enabled)
    run_migrations
    
    # Start the application
    log "Starting application..."
    exec node dist/index.js "$@"
}

# Execute main function
main "$@"
