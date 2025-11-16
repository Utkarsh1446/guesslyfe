# GuessLyfe Backend API

Backend API for GuessLyfe - A decentralized prediction market and creator platform built on blockchain technology.

## Overview

GuessLyfe is a prediction market platform that allows users to create and trade on opinion markets, buy shares of content creators, and earn dividends. The backend provides RESTful APIs and real-time WebSocket connections for seamless user experience.

### Key Features

- **Opinion Markets**: Create and trade on prediction markets
- **Creator Shares**: Buy and sell shares of content creators
- **Dividend Distribution**: Automated dividend calculations
- **Real-Time Updates**: WebSocket-based live updates
- **Admin Panel**: Comprehensive platform management
- **Blockchain Integration**: Ethereum-compatible smart contracts (Base chain)

### Tech Stack

- **Runtime**: Node.js 18 LTS
- **Framework**: NestJS 10.x (TypeScript)
- **Database**: PostgreSQL 15
- **Cache**: Redis 7.x
- **Blockchain**: ethers.js v6, Hardhat
- **Testing**: Jest, Supertest
- **Deployment**: Google Cloud Platform (Cloud Run)

---

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 15.0
- Redis >= 7.0
- npm >= 9.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/Utkarsh1446/guesslyfe.git
cd guesslyfe/backend

# Install dependencies
npm install

# Set up environment
cp .env.development .env
# Edit .env with your configuration

# Start services (Docker)
docker-compose up -d

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev
```

The API will be available at:
- **API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health

---

## Documentation

### 📚 Complete Documentation

**Start here**: [Documentation Index](./docs/INDEX.md)

### Core Documentation

| Document | Description |
|----------|-------------|
| [**DEVELOPMENT.md**](./docs/DEVELOPMENT.md) | Complete development setup and workflow guide |
| [**DEPLOYMENT.md**](./docs/DEPLOYMENT.md) | Production deployment guide (GCP) |
| [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) | System architecture and design |
| [**TESTING.md**](./docs/TESTING.md) | Testing strategy and guidelines |
| [**SECURITY.md**](./docs/SECURITY.md) | Security best practices and guidelines |
| [**MIGRATION.md**](./docs/MIGRATION.md) | Database migration procedures |
| [**RUNBOOK.md**](./docs/RUNBOOK.md) | Operations and incident response guide |

### Feature Documentation

| Document | Description |
|----------|-------------|
| [**WEBSOCKET.md**](./docs/WEBSOCKET.md) | Real-time WebSocket communication |
| [**ADMIN.md**](./docs/ADMIN.md) | Admin endpoints (21 endpoints) |
| [**ENVIRONMENT.md**](./docs/ENVIRONMENT.md) | Environment variables guide (150+ vars) |
| [**MONITORING.md**](./docs/MONITORING.md) | Monitoring and alerting setup |

### API Documentation

- **Swagger UI**: http://localhost:3000/api (when running)
- **OpenAPI Spec**: Available at `/api-json`

---

## Development

### Running the Application

```bash
# Development mode (with hot reload)
npm run start:dev

# Debug mode
npm run start:debug

# Production mode
npm run start:prod
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Database

```bash
# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run build
```

---

## Project Structure

```
backend/
├── src/
│   ├── common/              # Shared utilities and decorators
│   ├── config/              # Configuration files
│   ├── gateways/            # WebSocket gateways
│   ├── modules/             # Feature modules
│   │   ├── admin/           # Admin endpoints
│   │   ├── auth/            # Authentication
│   │   ├── markets/         # Opinion markets
│   │   ├── users/           # User management
│   │   └── ...
│   ├── migrations/          # Database migrations
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry point
├── test/                    # E2E and integration tests
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
├── deploy/                  # Deployment configurations
└── docker-compose.yml       # Local development services
```

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed architecture documentation.

---

## API Endpoints

### Authentication
- `POST /auth/login` - Wallet signature login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout

### Users
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update profile
- `GET /users/:id` - Get user by ID

### Markets
- `GET /markets` - List all markets
- `GET /markets/:id` - Get market details
- `POST /markets` - Create new market
- `POST /markets/:id/trade` - Execute trade

### Creator Shares
- `GET /shares/:creatorId` - Get creator shares info
- `POST /shares/buy` - Buy creator shares
- `POST /shares/sell` - Sell creator shares

### Admin (Protected)
- `GET /admin/markets/pending` - Pending markets
- `POST /admin/markets/:id/resolve` - Resolve market
- `GET /admin/system/stats` - System statistics
- ...21 admin endpoints total

See [Swagger Documentation](http://localhost:3000/api) for complete API reference.

---

## Environment Variables

Key environment variables (see [ENVIRONMENT.md](./docs/ENVIRONMENT.md) for complete list):

```bash
# Application
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=guesslyfe_development
DB_USERNAME=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d

# Blockchain
BLOCKCHAIN_NETWORK=baseSepolia
BLOCKCHAIN_RPC_URL=https://sepolia.base.org
CONTRACT_OPINION_MARKET=0x...
CONTRACT_CREATOR_SHARES=0x...
```

---

## Deployment

### Production Deployment

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for complete deployment guide.

Quick deployment to Google Cloud Run:

```bash
# Build and push container
docker build -t gcr.io/project-id/guesslyfe-api:latest .
docker push gcr.io/project-id/guesslyfe-api:latest

# Deploy to Cloud Run
gcloud run deploy guesslyfe-api \
  --image gcr.io/project-id/guesslyfe-api:latest \
  --region us-central1 \
  --platform managed
```

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Secrets in Secret Manager
- [ ] Monitoring configured
- [ ] SSL certificate obtained

See [ADMIN_PRODUCTION_TODO.md](./docs/ADMIN_PRODUCTION_TODO.md) for complete checklist.

---

## Testing

### Test Coverage

Current test coverage: **>90%**

- **Unit Tests**: 200+ tests
- **Integration Tests**: 50+ tests
- **E2E Tests**: 142+ test cases
- **Contract Tests**: Comprehensive smart contract coverage

See [TESTING.md](./docs/TESTING.md) for testing guide.

### Running Specific Tests

```bash
# Run specific test file
npm run test -- market.service.spec.ts

# Run tests matching pattern
npm run test -- --testNamePattern="should create market"

# Run E2E tests for specific module
npm run test:e2e -- markets.e2e-spec.ts
```

---

## Security

### Security Features

- ✅ Wallet signature authentication (EIP-191)
- ✅ JWT token-based authorization
- ✅ Role-based access control (RBAC)
- ✅ Rate limiting (per IP and per user)
- ✅ Input validation and sanitization
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Security headers (Helmet)
- ✅ CORS configuration
- ✅ Audit logging

See [SECURITY.md](./docs/SECURITY.md) for security documentation.

### Reporting Security Issues

If you discover a security vulnerability, please email **security@guesslyfe.com**. Do not create public GitHub issues for security vulnerabilities.

---

## Monitoring

### Health Checks

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed component health
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe

### Metrics

- **Prometheus**: http://localhost:3000/metrics
- **GCP Monitoring**: Configured with 8 alert policies
- **Uptime Monitoring**: Configured for production

See [MONITORING.md](./docs/MONITORING.md) for monitoring setup.

---

## Contributing

### Development Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and write tests
3. Run tests: `npm run test`
4. Lint code: `npm run lint`
5. Commit: `git commit -m "feat(scope): description"`
6. Push and create PR

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(markets): add market creation endpoint
fix(auth): resolve JWT expiration issue
docs(api): update Swagger documentation
test(markets): add integration tests
refactor(database): optimize query performance
```

### Code Review Checklist

- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code follows style guide
- [ ] No security vulnerabilities
- [ ] Performance acceptable
- [ ] Backward compatible (or documented)

---

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Database connection failed**
```bash
# Check PostgreSQL status
pg_isready
# Start PostgreSQL
brew services start postgresql@15  # macOS
sudo systemctl start postgresql     # Linux
```

**Redis connection failed**
```bash
# Check Redis status
redis-cli ping
# Start Redis
brew services start redis  # macOS
sudo systemctl start redis # Linux
```

See [RUNBOOK.md](./docs/RUNBOOK.md) for operational troubleshooting.

---

## Support

### Getting Help

- **Documentation**: Check [docs/INDEX.md](./docs/INDEX.md)
- **Issues**: Create a GitHub issue
- **Discussions**: Use GitHub Discussions
- **Security**: Email security@guesslyfe.com

### Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [ethers.js Documentation](https://docs.ethers.org/)
- [Google Cloud Documentation](https://cloud.google.com/docs)

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Team

**GuessLyfe Team**

- GitHub: [@Utkarsh1446](https://github.com/Utkarsh1446/guesslyfe)

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and release notes.

---

## Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Powered by [PostgreSQL](https://www.postgresql.org/) and [Redis](https://redis.io/)
- Blockchain integration with [ethers.js](https://docs.ethers.org/)
- Deployed on [Google Cloud Platform](https://cloud.google.com/)

---

**Last Updated**: 2024-11-16
**Version**: 1.0.0
