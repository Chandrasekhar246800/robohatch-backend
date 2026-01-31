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
      origin: true,
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

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || [];

  if (allowedOrigins.length === 0) {
    throw new Error('ALLOWED_ORIGINS must be set in production');
  }

  return {
    origin: (origin, callback) => {
      if (!origin) {
        return callback(new Error('Origin header required'));
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Idempotency-Key',
    ],
    exposedHeaders: ['X-Request-Id'],
  };
};

