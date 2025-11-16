#!/bin/bash

# ==============================================================================
# Docker Build Script for GuessLyfe Backend
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="guessly-api"
REGISTRY=${REGISTRY:-""}  # Set via environment variable
VERSION=${VERSION:-"latest"}

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_info "Docker version: $(docker --version)"
}

check_env_file() {
    if [ ! -f .env ]; then
        print_warn ".env file not found. Creating from .env.example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_info ".env file created. Please edit it with your configuration."
        else
            print_error ".env.example not found!"
            exit 1
        fi
    fi
}

build_image() {
    local tag="$IMAGE_NAME:$VERSION"

    if [ -n "$REGISTRY" ]; then
        tag="$REGISTRY/$tag"
    fi

    print_info "Building Docker image: $tag"

    docker build \
        --target production \
        --build-arg NODE_ENV=production \
        -t "$tag" \
        -f Dockerfile \
        .

    print_info "Build complete: $tag"
}

build_multi_platform() {
    local tag="$IMAGE_NAME:$VERSION"

    if [ -n "$REGISTRY" ]; then
        tag="$REGISTRY/$tag"
    fi

    print_info "Building multi-platform Docker image: $tag"

    # Check if buildx is available
    if ! docker buildx version &> /dev/null; then
        print_error "Docker buildx is not available. Please install buildx."
        exit 1
    fi

    # Create builder if it doesn't exist
    if ! docker buildx ls | grep -q multiplatform; then
        print_info "Creating multiplatform builder..."
        docker buildx create --name multiplatform --use
    else
        docker buildx use multiplatform
    fi

    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --target production \
        --build-arg NODE_ENV=production \
        -t "$tag" \
        --push \
        -f Dockerfile \
        .

    print_info "Multi-platform build complete: $tag"
}

tag_image() {
    local source_tag="$IMAGE_NAME:$VERSION"
    local target_tag="$1"

    print_info "Tagging image: $source_tag → $target_tag"
    docker tag "$source_tag" "$target_tag"
}

push_image() {
    local tag="$1"

    if [ -z "$tag" ]; then
        tag="$IMAGE_NAME:$VERSION"
        if [ -n "$REGISTRY" ]; then
            tag="$REGISTRY/$tag"
        fi
    fi

    print_info "Pushing image: $tag"
    docker push "$tag"
    print_info "Push complete: $tag"
}

run_container() {
    local tag="$IMAGE_NAME:$VERSION"

    if [ -n "$REGISTRY" ]; then
        tag="$REGISTRY/$tag"
    fi

    print_info "Running container from: $tag"

    docker run -d \
        --name guessly-api-test \
        -p 3000:3000 \
        --env-file .env \
        "$tag"

    print_info "Container started: guessly-api-test"
    print_info "View logs: docker logs -f guessly-api-test"
    print_info "Stop container: docker stop guessly-api-test"
}

test_health() {
    print_info "Waiting for container to be healthy..."

    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker inspect guessly-api-test --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
            print_info "Container is healthy!"
            return 0
        fi

        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done

    print_error "Container did not become healthy"
    docker logs guessly-api-test
    return 1
}

show_usage() {
    cat << EOF
Usage: $0 [COMMAND] [OPTIONS]

Commands:
    build           Build Docker image
    build-multi     Build multi-platform image (amd64, arm64)
    tag TAG         Tag the built image
    push [TAG]      Push image to registry
    run             Run container
    test            Build, run, and test container
    clean           Remove built images and containers
    help            Show this help message

Environment Variables:
    REGISTRY        Docker registry URL (e.g., gcr.io/project-id)
    VERSION         Image version tag (default: latest)

Examples:
    # Build image
    $0 build

    # Build with version
    VERSION=v1.0.0 $0 build

    # Build and push to registry
    REGISTRY=gcr.io/my-project VERSION=v1.0.0 $0 build
    REGISTRY=gcr.io/my-project VERSION=v1.0.0 $0 push

    # Build multi-platform and push
    REGISTRY=gcr.io/my-project VERSION=v1.0.0 $0 build-multi

    # Run container
    $0 run

    # Full test cycle
    $0 test

EOF
}

clean() {
    print_info "Cleaning up..."

    # Stop and remove test container
    if docker ps -a | grep -q guessly-api-test; then
        print_info "Removing test container..."
        docker stop guessly-api-test 2>/dev/null || true
        docker rm guessly-api-test 2>/dev/null || true
    fi

    # Remove test images
    if docker images | grep -q "$IMAGE_NAME.*test"; then
        print_info "Removing test images..."
        docker rmi "$IMAGE_NAME:test" 2>/dev/null || true
    fi

    print_info "Cleanup complete"
}

# Main script
main() {
    local command=${1:-"help"}

    case "$command" in
        build)
            check_docker
            build_image
            ;;
        build-multi)
            check_docker
            build_multi_platform
            ;;
        tag)
            if [ -z "$2" ]; then
                print_error "Please provide a tag"
                exit 1
            fi
            check_docker
            tag_image "$2"
            ;;
        push)
            check_docker
            push_image "$2"
            ;;
        run)
            check_docker
            check_env_file
            run_container
            ;;
        test)
            check_docker
            check_env_file
            print_info "Starting full test cycle..."
            build_image
            run_container
            test_health
            print_info "Test complete! Cleaning up..."
            clean
            ;;
        clean)
            check_docker
            clean
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
