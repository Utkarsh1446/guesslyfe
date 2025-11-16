# Guessly API Documentation

This directory contains the OpenAPI/Swagger documentation for the Guessly API.

## Quick Links

- **Swagger UI**: http://localhost:3000/api/docs (when server is running)
- **OpenAPI JSON**: `./openapi.json` (auto-generated in development mode)

## Accessing the Documentation

### 1. Swagger UI (Interactive)

The Swagger UI provides an interactive interface to explore and test all API endpoints.

**Start the server:**
```bash
npm run start:dev
```

**Access the UI:**
```
http://localhost:3000/api/docs
```

Features:
- 🔍 Browse all endpoints by category
- 📝 View request/response schemas
- 🧪 Test endpoints directly from the browser
- 🔐 Authenticate with JWT bearer tokens
- 📋 View examples and descriptions

### 2. OpenAPI JSON Specification

The OpenAPI JSON file is automatically generated when you start the server in development mode.

**Location:** `backend/docs/openapi.json`

This file is generated every time you run:
```bash
npm run start:dev
```

### 3. Manual Export

You can also export the OpenAPI spec manually from the Swagger UI:

1. Start the server: `npm run start:dev`
2. Open: http://localhost:3000/api/docs
3. Click on the `/api/docs-json` link at the top
4. Save the JSON output

## Using the OpenAPI Spec

### Import into Postman

1. Open Postman
2. Click **Import**
3. Select the `openapi.json` file
4. All endpoints will be imported with examples

### Generate Client SDKs

Use OpenAPI Generator to create client libraries:

```bash
# Install OpenAPI Generator
npm install @openapitools/openapi-generator-cli -g

# Generate TypeScript client
openapi-generator-cli generate \
  -i docs/openapi.json \
  -g typescript-axios \
  -o ./client-sdk

# Generate Python client
openapi-generator-cli generate \
  -i docs/openapi.json \
  -g python \
  -o ./python-client
```

Supported languages: TypeScript, JavaScript, Python, Java, Go, Ruby, PHP, Swift, Kotlin, and more.

### API Testing Tools

Import the `openapi.json` into:
- **Postman**: API testing and collaboration
- **Insomnia**: REST client
- **Bruno**: Offline API client
- **Hoppscotch**: Open-source API development

## API Overview

### Authentication

Most endpoints require authentication via JWT bearer token.

**Get a token:**
1. Login via Twitter OAuth: `GET /auth/twitter/login`
2. Use the session created after callback
3. Extract the JWT token from your session
4. Add to requests: `Authorization: Bearer YOUR_TOKEN`

**In Swagger UI:**
1. Click the **Authorize** button (🔒)
2. Enter your JWT token
3. Click **Authorize**
4. All subsequent requests will include the token

### Available Tags

- **Authentication**: Twitter OAuth login, logout, user session
- **Users**: User profiles, portfolios, transactions
- **Creators**: Creator management, shares, eligibility
- **Shares**: Buy/sell creator shares, transactions
- **Markets**: Create and trade on opinion markets
- **Dividends**: Dividend epochs and claims
- **Twitter**: Twitter profile data sync
- **Health**: System health checks

### Environments

The API supports multiple environments:

| Environment | URL | Purpose |
|------------|-----|---------|
| Local | http://localhost:3000/api/v1 | Development |
| Testnet | https://api-testnet.guesslyfe.com/api/v1 | Base Sepolia Testnet |
| Production | https://api.guesslyfe.com/api/v1 | Base Mainnet |

## Response Formats

All responses follow a consistent format:

**Success Response:**
```json
{
  "data": { ... },
  "message": "Success message",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/v1/endpoint"
}
```

## Rate Limits

- **Unauthenticated**: 100 requests/minute per IP
- **Authenticated**: 1000 requests/minute per user
- **Auth endpoints**: 5 requests/minute (login, callback)

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Time when limit resets

## Support

- **Documentation**: https://docs.guesslyfe.com
- **Support Email**: support@guesslyfe.com
- **GitHub Issues**: https://github.com/guesslyfe/api/issues

## Updating Documentation

The Swagger documentation is automatically generated from:
- Controller decorators (`@ApiTags`, `@ApiOperation`, etc.)
- DTO decorators (`@ApiProperty`, `@ApiPropertyOptional`, etc.)

**To update documentation:**
1. Add/update decorators in controllers and DTOs
2. Rebuild the project: `npm run build`
3. Restart the server: `npm run start:dev`
4. Check the updated docs at `/api/docs`

## Examples

### Example: Get Current User

```bash
curl -X GET "http://localhost:3000/api/v1/auth/me" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example: Search Users

```bash
curl -X GET "http://localhost:3000/api/v1/users/search?q=elon&limit=10"
```

### Example: Buy Creator Shares

```bash
curl -X POST "http://localhost:3000/api/v1/shares/buy" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "creatorAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "amount": "100000000",
    "maxPrice": "1500000"
  }'
```

## Version History

- **v0.1.0** (Current): Initial API release with creator shares and opinion markets

---

For more detailed information, visit the [Swagger UI](http://localhost:3000/api/docs) or read the [Complete Documentation](../COMPLETE_DOCUMENTATION.md).
