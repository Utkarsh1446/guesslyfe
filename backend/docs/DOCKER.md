# Docker Deployment Guide

This guide covers containerized deployment of the GuessLyfe backend using Docker and Docker Compose.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Dockerfile](#dockerfile)
- [Docker Compose](#docker-compose)
- [Building Images](#building-images)
- [Running Containers](#running-containers)
- [Environment Variables](#environment-variables)
- [Volumes and Data Persistence](#volumes-and-data-persistence)
- [Networking](#networking)
- [Health Checks](#health-checks)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Overview

The GuessLyfe backend uses a multi-stage Docker build to create optimized, secure container images:

- **Stage 1 (Builder)**: Builds the TypeScript application
- **Stage 2 (Production)**: Creates minimal production image

**Key Features:**
- ✅ Multi-stage build (optimized size)
- ✅ Non-root user (security)
- ✅ Health checks
- ✅ Signal handling (dumb-init)
- ✅ Production-ready
- ✅ Layer caching optimization

## Prerequisites

- Docker 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose 2.0+ ([Install Docker Compose](https://docs.docker.com/compose/install/))
- At least 2GB RAM available for containers
- `.env` file configured (see [Environment Variables](#environment-variables))

## Quick Start

### 1. Clone and Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start All Services

```bash
docker-compose up -d
```

### 3. Check Status

```bash
docker-compose ps
```

### 4. View Logs

```bash
docker-compose logs -f api
```

### 5. Stop Services

```bash
docker-compose down
```

## Dockerfile

The Dockerfile uses a multi-stage build for optimal image size and security.

### Build Stage

```dockerfile
FROM node:18-alpine AS builder
- Installs build dependencies (python3, make, g++)
- Installs npm dependencies
- Builds TypeScript application
- Prunes dev dependencies
```

### Production Stage

```dockerfile
FROM node:18-alpine AS production
- Installs dumb-init for signal handling
- Creates non-root user (nodejs:1001)
- Copies built application from builder
- Sets up health check
- Runs as non-root user
```

### Security Features

1. **Non-Root User**: Runs as `nodejs` (UID 1001) instead of root
2. **Minimal Base Image**: Uses Alpine Linux for smaller attack surface
3. **Signal Handling**: dumb-init properly handles signals (SIGTERM, SIGINT)
4. **No Secrets**: Secrets passed via environment variables, not baked into image
5. **Read-Only**: Application files owned by nodejs user

## Docker Compose

The `docker-compose.yml` defines a complete development environment:

### Services

1. **postgres** - PostgreSQL 15 database
2. **redis** - Redis 7 for caching and queues
3. **api** - NestJS backend application
4. **pgadmin** - Database UI (optional, use `--profile tools`)

### Service Dependencies

```
api → depends on → postgres (healthy)
api → depends on → redis (healthy)
pgadmin → depends on → postgres
```

### Networks

All services connect to `guessly-network` bridge network.

### Volumes

- `postgres_data` - PostgreSQL data persistence
- `redis_data` - Redis data persistence
- `pgadmin_data` - PgAdmin configuration
- `./uploads` - Bind mount for file uploads
- `./logs` - Bind mount for application logs

## Building Images

### Build API Image

```bash
# Build image
docker build -t guessly-api:latest .

# Build with specific tag
docker build -t guessly-api:v1.0.0 .

# Build for specific platform (M1 Mac)
docker build --platform linux/amd64 -t guessly-api:latest .

# Build without cache
docker build --no-cache -t guessly-api:latest .
```

### Build with Docker Compose

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build api

# Build with no cache
docker-compose build --no-cache
```

### Multi-Platform Builds

For deploying to different architectures (e.g., ARM64, AMD64):

```bash
# Create builder
docker buildx create --name multiplatform --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t guessly-api:latest \
  --push \
  .
```

## Running Containers

### Using Docker Run

```bash
# Run API container (requires external postgres and redis)
docker run -d \
  --name guessly-api \
  -p 3000:3000 \
  --env-file .env \
  -e DB_HOST=host.docker.internal \
  -e REDIS_HOST=host.docker.internal \
  guessly-api:latest
```

### Using Docker Compose

```bash
# Start all services (detached)
docker-compose up -d

# Start with logs
docker-compose up

# Start specific service
docker-compose up -d api

# Start with pgadmin (tools profile)
docker-compose --profile tools up -d

# Scale services
docker-compose up -d --scale api=3
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api

# Last 100 lines
docker-compose logs --tail=100 api

# Since timestamp
docker-compose logs --since 2024-01-01T12:00:00 api
```

### Executing Commands

```bash
# Shell into API container
docker-compose exec api sh

# Run migrations
docker-compose exec api npm run migration:run

# Check health
docker-compose exec api node -e "require('http').get('http://localhost:3000/api/v1/health')"
```

## Environment Variables

### Required Variables

```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-password
DB_DATABASE=guessly

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Blockchain
BLOCKCHAIN_RPC_URL=https://sepolia.base.org
BLOCKCHAIN_PROVIDER_PRIVATE_KEY=your-private-key

# Smart Contracts
CONTRACT_USDC=0x...
CONTRACT_FEE_COLLECTOR=0x...
CONTRACT_CREATOR_SHARE_FACTORY=0x...
CONTRACT_OPINION_MARKET=0x...
```

### Using .env File

Docker Compose automatically loads `.env` file from the same directory:

```bash
# .env file
DB_PASSWORD=mypassword
JWT_SECRET=mysecret
```

### Using Environment File

```bash
# Specify custom env file
docker-compose --env-file .env.production up -d
```

### Override Variables

```bash
# Override specific variables
docker-compose up -d -e LOG_LEVEL=debug -e DB_LOGGING=true
```

## Volumes and Data Persistence

### Named Volumes

```bash
# List volumes
docker volume ls | grep guessly

# Inspect volume
docker volume inspect guessly-postgres-data

# Backup volume
docker run --rm \
  -v guessly-postgres-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore volume
docker run --rm \
  -v guessly-postgres-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

### Bind Mounts

```bash
# Uploads directory
./uploads:/app/uploads

# Logs directory
./logs:/app/logs
```

### Cleanup Volumes

```bash
# Remove all volumes (CAUTION: DATA LOSS!)
docker-compose down -v

# Remove specific volume
docker volume rm guessly-postgres-data
```

## Networking

### Network Configuration

```yaml
networks:
  guessly-network:
    driver: bridge
```

### Container Connectivity

Containers on the same network can communicate using service names:

```bash
# API → Database
DB_HOST=postgres

# API → Redis
REDIS_HOST=redis
```

### Port Mapping

```yaml
ports:
  - '3000:3000'  # Host:Container
```

### Inspect Network

```bash
# List networks
docker network ls

# Inspect network
docker network inspect guessly-network

# View connected containers
docker network inspect guessly-network --format '{{json .Containers}}'
```

## Health Checks

### API Health Check

```bash
# Check health status
docker inspect guessly-api --format='{{.State.Health.Status}}'

# View health check logs
docker inspect guessly-api --format='{{json .State.Health}}'
```

### All Services Health

```bash
docker-compose ps
```

### Custom Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', ...)"
```

## Production Deployment

### 1. Build Production Image

```bash
# Build optimized image
docker build \
  --target production \
  --build-arg NODE_ENV=production \
  -t guessly-api:v1.0.0 \
  .
```

### 2. Tag for Registry

```bash
# Tag for Docker Hub
docker tag guessly-api:v1.0.0 username/guessly-api:v1.0.0

# Tag for Google Container Registry
docker tag guessly-api:v1.0.0 gcr.io/project-id/guessly-api:v1.0.0

# Tag for AWS ECR
docker tag guessly-api:v1.0.0 123456789.dkr.ecr.us-east-1.amazonaws.com/guessly-api:v1.0.0
```

### 3. Push to Registry

```bash
# Docker Hub
docker push username/guessly-api:v1.0.0

# Google Container Registry
docker push gcr.io/project-id/guessly-api:v1.0.0

# AWS ECR
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/guessly-api:v1.0.0
```

### 4. Deploy to Production

#### Google Cloud Run

```bash
gcloud run deploy guessly-api \
  --image gcr.io/project-id/guessly-api:v1.0.0 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-secrets JWT_SECRET=jwt-secret:latest \
  --min-instances 1 \
  --max-instances 10 \
  --memory 1Gi \
  --cpu 1
```

#### AWS ECS/Fargate

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster guessly-cluster \
  --service-name guessly-api \
  --task-definition guessly-api:1 \
  --desired-count 2
```

#### Kubernetes

```bash
# Create deployment
kubectl apply -f k8s/deployment.yaml

# Create service
kubectl apply -f k8s/service.yaml

# Check status
kubectl get pods
kubectl get svc
```

### 5. Production docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    image: guessly-api:v1.0.0
    restart: always
    environment:
      NODE_ENV: production
      # Use secrets management
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs api

# Check exit code
docker inspect guessly-api --format='{{.State.ExitCode}}'

# Run interactively
docker-compose run --rm api sh
```

### Build Failures

```bash
# Clear build cache
docker builder prune

# Build without cache
docker build --no-cache -t guessly-api:latest .

# Check build context size
docker build --progress=plain -t guessly-api:latest .
```

### Database Connection Issues

```bash
# Test database connectivity
docker-compose exec api ping postgres

# Check database is ready
docker-compose exec postgres pg_isready

# View database logs
docker-compose logs postgres
```

### Permission Issues

```bash
# Fix uploads directory permissions
chmod -R 755 uploads
chown -R 1001:1001 uploads

# Check container user
docker-compose exec api whoami
docker-compose exec api id
```

### Memory Issues

```bash
# Check container stats
docker stats guessly-api

# Set memory limits
docker-compose up -d --scale api=1 \
  --memory="1g" --memory-swap="2g"
```

### Network Issues

```bash
# Inspect network
docker network inspect guessly-network

# Test DNS resolution
docker-compose exec api nslookup postgres
docker-compose exec api ping -c 3 redis

# Recreate network
docker-compose down
docker network rm guessly-network
docker-compose up -d
```

### Clean Up Everything

```bash
# Stop and remove containers, networks, volumes
docker-compose down -v

# Remove all unused resources
docker system prune -a --volumes

# Remove specific images
docker rmi guessly-api:latest
```

## Best Practices

### 1. Use Multi-Stage Builds
- Reduces final image size
- Separates build and runtime dependencies

### 2. Run as Non-Root User
- Improves security
- Prevents privilege escalation

### 3. Use Health Checks
- Enables automatic restarts
- Improves reliability

### 4. Optimize Layer Caching
- Copy package files first
- Install dependencies before copying source code

### 5. Use .dockerignore
- Reduces build context size
- Speeds up builds

### 6. Tag Images Properly
- Use semantic versioning (v1.0.0)
- Tag with git commit SHA
- Include environment (prod, staging)

### 7. Secrets Management
- Never bake secrets into images
- Use environment variables
- Use Docker secrets or secrets managers

### 8. Monitor Resources
- Set memory and CPU limits
- Monitor with docker stats
- Use logging and monitoring tools

### 9. Keep Images Updated
- Regularly update base images
- Scan for vulnerabilities
- Use automated security scanning

### 10. Use Docker Compose for Development
- Simplifies multi-container setup
- Easy environment configuration
- Reproducible development environment

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Health Checks](https://docs.docker.com/engine/reference/builder/#healthcheck)

## Support

For issues or questions:
- GitHub Issues: https://github.com/guesslyfe/backend/issues
- Email: support@guesslyfe.com
- Documentation: https://docs.guesslyfe.com

## License

This documentation is part of the GuessLyfe project and is licensed under MIT.
