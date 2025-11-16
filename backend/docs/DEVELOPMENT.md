# Development Guide

Complete guide for setting up and developing the GuessLyfe prediction market platform locally.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Running the Application](#running-the-application)
- [Database Management](#database-management)
- [Testing](#testing)
- [Debugging](#debugging)
- [Code Quality](#code-quality)
- [Git Workflow](#git-workflow)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Prerequisites

### Required Software

- **Node.js**: >= 18.0.0 (LTS recommended)
- **npm**: >= 9.0.0
- **PostgreSQL**: >= 15.0
- **Redis**: >= 7.0
- **Docker**: >= 20.10 (optional, for containerized development)
- **Git**: >= 2.30

### Recommended Tools

- **VS Code**: Latest version with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features
  - Docker
  - REST Client
  - GitLens
- **Postman** or **Insomnia**: For API testing
- **pgAdmin** or **TablePlus**: For database management
- **Redis Insight**: For Redis management

### System Requirements

- **Operating System**: macOS, Linux, or Windows (WSL2 recommended)
- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: Minimum 10GB free space

---

## Quick Start

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/Utkarsh1446/guesslyfe.git
cd guesslyfe/backend

# Or if you already have it cloned
cd /path/to/guesslyfe/backend
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Or use clean install (recommended)
npm ci
```

### 3. Set Up Environment

```bash
# Copy environment template
cp .env.development .env

# Or use the interactive setup script
npm run setup:env
```

### 4. Start Services

**Option A: Using Docker (Recommended)**

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Verify services are running
docker-compose ps
```

**Option B: Local Installation**

```bash
# Start PostgreSQL (macOS)
brew services start postgresql@15

# Start Redis (macOS)
brew services start redis

# Or on Linux
sudo systemctl start postgresql
sudo systemctl start redis
```

### 5. Set Up Database

```bash
# Create database
npm run db:create

# Run migrations
npm run migration:run

# Seed database (optional)
npm run seed
```

### 6. Start Development Server

```bash
# Start in development mode (with hot reload)
npm run start:dev

# Application will be available at http://localhost:3000
# Swagger documentation at http://localhost:3000/api
```

**That's it!** You should now have the application running locally.

---

## Detailed Setup

### Installing Node.js

**macOS:**
```bash
# Using Homebrew
brew install node@18

# Or using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
nvm alias default 18
```

**Ubuntu/Debian:**
```bash
# Using NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

**Windows:**
```bash
# Download from https://nodejs.org
# Or use nvm-windows: https://github.com/coreybutler/nvm-windows
```

### Installing PostgreSQL

**macOS:**
```bash
# Using Homebrew
brew install postgresql@15
brew services start postgresql@15

# Create user
createuser -s postgres

# Verify installation
psql postgres -c "SELECT version();"
```

**Ubuntu/Debian:**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql-15 postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database user
sudo -u postgres createuser --interactive
```

**Docker (All Platforms):**
```bash
# Run PostgreSQL in Docker
docker run -d \
  --name guesslyfe-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=guesslyfe_development \
  -p 5432:5432 \
  -v postgres-data:/var/lib/postgresql/data \
  postgres:15-alpine
```

### Installing Redis

**macOS:**
```bash
# Using Homebrew
brew install redis
brew services start redis

# Verify installation
redis-cli ping
# Should return: PONG
```

**Ubuntu/Debian:**
```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Start service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify installation
redis-cli ping
```

**Docker (All Platforms):**
```bash
# Run Redis in Docker
docker run -d \
  --name guesslyfe-redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine \
  redis-server --appendonly yes
```

### Using Docker Compose

The project includes a `docker-compose.yml` for local development:

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: guesslyfe_development
    ports:
      - '5432:5432'
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: guesslyfe_test
    ports:
      - '5433:5432'
    volumes:
      - postgres-test-data:/var/lib/postgresql/data

volumes:
  postgres-data:
  redis-data:
  postgres-test-data:
```

Start all services:
```bash
docker-compose up -d
```

---

## Project Structure

```
backend/
├── src/
│   ├── common/              # Shared utilities, decorators, interceptors
│   │   ├── decorators/      # Custom decorators (@Public, @CurrentUser, etc.)
│   │   ├── filters/         # Exception filters
│   │   ├── guards/          # Authentication/authorization guards
│   │   ├── interceptors/    # Request/response interceptors
│   │   ├── pipes/           # Validation pipes
│   │   └── utils/           # Utility functions
│   ├── config/              # Configuration files
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── ...
│   ├── gateways/            # WebSocket gateways
│   │   ├── dto/             # WebSocket DTOs
│   │   ├── events.gateway.ts
│   │   ├── websocket.service.ts
│   │   └── websocket.module.ts
│   ├── modules/             # Feature modules
│   │   ├── admin/           # Admin endpoints
│   │   ├── auth/            # Authentication
│   │   ├── markets/         # Opinion markets
│   │   ├── users/           # User management
│   │   ├── notifications/   # Notifications
│   │   └── ...
│   ├── migrations/          # Database migrations
│   ├── entities/            # TypeORM entities
│   ├── app.module.ts        # Root module
│   └── main.ts              # Application entry point
├── test/                    # E2E and integration tests
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
├── deploy/                  # Deployment configurations
├── .env.development         # Development environment
├── .env.test                # Test environment
├── .env.production.example  # Production template
├── package.json
├── tsconfig.json
├── nest-cli.json
└── docker-compose.yml
```

### Module Structure

Each module follows a consistent structure:

```
modules/markets/
├── dto/                     # Data Transfer Objects
│   ├── create-market.dto.ts
│   ├── update-market.dto.ts
│   └── market-response.dto.ts
├── entities/                # Database entities
│   └── market.entity.ts
├── guards/                  # Module-specific guards
├── interfaces/              # TypeScript interfaces
├── market.controller.ts     # HTTP endpoints
├── market.service.ts        # Business logic
├── market.module.ts         # Module definition
├── market.controller.spec.ts # Controller tests
└── market.service.spec.ts   # Service tests
```

---

## Development Workflow

### 1. Create a New Feature

```bash
# Create a new branch
git checkout -b feature/new-feature-name

# Generate NestJS module (optional)
nest g module modules/feature-name
nest g controller modules/feature-name
nest g service modules/feature-name

# Create DTOs
touch src/modules/feature-name/dto/create-feature.dto.ts
touch src/modules/feature-name/dto/update-feature.dto.ts

# Create entity
touch src/modules/feature-name/entities/feature.entity.ts

# Create tests
touch src/modules/feature-name/feature.controller.spec.ts
touch src/modules/feature-name/feature.service.spec.ts
```

### 2. Write Code

Follow these principles:

**Controller (HTTP layer):**
```typescript
// market.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MarketService } from './market.service';
import { CreateMarketDto } from './dto/create-market.dto';

@ApiTags('Markets')
@Controller('markets')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get()
  @ApiOperation({ summary: 'Get all markets' })
  @ApiResponse({ status: 200, description: 'Returns all markets' })
  async findAll() {
    return this.marketService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new market' })
  @ApiResponse({ status: 201, description: 'Market created successfully' })
  async create(@Body() createMarketDto: CreateMarketDto) {
    return this.marketService.create(createMarketDto);
  }
}
```

**Service (Business logic):**
```typescript
// market.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpinionMarket } from './entities/market.entity';
import { CreateMarketDto } from './dto/create-market.dto';

@Injectable()
export class MarketService {
  constructor(
    @InjectRepository(OpinionMarket)
    private readonly marketRepository: Repository<OpinionMarket>,
  ) {}

  async findAll(): Promise<OpinionMarket[]> {
    return this.marketRepository.find();
  }

  async findOne(id: string): Promise<OpinionMarket> {
    const market = await this.marketRepository.findOne({ where: { id } });
    if (!market) {
      throw new NotFoundException(`Market with ID ${id} not found`);
    }
    return market;
  }

  async create(createMarketDto: CreateMarketDto): Promise<OpinionMarket> {
    const market = this.marketRepository.create(createMarketDto);
    return this.marketRepository.save(market);
  }
}
```

**DTO (Validation):**
```typescript
// dto/create-market.dto.ts
import { IsString, IsNotEmpty, IsDate, IsEnum, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMarketDto {
  @ApiProperty({ example: 'Will BTC reach $100k by end of 2024?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  question: string;

  @ApiProperty({ example: '2024-12-31T23:59:59Z' })
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @ApiProperty({ enum: ['crypto', 'sports', 'politics', 'entertainment'] })
  @IsEnum(['crypto', 'sports', 'politics', 'entertainment'])
  category: string;
}
```

**Entity (Database model):**
```typescript
// entities/market.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('opinion_markets')
export class OpinionMarket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  question: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'enum', enum: ['active', 'resolved', 'cancelled'], default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 3. Write Tests

```typescript
// market.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MarketService } from './market.service';
import { OpinionMarket } from './entities/market.entity';

describe('MarketService', () => {
  let service: MarketService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketService,
        {
          provide: getRepositoryToken(OpinionMarket),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MarketService>(MarketService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of markets', async () => {
      const markets = [{ id: '1', question: 'Test?' }];
      mockRepository.find.mockResolvedValue(markets);

      expect(await service.findAll()).toEqual(markets);
    });
  });
});
```

### 4. Run Tests

```bash
# Run unit tests
npm run test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run specific test file
npm run test market.service.spec.ts

# Run with coverage
npm run test:cov
```

### 5. Commit Changes

```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat(markets): add market creation endpoint"

# Push to remote
git push origin feature/new-feature-name
```

---

## Running the Application

### Development Mode

```bash
# Start with hot reload (recommended for development)
npm run start:dev

# Start in debug mode (with debugger)
npm run start:debug

# Start in production mode
npm run start:prod
```

### Watch Mode Features

- **Hot Reload**: Automatically restarts on file changes
- **Fast Compilation**: Uses `ts-node-dev` for quick rebuilds
- **Preserve Output**: Maintains console output between restarts

### Environment Variables

The application uses different `.env` files for different environments:

```bash
# Development
cp .env.development .env
npm run start:dev

# Test
cp .env.test .env
npm run test

# Production
cp .env.production.example .env.production
# Fill in production values
npm run start:prod
```

### Accessing the Application

Once running, you can access:

- **API Base URL**: http://localhost:3000
- **Swagger Documentation**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health
- **WebSocket**: ws://localhost:3000

---

## Database Management

### Creating Database

```bash
# Create database (PostgreSQL must be running)
createdb guesslyfe_development

# Or using SQL
psql postgres -c "CREATE DATABASE guesslyfe_development;"
```

### Migrations

```bash
# Generate migration from entity changes
npm run migration:generate -- -n MigrationName

# Create empty migration
npm run migration:create -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

**Example: Creating a Migration**

```bash
# 1. Modify your entity
# 2. Generate migration
npm run migration:generate -- -n AddIndexesToMarkets

# 3. Review generated migration in src/migrations/
# 4. Run migration
npm run migration:run
```

**Manual Migration Example:**

```typescript
// migrations/1234567890-AddIndexes.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexes1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX idx_markets_category ON opinion_markets(category);
      CREATE INDEX idx_markets_status ON opinion_markets(status);
      CREATE INDEX idx_markets_end_date ON opinion_markets(end_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX idx_markets_category;
      DROP INDEX idx_markets_status;
      DROP INDEX idx_markets_end_date;
    `);
  }
}
```

### Seeding Database

```bash
# Seed database with test data
npm run seed

# Clear database
npm run seed:clear

# Refresh (clear + seed)
npm run seed:refresh
```

**Example: Database Seeder**

```typescript
// src/database/seeders/market.seeder.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpinionMarket } from '../../modules/markets/entities/market.entity';

@Injectable()
export class MarketSeeder {
  constructor(
    @InjectRepository(OpinionMarket)
    private readonly marketRepository: Repository<OpinionMarket>,
  ) {}

  async seed() {
    const markets = [
      {
        question: 'Will BTC reach $100k by end of 2024?',
        category: 'crypto',
        endDate: new Date('2024-12-31'),
      },
      {
        question: 'Will ETH reach $5k by end of 2024?',
        category: 'crypto',
        endDate: new Date('2024-12-31'),
      },
    ];

    for (const market of markets) {
      await this.marketRepository.save(market);
    }

    console.log('✅ Markets seeded successfully');
  }
}
```

### Database Tools

**Connect to Database:**
```bash
# Using psql
psql guesslyfe_development

# Common commands:
# \dt          - List tables
# \d+ markets  - Describe table
# \q           - Quit
```

**Backup Database:**
```bash
# Backup
pg_dump guesslyfe_development > backup.sql

# Restore
psql guesslyfe_development < backup.sql
```

**Reset Database:**
```bash
# Drop and recreate
dropdb guesslyfe_development
createdb guesslyfe_development
npm run migration:run
npm run seed
```

---

## Testing

### Running Tests

```bash
# Unit tests
npm run test

# Unit tests with coverage
npm run test:cov

# Unit tests in watch mode
npm run test:watch

# E2E tests
npm run test:e2e

# Integration tests
npm run test:integration

# All tests
npm run test:all
```

### Test Structure

```typescript
// Example: Complete test suite
describe('MarketController (E2E)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ address: '0x...', signature: '0x...' });
    authToken = response.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /markets', () => {
    it('should create a market', () => {
      return request(app.getHttpServer())
        .post('/markets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          question: 'Will it rain tomorrow?',
          category: 'weather',
          endDate: '2024-12-31',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.question).toBe('Will it rain tomorrow?');
        });
    });
  });
});
```

### Coverage Reports

```bash
# Generate coverage report
npm run test:cov

# Open HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
```

Coverage thresholds (configured in `jest.config.js`):
- Statements: 90%
- Branches: 85%
- Functions: 90%
- Lines: 90%

---

## Debugging

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug NestJS",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "port": 9229,
      "restart": true,
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test:debug"],
      "port": 9229,
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

**Steps:**
1. Set breakpoints in VS Code
2. Press F5 or go to Run > Start Debugging
3. Select "Debug NestJS"
4. Make API request that hits your breakpoint

### Console Debugging

```typescript
// Use Logger for structured logging
import { Logger } from '@nestjs/common';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  async create(dto: CreateMarketDto) {
    this.logger.debug(`Creating market: ${JSON.stringify(dto)}`);

    try {
      const market = await this.marketRepository.save(dto);
      this.logger.log(`Market created: ${market.id}`);
      return market;
    } catch (error) {
      this.logger.error(`Failed to create market: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

### Database Query Debugging

Enable query logging in `.env`:

```bash
DB_LOGGING=true
```

This will log all SQL queries to the console.

### Network Debugging

```bash
# Use curl to test endpoints
curl http://localhost:3000/health

curl -X POST http://localhost:3000/markets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"question":"Test?","category":"test","endDate":"2024-12-31"}'

# Use httpie (prettier output)
http POST http://localhost:3000/markets \
  question="Test?" category="test" endDate="2024-12-31" \
  Authorization:"Bearer YOUR_TOKEN"
```

---

## Code Quality

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

**ESLint Configuration (.eslintrc.js):**

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

### Code Formatting

```bash
# Format code with Prettier
npm run format

# Check formatting
npm run format:check
```

**Prettier Configuration (.prettierrc):**

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always"
}
```

### Pre-commit Hooks

The project uses Husky for git hooks:

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "pre-push": "npm run test"
    }
  },
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

---

## Git Workflow

### Branch Naming Convention

- `feature/feature-name` - New features
- `bugfix/bug-name` - Bug fixes
- `hotfix/critical-bug` - Critical production fixes
- `refactor/refactor-name` - Code refactoring
- `docs/documentation-name` - Documentation updates
- `test/test-name` - Test additions/updates

### Commit Message Convention

Follow Conventional Commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```bash
git commit -m "feat(markets): add market creation endpoint"
git commit -m "fix(auth): resolve JWT expiration issue"
git commit -m "docs(api): update Swagger documentation"
git commit -m "test(markets): add integration tests for trading"
git commit -m "refactor(database): optimize query performance"
```

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make Changes and Commit**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

3. **Push to Remote**
   ```bash
   git push origin feature/my-feature
   ```

4. **Create Pull Request**
   - Go to GitHub
   - Create PR from your branch to `main`
   - Add description, link issues
   - Request review

5. **Address Review Comments**
   ```bash
   # Make changes
   git add .
   git commit -m "fix: address review comments"
   git push origin feature/my-feature
   ```

6. **Merge**
   - Squash and merge (preferred)
   - Or merge commit
   - Delete branch after merge

---

## Common Tasks

### Add a New Endpoint

1. Add method to controller:
```typescript
@Get(':id')
@ApiOperation({ summary: 'Get market by ID' })
async findOne(@Param('id') id: string) {
  return this.marketService.findOne(id);
}
```

2. Implement service method:
```typescript
async findOne(id: string): Promise<OpinionMarket> {
  const market = await this.marketRepository.findOne({ where: { id } });
  if (!market) {
    throw new NotFoundException(`Market with ID ${id} not found`);
  }
  return market;
}
```

3. Add tests
4. Test manually using Swagger or Postman
5. Commit and push

### Add a New Module

```bash
# Generate module structure
nest g module modules/feature-name
nest g controller modules/feature-name
nest g service modules/feature-name

# Create entity
touch src/modules/feature-name/entities/feature.entity.ts

# Create DTOs
mkdir src/modules/feature-name/dto
touch src/modules/feature-name/dto/create-feature.dto.ts

# Update module to import TypeORM
# Add to app.module.ts imports
```

### Add Database Migration

1. Modify entity:
```typescript
// Add new column to entity
@Column({ type: 'varchar', nullable: true })
newField: string;
```

2. Generate migration:
```bash
npm run migration:generate -- -n AddNewFieldToMarket
```

3. Review generated migration in `src/migrations/`

4. Run migration:
```bash
npm run migration:run
```

### Add New Environment Variable

1. Add to `.env.development`:
```bash
NEW_VARIABLE=value
```

2. Add to `.env.example`:
```bash
NEW_VARIABLE=your-new-variable-value
```

3. Add to configuration:
```typescript
// src/config/app.config.ts
export default () => ({
  newVariable: process.env.NEW_VARIABLE,
});
```

4. Use in code:
```typescript
constructor(private configService: ConfigService) {}

const value = this.configService.get<string>('newVariable');
```

### Update Dependencies

```bash
# Check outdated packages
npm outdated

# Update specific package
npm update package-name

# Update all packages (minor versions)
npm update

# Update to latest versions (use carefully)
npm install package-name@latest

# Security audit
npm audit
npm audit fix
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or change port in .env
PORT=3001
```

### Database Connection Failed

```bash
# Check if PostgreSQL is running
pg_isready

# Check connection details
psql -h localhost -U postgres -d guesslyfe_development

# Verify .env database settings
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=guesslyfe_development
```

### Redis Connection Failed

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Start Redis if not running
brew services start redis  # macOS
sudo systemctl start redis  # Linux

# Check .env Redis settings
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear TypeScript cache
rm -rf dist

# Rebuild
npm run build
```

### TypeScript Compilation Errors

```bash
# Check TypeScript version
npx tsc --version

# Check tsconfig.json is correct
# Ensure paths are configured correctly

# Clear cache and rebuild
rm -rf dist
npm run build
```

### Test Failures

```bash
# Clear Jest cache
npm run test -- --clearCache

# Run tests in verbose mode
npm run test -- --verbose

# Run specific test file
npm run test market.service.spec.ts
```

### Hot Reload Not Working

```bash
# Ensure you're using start:dev
npm run start:dev

# Check if watch mode is enabled in nest-cli.json
# Try clearing cache
rm -rf dist
```

---

## Contributing

### Code Style Guidelines

- Use TypeScript strict mode
- Follow NestJS best practices
- Write self-documenting code
- Add JSDoc comments for complex logic
- Keep functions small and focused
- Use dependency injection
- Write tests for new code
- Update documentation

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Swagger docs updated (if API changed)
- [ ] Database migrations created (if schema changed)
- [ ] Environment variables documented (if added)

### Getting Help

- Check existing documentation
- Search GitHub issues
- Ask in team chat
- Create detailed GitHub issue

---

## Useful Commands Reference

```bash
# Development
npm run start:dev          # Start with hot reload
npm run start:debug        # Start with debugger
npm run build              # Build for production
npm run start:prod         # Run production build

# Testing
npm run test               # Run unit tests
npm run test:watch         # Watch mode
npm run test:cov           # With coverage
npm run test:e2e           # E2E tests
npm run test:all           # All tests

# Database
npm run migration:generate # Generate migration
npm run migration:run      # Run migrations
npm run migration:revert   # Revert migration
npm run seed               # Seed database

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix linting issues
npm run format             # Format code
npm run format:check       # Check formatting

# Utilities
npm run setup:env          # Interactive env setup
npm run validate:env       # Validate environment
npm outdated               # Check outdated packages
npm audit                  # Security audit
```

---

## Next Steps

After completing local setup:

1. **Explore Swagger Docs**: http://localhost:3000/api
2. **Read Architecture Docs**: [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Review Testing Guide**: [TESTING.md](./TESTING.md)
4. **Check API Documentation**: Browse Swagger UI
5. **Try Examples**: Use Postman collection in `/docs/postman/`

For deployment:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment guide
- [RUNBOOK.md](./RUNBOOK.md) - Operations guide

---

**Last Updated**: 2024-11-16
**Version**: 1.0.0
