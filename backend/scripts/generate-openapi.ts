/**
 * Generate OpenAPI JSON Specification
 *
 * This script generates the OpenAPI 3.0 specification from the NestJS application
 * and exports it to docs/openapi.json
 *
 * Usage: npm run generate:openapi
 */

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';

async function generateOpenApiSpec() {
  console.log('🚀 Generating OpenAPI specification...\n');

  // Create NestJS application without listening
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'], // Reduce logging noise
  });

  // Build Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Guessly API')
    .setDescription(
      `Comprehensive REST API for the GuessLyfe prediction market platform.

**GuessLyfe** is a decentralized prediction market platform built on Base blockchain where users can:
- Trade creator shares and earn dividends
- Create and trade on opinion markets
- Connect with Twitter for creator verification
- Earn rewards through accurate predictions

## Features
- 🔐 **Authentication**: Twitter OAuth + JWT bearer token
- 👤 **User Management**: Profile, wallet, portfolio tracking
- 🎨 **Creator System**: Verified creators with tradable shares
- 📊 **Opinion Markets**: Create and trade on prediction markets
- 💰 **Dividends**: Automated dividend distribution system
- 🔔 **Notifications**: Email, push, and in-app notifications
- ⚡ **Real-time Updates**: WebSocket support for live data

## Blockchain Integration
- Network: Base (Sepolia Testnet)
- Currency: USDC
- Smart Contracts: Creator shares, Opinion markets, Fee collection

## Rate Limits
- Default: 100 requests per minute per IP
- Authenticated: 1000 requests per minute per user

## Support
- Documentation: https://docs.guesslyfe.com
- Support: support@guesslyfe.com
      `
    )
    .setVersion('0.1.0')
    .setContact(
      'GuessLyfe Support',
      'https://guesslyfe.com',
      'support@guesslyfe.com'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000/api/v1', 'Local Development')
    .addServer('https://api-testnet.guesslyfe.com/api/v1', 'Testnet (Base Sepolia)')
    .addServer('https://api.guesslyfe.com/api/v1', 'Production (Base Mainnet)')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from /auth/login or /auth/twitter/callback',
      },
      'JWT-auth'
    )
    .addTag('Authentication', 'User authentication via Twitter OAuth and JWT tokens')
    .addTag('Users', 'User profile management and portfolio tracking')
    .addTag('Creators', 'Creator profiles, verification, and share management')
    .addTag('Shares', 'Creator share trading operations and transactions')
    .addTag('Markets', 'Opinion market creation, trading, and resolution')
    .addTag('Dividends', 'Dividend epoch management and distribution')
    .addTag('Twitter', 'Twitter integration and data synchronization')
    .addTag('Health', 'Health check and system status endpoints')
    .build();

  // Generate OpenAPI document
  const document = SwaggerModule.createDocument(app, config);

  // Create docs directory if it doesn't exist
  const docsDir = join(__dirname, '..', 'docs');
  try {
    mkdirSync(docsDir, { recursive: true });
  } catch (error) {
    // Directory already exists
  }

  // Write OpenAPI specification to file
  const outputPath = join(docsDir, 'openapi.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');

  console.log('✅ OpenAPI specification generated successfully!');
  console.log(`📄 File: ${outputPath}`);
  console.log(`📊 Endpoints documented: ${Object.keys(document.paths || {}).length}`);
  console.log(`🏷️  Tags: ${(document.tags || []).length}`);
  console.log(`📦 Schemas: ${Object.keys(document.components?.schemas || {}).length}\n`);

  // Also generate YAML version (optional)
  try {
    const yaml = require('js-yaml');
    const yamlPath = join(docsDir, 'openapi.yaml');
    writeFileSync(yamlPath, yaml.dump(document, { lineWidth: -1 }), 'utf-8');
    console.log(`📄 YAML version: ${yamlPath}\n`);
  } catch (error) {
    console.log('⚠️  YAML generation skipped (js-yaml not installed)\n');
  }

  // Close application
  await app.close();
}

// Run the generator
generateOpenApiSpec()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error generating OpenAPI specification:', error);
    process.exit(1);
  });
