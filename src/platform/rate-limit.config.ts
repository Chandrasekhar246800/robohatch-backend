import { ThrottlerModuleOptions } from '@nestjs/throttler';

/**
 * Rate Limiting Configuration - Phase 13
 * 
 * CRITICAL: Prevents abuse and DoS attacks
 * 
 * Default: 100 requests per minute per IP
 * 
 * Route-specific overrides:
 * - Auth routes: 5/min (brute force protection)
 * - Payment routes: 3/min (abuse prevention)
 * - Webhooks: IP whitelisting (in controller)
 * - Admin routes: Higher limits (50/min)
 */
export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      name: 'default',
      ttl: 60000, // 60 seconds
      limit: 100, // 100 requests per minute
    },
    {
      name: 'auth',
      ttl: 60000, // 60 seconds
      limit: 5, // 5 requests per minute (strict for login/register)
    },
    {
      name: 'payment',
      ttl: 60000, // 60 seconds
      limit: 3, // 3 requests per minute (strict for payment initiation)
    },
    {
      name: 'admin',
      ttl: 60000, // 60 seconds
      limit: 50, // Higher limit for admin operations
    },
  ],
};
