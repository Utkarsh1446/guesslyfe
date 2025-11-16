# E2E Tests

Comprehensive integration tests for the GuessLyfe API.

## Test Structure

```
test/
├── helpers/
│   └── test-helpers.ts       # Test utilities and helpers
├── mocks/
│   ├── blockchain.mock.ts    # Mock blockchain service
│   └── twitter.mock.ts       # Mock Twitter API
├── auth.e2e-spec.ts          # Authentication tests
├── users.e2e-spec.ts         # User management tests
├── creators.e2e-spec.ts      # Creator profile tests
├── shares.e2e-spec.ts        # Share trading tests
├── markets.e2e-spec.ts       # Opinion market tests
├── dividends.e2e-spec.ts     # Dividend distribution tests
├── health.e2e-spec.ts        # Health check tests
├── test.config.ts            # Test configuration
├── setup.ts                  # Global test setup
└── jest-e2e.json             # Jest configuration
```

## Running Tests

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Specific Test Suite
```bash
npm run test:e2e -- auth.e2e-spec.ts
npm run test:e2e -- users.e2e-spec.ts
```

### Run with Coverage
```bash
npm run test:e2e:cov
```

### Watch Mode
```bash
npm run test:e2e:watch
```

## Test Database Setup

Tests use a separate PostgreSQL database to avoid affecting development data.

### Prerequisites

1. PostgreSQL running on `localhost:5432`
2. Test database created:
   ```sql
   CREATE DATABASE guessly_test;
   ```

3. Redis running on `localhost:6379` (or configure `TEST_REDIS_HOST`)

### Environment Variables

Create a `.env.test` file or set these variables:

```env
# Database
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_USERNAME=postgres
TEST_DB_PASSWORD=postgres
TEST_DB_DATABASE=guessly_test

# Redis
TEST_REDIS_HOST=localhost
TEST_REDIS_PORT=6379
TEST_REDIS_DB=1

# Optional: Override other config for tests
```

## Test Configuration

### Database

- **Auto-sync**: Schema is automatically created from entities
- **Drop schema**: Database is cleared before each test run
- **Isolation**: Each test uses transactions for data isolation

### Mocks

External services are mocked to ensure tests are:
- Fast (no network requests)
- Reliable (no external dependencies)
- Isolated (predictable data)

#### Mocked Services:
- **Blockchain**: All smart contract interactions
- **Twitter API**: OAuth and profile fetching
- **Email**: SendGrid email sending
- **Push Notifications**: Firebase Cloud Messaging

## Test Coverage

Coverage target: **>80%** for all metrics

### Coverage Reports

After running tests with coverage:
- **HTML Report**: `coverage-e2e/lcov-report/index.html`
- **Terminal**: Summary printed after test run
- **LCOV**: `coverage-e2e/lcov.info` (for CI/CD)

### View Coverage Report
```bash
npm run test:e2e:cov
open coverage-e2e/lcov-report/index.html
```

## Test Categories

### 1. Authentication Tests (`auth.e2e-spec.ts`)
- Twitter OAuth flow
- Session management
- Wallet linking
- Logout
- Rate limiting
- Security validation

### 2. User Tests (`users.e2e-spec.ts`)
- Profile management
- User search
- Portfolio viewing
- Transaction history
- Data privacy

### 3. Creator Tests (`creators.e2e-spec.ts`)
- Eligibility checks
- Creator profiles
- Performance metrics
- Volume tracking

### 4. Share Trading Tests (`shares.e2e-spec.ts`)
- Buy shares
- Sell shares
- Price queries
- Chart data
- Holder lists
- Transaction history

### 5. Market Tests (`markets.e2e-spec.ts`)
- Market creation
- Market trading
- Market resolution
- Market queries
- Activity tracking

### 6. Dividend Tests (`dividends.e2e-spec.ts`)
- Epoch management
- Dividend claims
- Earnings tracking
- Distribution workflows

### 7. Health Tests (`health.e2e-spec.ts`)
- System health checks
- Database connectivity
- Memory usage
- Disk usage

## Test Patterns

### Success Cases
```typescript
it('should perform action successfully', async () => {
  const response = await request(app.getHttpServer())
    .post('/endpoint')
    .send(validData)
    .expect(200);

  expect(response.body).toHaveProperty('expectedField');
});
```

### Validation Errors
```typescript
it('should reject invalid input', async () => {
  await request(app.getHttpServer())
    .post('/endpoint')
    .send(invalidData)
    .expect(400);
});
```

### Authentication
```typescript
it('should require authentication', async () => {
  await request(app.getHttpServer())
    .get('/protected-endpoint')
    .expect(401);
});

it('should allow authenticated access', async () => {
  const sessionToken = await createAuthSession(app, testUser);

  await authenticatedRequest(app, sessionToken)
    .get('/protected-endpoint')
    .expect(200);
});
```

### Authorization
```typescript
it('should require admin role', async () => {
  const userSession = await createAuthSession(app, regularUser);

  await authenticatedRequest(app, userSession)
    .post('/admin-endpoint')
    .send(data)
    .expect(403);
});
```

## Debugging Tests

### Enable Logging
```typescript
// In test.config.ts
database: {
  logging: true, // Enable SQL logging
}
```

### Run Single Test
```bash
npm run test:e2e -- --testNamePattern="should create market"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand test/markets.e2e-spec.ts
```

## CI/CD Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  run: |
    npm run test:e2e:cov
  env:
    TEST_DB_HOST: localhost
    TEST_DB_PORT: 5432
    TEST_DB_USERNAME: postgres
    TEST_DB_PASSWORD: postgres
    TEST_DB_DATABASE: guessly_test
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Use `beforeEach` and `afterEach` hooks
3. **Mock External Services**: Don't make real API calls
4. **Descriptive Names**: Test names should describe behavior
5. **Assertions**: Use specific expectations, not just status codes
6. **Data Fixtures**: Use test.config.ts for test data
7. **Fast Tests**: Keep tests fast (<30s total)

## Troubleshooting

### Tests Hanging
- Check database connection
- Ensure Redis is running
- Check for unclosed connections

### Flaky Tests
- Use `waitFor` helper for async operations
- Avoid time-dependent tests
- Ensure proper cleanup

### Coverage Issues
- Check `collectCoverageFrom` patterns in jest-e2e.json
- Exclude test files and DTOs
- Focus on service and controller coverage

## Contributing

When adding new endpoints:

1. Add tests to appropriate e2e-spec file
2. Test success cases
3. Test validation errors
4. Test authentication/authorization
5. Test edge cases
6. Ensure >80% coverage

---

For more information, see the [main documentation](../COMPLETE_DOCUMENTATION.md).
