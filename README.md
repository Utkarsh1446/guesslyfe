# Guessly Backend

Backend API service for Guessly - A decentralized prediction market platform built on Base blockchain.

## Overview

This is the backend service for Guessly that provides:
- RESTful API endpoints for prediction markets
- Smart contract integration with Base blockchain
- Database management with PostgreSQL
- Real-time event listening for blockchain transactions
- User authentication and authorization
- Market creation and trading functionality

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with TypeORM
- **Blockchain**: Base (Sepolia testnet)
- **Cache**: Redis
- **Queue**: Bull
- **Documentation**: Swagger/OpenAPI

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis
- npm or yarn

### Installation

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Update .env with your configuration
```

4. Run database migrations:
```bash
npm run migration:run
```

5. Start the development server:
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000/api/v1`

## API Documentation

Once the server is running, access the Swagger documentation at:
`http://localhost:3000/api/docs`

## Deployment

The backend is deployed on Google Cloud Platform using Cloud Run.

Production URL: `https://guessly-backend-738787111842.us-central1.run.app`

For deployment instructions, see the backend README.

## Project Structure

```
backend/
├── src/
│   ├── modules/          # Feature modules
│   ├── contracts/        # Blockchain contract services
│   ├── database/         # Database entities and migrations
│   ├── config/          # Configuration files
│   └── main.ts          # Application entry point
└── scripts/             # Utility scripts
```
