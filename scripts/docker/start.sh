#!/bin/bash

# ===================================
# WallWhale Server Docker Startup Script
# ===================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[DOCKER-START]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[DOCKER-START]${NC} $1"
}

error() {
    echo -e "${RED}[DOCKER-START]${NC} $1"
}

info() {
    echo -e "${BLUE}[DOCKER-START]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        echo "Please install Docker from: https://docs.docker.com/get-docker/"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        error "Docker is not running"
        echo "Please start Docker and try again"
        exit 1
    fi

    log "Docker is available and running"
}

# Function to check if docker-compose is available
check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        error "Docker Compose is not available"
        echo "Please install Docker Compose"
        exit 1
    fi

    log "Using Docker Compose: $COMPOSE_CMD"
}

# Function to create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    mkdir -p data
    mkdir -p downloads
    mkdir -p logs
    mkdir -p certs
    
    log "Directories created successfully"
}

# Function to check for .env file
check_env_file() {
    if [ ! -f ".env" ]; then
        warn "No .env file found"
        echo
        info "Would you like to create a basic .env file? (y/n)"
        read -r create_env
        
        if [ "$create_env" = "y" ] || [ "$create_env" = "Y" ]; then
            create_basic_env
        else
            warn "Continuing without .env file (using defaults)"
        fi
    else
        log ".env file found"
    fi
}

# Function to create basic .env file
create_basic_env() {
    log "Creating basic .env file..."
    
    cat > .env << EOF
# WallWhale Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database (SQLite for Docker)
DATABASE_URL=file:/app/data/depot.db

# Admin Configuration
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# Security (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=$(openssl rand -hex 32)
API_KEY_SALT=$(openssl rand -hex 32)

# Steam Accounts (ADD YOUR ACCOUNTS)
STEAM_ACCOUNTS=username:password

# File Storage
SAVE_ROOT=/app/downloads
DEPOTDOWNLOADER_PATH=/app/DepotDownloaderMod/DepotDownloaderMod.exe

# Features
DOCS_ENABLED=true
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
EOF

    log "Basic .env file created"
    warn "Please edit .env file and add your Steam accounts before starting"
}

# Function to build Docker image
build_image() {
    log "Building Docker image..."
    
    if ! docker build -t wallwhale-server .; then
        error "Failed to build Docker image"
        exit 1
    fi
    
    log "Docker image built successfully"
}

# Function to start with Docker Compose
start_with_compose() {
    log "Starting with Docker Compose..."
    
    # Check for profiles
    PROFILES=""
    if [ -n "$COMPOSE_PROFILES" ]; then
        PROFILES="--profile $COMPOSE_PROFILES"
        log "Using profiles: $COMPOSE_PROFILES"
    fi
    
    # Start services
    if ! $COMPOSE_CMD up -d $PROFILES; then
        error "Failed to start with Docker Compose"
        exit 1
    fi
    
    log "Services started successfully"
    
    # Show status
    echo
    info "Services Status:"
    $COMPOSE_CMD ps
    
    echo
    log "Server should be available at: http://localhost:${PORT:-3000}"
    log "API Documentation: http://localhost:${PORT:-3000}/docs"
    log "Health Check: http://localhost:${PORT:-3000}/health"
}

# Function to start with plain Docker
start_with_docker() {
    log "Starting with Docker..."
    
    # Stop and remove existing container
    docker stop depot-server 2>/dev/null || true
    docker rm depot-server 2>/dev/null || true
    
    # Run container
    docker run -d \
        --name depot-server \
        -p ${PORT:-3000}:3000 \
        -v "$(pwd)/data:/app/data" \
        -v "$(pwd)/downloads:/app/downloads" \
        -v "$(pwd)/logs:/app/logs" \
        -v "$(pwd)/DepotDownloaderMod:/app/DepotDownloaderMod:ro" \
        --env-file .env \
    wallwhale-server

    if [ $? -eq 0 ]; then
        log "Container started successfully"
        log "Server should be available at: http://localhost:${PORT:-3000}"
    else
        error "Failed to start container"
        exit 1
    fi
}

# Function to show logs
show_logs() {
    echo
    info "Recent logs:"
    if [ -f "docker-compose.yml" ] && [ "$1" = "compose" ]; then
        $COMPOSE_CMD logs --tail=20 api
    else
        docker logs --tail=20 depot-server
    fi
}

# Main execution
main() {
    echo "🐳 WallWhale Server - Docker Startup"
    echo "=========================================="
    echo
    
    # Check prerequisites
    check_docker
    create_directories
    check_env_file
    
    # Determine deployment method
    DEPLOYMENT_METHOD="docker"
    if [ -f "docker-compose.yml" ]; then
        echo
        info "Docker Compose configuration found"
        info "Choose deployment method:"
        echo "1) Docker Compose (recommended)"
        echo "2) Plain Docker"
        echo
        read -p "Enter choice (1-2): " choice
        
        case $choice in
            1) DEPLOYMENT_METHOD="compose" ;;
            2) DEPLOYMENT_METHOD="docker" ;;
            *) warn "Invalid choice, using Docker Compose"; DEPLOYMENT_METHOD="compose" ;;
        esac
    fi
    
    # Build image
    build_image
    
    # Start services
    if [ "$DEPLOYMENT_METHOD" = "compose" ]; then
        check_docker_compose
        start_with_compose
    else
        start_with_docker
    fi
    
    # Show logs
    show_logs "$DEPLOYMENT_METHOD"
    
    echo
    log "✅ Startup complete!"
    echo
    info "Useful commands:"
    echo "  View logs: docker logs -f depot-server"
    if [ "$DEPLOYMENT_METHOD" = "compose" ]; then
        echo "  Stop services: $COMPOSE_CMD down"
        echo "  Restart services: $COMPOSE_CMD restart"
        echo "  View status: $COMPOSE_CMD ps"
    else
        echo "  Stop container: docker stop depot-server"
        echo "  Start container: docker start depot-server"
        echo "  Remove container: docker rm depot-server"
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
    echo "WallWhale Server Docker Startup Script"
        echo
        echo "Usage: $0 [OPTIONS]"
        echo
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --build-only   Only build the Docker image"
        echo "  --no-logs      Don't show logs after startup"
        echo
        echo "Environment Variables:"
        echo "  COMPOSE_PROFILES  Comma-separated list of profiles to enable"
        echo "  PORT             Server port (default: 3000)"
        echo
        exit 0
        ;;
    --build-only)
        check_docker
        build_image
        log "Build complete"
        exit 0
        ;;
    --no-logs)
        NO_LOGS=true
        ;;
esac

# Run main function
main
