# GuessLyfe Documentation Index

Complete documentation for the GuessLyfe prediction market platform.

## Quick Links

- **New to the project?** Start with [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Deploying to production?** See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Running tests?** Check [TESTING.md](./TESTING.md)
- **Understanding the system?** Read [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Security concerns?** Review [SECURITY.md](./SECURITY.md)
- **Database changes?** Follow [MIGRATION.md](./MIGRATION.md)
- **Production issues?** Consult [RUNBOOK.md](./RUNBOOK.md)

---

## Getting Started

### For Developers

1. **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Start here
   - Prerequisites and installation
   - Project structure
   - Development workflow
   - Running the application locally
   - Common development tasks

2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Understand the system
   - High-level architecture
   - Technology stack
   - System components
   - Data flow
   - Design decisions

3. **[TESTING.md](./TESTING.md)** - Write and run tests
   - Testing strategy
   - Unit, integration, and E2E tests
   - Test coverage requirements
   - Testing best practices

### For Operators

1. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deploy to production
   - GCP setup
   - Database and Redis configuration
   - Container build and deployment
   - Load balancer and SSL setup
   - Post-deployment verification

2. **[RUNBOOK.md](./RUNBOOK.md)** - Operations guide
   - Common operational tasks
   - Incident response
   - Emergency procedures
   - Monitoring and alerting
   - Troubleshooting

3. **[MONITORING.md](./MONITORING.md)** - Monitor the system
   - Health checks
   - Metrics collection
   - Alerting rules
   - Dashboard setup
   - Performance monitoring

### For Security

1. **[SECURITY.md](./SECURITY.md)** - Security documentation
   - Authentication and authorization
   - Input validation
   - Data protection
   - API security
   - Blockchain security

---

## Documentation by Category

### 🚀 Getting Started

| Document | Description | Audience |
|----------|-------------|----------|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Local development setup and workflow | Developers |
| [README.md](../README.md) | Project overview and quick start | Everyone |

### 🏗️ Architecture & Design

| Document | Description | Audience |
|----------|-------------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and design | Developers, Architects |
| [API.md](./API.md) | API documentation (if separate from Swagger) | Developers, Integrators |

### 🛠️ Operations

| Document | Description | Audience |
|----------|-------------|----------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment guide | DevOps, SRE |
| [RUNBOOK.md](./RUNBOOK.md) | Operational procedures | DevOps, SRE, On-call |
| [MONITORING.md](./MONITORING.md) | Monitoring and alerting | DevOps, SRE |

### 🗄️ Database

| Document | Description | Audience |
|----------|-------------|----------|
| [MIGRATION.md](./MIGRATION.md) | Database migration procedures | Developers, DBAs |
| [ADMIN_PRODUCTION_TODO.md](./ADMIN_PRODUCTION_TODO.md) | Production checklist | Project Managers, DevOps |

### 🔒 Security

| Document | Description | Audience |
|----------|-------------|----------|
| [SECURITY.md](./SECURITY.md) | Security guidelines and best practices | Everyone |

### 🧪 Testing

| Document | Description | Audience |
|----------|-------------|----------|
| [TESTING.md](./TESTING.md) | Testing strategy and guide | Developers, QA |

### 📡 Features

| Document | Description | Audience |
|----------|-------------|----------|
| [WEBSOCKET.md](./WEBSOCKET.md) | WebSocket real-time communication | Developers, Integrators |
| [ENVIRONMENT.md](./ENVIRONMENT.md) | Environment variables guide | Developers, DevOps |
| [ADMIN.md](./ADMIN.md) | Admin endpoints documentation | Admins, Developers |

---

## Documentation by Role

### I'm a New Developer

1. Read [README.md](../README.md) for project overview
2. Follow [DEVELOPMENT.md](./DEVELOPMENT.md) to set up local environment
3. Review [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
4. Check [TESTING.md](./TESTING.md) before writing code
5. Read [SECURITY.md](./SECURITY.md) for security best practices

### I'm an Existing Developer

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Reference for common tasks
- [MIGRATION.md](./MIGRATION.md) - Database schema changes
- [TESTING.md](./TESTING.md) - Writing and running tests
- [SECURITY.md](./SECURITY.md) - Security guidelines
- [WEBSOCKET.md](./WEBSOCKET.md) - Real-time features

### I'm a DevOps Engineer

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [RUNBOOK.md](./RUNBOOK.md) - Operational procedures
- [MONITORING.md](./MONITORING.md) - Monitoring setup
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Configuration management
- [MIGRATION.md](./MIGRATION.md) - Database migrations

### I'm On-Call

- [RUNBOOK.md](./RUNBOOK.md) - **START HERE** for incidents
- [MONITORING.md](./MONITORING.md) - Understanding alerts
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Rollback procedures
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System components

### I'm a Security Auditor

- [SECURITY.md](./SECURITY.md) - Security documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture overview
- [ADMIN.md](./ADMIN.md) - Admin access controls
- [ENVIRONMENT.md](./ENVIRONMENT.md) - Secret management

### I'm an API Consumer

- Swagger UI: `https://api.guesslyfe.com/api` (when running)
- [WEBSOCKET.md](./WEBSOCKET.md) - WebSocket API
- [README.md](../README.md) - Authentication guide

---

## Documentation by Task

### Setting Up Development Environment

1. [DEVELOPMENT.md](./DEVELOPMENT.md) - Complete setup guide
2. [ENVIRONMENT.md](./ENVIRONMENT.md) - Environment variables

### Writing Code

1. [ARCHITECTURE.md](./ARCHITECTURE.md) - Understanding the codebase
2. [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
3. [TESTING.md](./TESTING.md) - Writing tests
4. [SECURITY.md](./SECURITY.md) - Security best practices

### Making Database Changes

1. [MIGRATION.md](./MIGRATION.md) - Creating and running migrations
2. [DEVELOPMENT.md](./DEVELOPMENT.md) - Local database setup
3. [DEPLOYMENT.md](./DEPLOYMENT.md) - Production database

### Deploying to Production

1. [ADMIN_PRODUCTION_TODO.md](./ADMIN_PRODUCTION_TODO.md) - Pre-deployment checklist
2. [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment steps
3. [MONITORING.md](./MONITORING.md) - Set up monitoring
4. [RUNBOOK.md](./RUNBOOK.md) - Post-deployment verification

### Responding to Incidents

1. [RUNBOOK.md](./RUNBOOK.md) - Emergency procedures
2. [MONITORING.md](./MONITORING.md) - Understanding alerts
3. [DEPLOYMENT.md](./DEPLOYMENT.md) - Rollback procedures
4. [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture

### Adding New Features

1. [ARCHITECTURE.md](./ARCHITECTURE.md) - Design principles
2. [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
3. [TESTING.md](./TESTING.md) - Testing requirements
4. [MIGRATION.md](./MIGRATION.md) - Database changes (if needed)
5. [SECURITY.md](./SECURITY.md) - Security review

---

## Specialized Topics

### Real-Time Features (WebSocket)

- [WEBSOCKET.md](./WEBSOCKET.md) - Complete WebSocket guide
  - Connection authentication
  - Room subscriptions
  - Event types
  - Client integration examples
  - Scaling with Redis

### Admin Operations

- [ADMIN.md](./ADMIN.md) - Admin endpoints
  - 21 admin endpoints
  - Wallet signature authentication
  - Audit logging
  - Usage examples

### Environment Configuration

- [ENVIRONMENT.md](./ENVIRONMENT.md) - Environment setup
  - 150+ environment variables
  - Validation scripts
  - Environment-specific configs
  - Secret management

### Monitoring & Observability

- [MONITORING.md](./MONITORING.md) - Complete monitoring guide
  - Health checks
  - Prometheus metrics
  - GCP alerts
  - Dashboards
  - Uptime monitoring

---

## External Resources

### Official Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [ethers.js Documentation](https://docs.ethers.org/)

### Google Cloud Platform

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Memorystore Documentation](https://cloud.google.com/memorystore/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)

### Best Practices

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [The Twelve-Factor App](https://12factor.net/)
- [Google SRE Book](https://sre.google/sre-book/table-of-contents/)

---

## Contributing to Documentation

### Documentation Standards

- Use Markdown format
- Include table of contents for long documents
- Add code examples where applicable
- Keep language clear and concise
- Update last modified date when making changes

### Creating New Documentation

1. Identify the gap or need
2. Create document in appropriate category
3. Follow existing document structure
4. Add to this index
5. Update README.md if needed
6. Submit PR with documentation changes

### Updating Existing Documentation

1. Make changes to relevant documents
2. Update "Last Updated" date
3. Update index if document name/purpose changed
4. Test any code examples
5. Submit PR

---

## Document Status

| Document | Last Updated | Version | Status |
|----------|--------------|---------|--------|
| README.md | 2024-11-16 | 1.0.0 | ✅ Current |
| DEVELOPMENT.md | 2024-11-16 | 1.0.0 | ✅ Current |
| DEPLOYMENT.md | 2024-11-16 | 1.0.0 | ✅ Current |
| ARCHITECTURE.md | 2024-11-16 | 1.0.0 | ✅ Current |
| TESTING.md | 2024-11-16 | 1.0.0 | ✅ Current |
| SECURITY.md | 2024-11-01 | 1.0.0 | ✅ Current |
| MIGRATION.md | 2024-11-16 | 1.0.0 | ✅ Current |
| RUNBOOK.md | 2024-11-16 | 1.0.0 | ✅ Current |
| MONITORING.md | 2024-11-16 | 1.0.0 | ✅ Current |
| WEBSOCKET.md | 2024-11-16 | 1.0.0 | ✅ Current |
| ENVIRONMENT.md | 2024-11-16 | 1.0.0 | ✅ Current |
| ADMIN.md | 2024-11-16 | 1.0.0 | ✅ Current |
| ADMIN_PRODUCTION_TODO.md | 2024-11-16 | 1.0.0 | ✅ Current |

---

## Quick Reference Commands

```bash
# Development
npm run start:dev           # Start development server
npm run test                # Run tests
npm run lint                # Lint code

# Database
npm run migration:generate  # Generate migration
npm run migration:run       # Run migrations
npm run migration:revert    # Rollback migration

# Production
npm run build               # Build for production
npm run start:prod          # Run production build

# Testing
npm run test:watch          # Watch mode
npm run test:cov            # With coverage
npm run test:e2e            # E2E tests

# Documentation
npm run docs:serve          # Serve API docs (if configured)
```

---

## Support and Contact

### For Developers

- **Questions**: Check existing documentation first
- **Issues**: Create GitHub issue
- **Discussions**: Use GitHub Discussions

### For Operations

- **Production Issues**: See [RUNBOOK.md](./RUNBOOK.md)
- **On-Call**: Emergency contact in Runbook
- **Escalation**: Defined in Runbook

### For Security

- **Security Issues**: security@guesslyfe.com
- **Vulnerability Reports**: See [SECURITY.md](./SECURITY.md)

---

## Glossary

**API** - Application Programming Interface
**CDN** - Content Delivery Network
**CORS** - Cross-Origin Resource Sharing
**CSP** - Content Security Policy
**DTO** - Data Transfer Object
**E2E** - End-to-End
**GCP** - Google Cloud Platform
**IAM** - Identity and Access Management
**JWT** - JSON Web Token
**ORM** - Object-Relational Mapping
**RBAC** - Role-Based Access Control
**REST** - Representational State Transfer
**RPC** - Remote Procedure Call
**SLA** - Service Level Agreement
**SQL** - Structured Query Language
**SSL** - Secure Sockets Layer
**TLS** - Transport Layer Security
**USDC** - USD Coin (stablecoin)
**VPC** - Virtual Private Cloud
**WAF** - Web Application Firewall
**XSS** - Cross-Site Scripting

---

## License

This documentation is part of the GuessLyfe project. All rights reserved.

---

**Last Updated**: 2024-11-16
**Maintained By**: GuessLyfe Team
**Version**: 1.0.0
