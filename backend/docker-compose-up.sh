#!/bin/bash

# ==============================================================================
# Docker Compose Quick Start Script
# ==============================================================================

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_warn ".env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        print_info ".env file created."
        print_warn "Please edit .env with your configuration before proceeding!"
        echo ""
        echo "Required variables to configure:"
        echo "  - JWT_SECRET"
        echo "  - JWT_REFRESH_SECRET"
        echo "  - DB_PASSWORD"
        echo "  - BLOCKCHAIN_PROVIDER_PRIVATE_KEY"
        echo "  - Smart contract addresses"
        echo "  - Twitter API credentials"
        echo ""
        read -p "Press Enter after editing .env file..."
    fi
fi

# Start services
print_info "Starting GuessLyfe services..."
docker-compose up -d

# Wait a moment for services to initialize
print_info "Waiting for services to initialize..."
sleep 5

# Show status
print_info "Service status:"
docker-compose ps

echo ""
print_info "Services started successfully!"
echo ""
echo "📊 Available services:"
echo "  - API:       http://localhost:3000"
echo "  - API Docs:  http://localhost:3000/api/docs"
echo "  - Health:    http://localhost:3000/api/v1/health"
echo "  - Postgres:  localhost:5432"
echo "  - Redis:     localhost:6379"
echo ""
echo "🔧 Useful commands:"
echo "  - View logs:        docker-compose logs -f"
echo "  - Stop services:    docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - Shell into API:   docker-compose exec api sh"
echo ""
echo "📝 To view API logs:"
echo "  docker-compose logs -f api"
echo ""
