import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * CORS Configuration - Phase 13
 * 
 * CRITICAL: Production-safe CORS settings
 * 
 * Development: Allows all origins for local testing
 * Production: Strict whitelist only
 */
export const getCorsConfig = (isDevelopment: boolean): CorsOptions => {
  if (isDevelopment) {
    return {
      origin: '*', // Permissive for development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Idempotency-Key',
      ],
    };
  }

  // PRODUCTION: Strict whitelist
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

  if (allowedOrigins.length === 0) {
    throw new Error('ALLOWED_ORIGINS must be set in production');
  }

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, Postman)
      if (!origin) {
        return callback(null, true);
      }

      // Check whitelist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Reject unknown origins
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true, // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Idempotency-Key',
    ],
    exposedHeaders: ['X-Request-Id'], // Correlation ID
  };
};
