/**
 * Security Configuration
 *
 * Helmet and CORS configuration for application security
 */

import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Helmet Configuration (Security Headers)
 */
export const helmetConfig = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },

  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },

  // X-Frame-Options
  frameguard: {
    action: 'deny' as const, // Prevent clickjacking
  },

  // X-Content-Type-Options
  noSniff: true, // Prevent MIME type sniffing

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin' as const,
  },

  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none' as const,
  },

  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false,
  },

  // X-Download-Options
  ieNoOpen: true,

  // Hide X-Powered-By header
  hidePoweredBy: true,
} as const;

/**
 * CORS Configuration
 */
export const getCorsConfig = (): CorsOptions => {
  // Get allowed origins from environment
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000', // Local frontend development
    'http://localhost:3001', // Local admin dashboard
  ];

  // Add production origins from environment
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  if (process.env.ADMIN_DASHBOARD_URL) {
    allowedOrigins.push(process.env.ADMIN_DASHBOARD_URL);
  }

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is allowed
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Request-ID',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400, // 24 hours
  };
};

/**
 * Development CORS Config (more permissive)
 */
export const devCorsConfig: CorsOptions = {
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
};

/**
 * Get appropriate CORS config based on environment
 */
export const getAppCorsConfig = (): CorsOptions => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? devCorsConfig : getCorsConfig();
};
