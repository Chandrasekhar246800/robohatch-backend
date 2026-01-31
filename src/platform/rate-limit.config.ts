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
      ttl: 60000,
      limit: 100,
    },
    {
      name: 'auth',
      ttl: 60000,
      limit: 5,
    },
    {
      name: 'payment',
      ttl: 60000,
      limit: 10,
    },
  ],
};

