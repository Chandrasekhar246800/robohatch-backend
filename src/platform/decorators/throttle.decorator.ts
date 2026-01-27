import { SetMetadata } from '@nestjs/common';

export const THROTTLER_SKIP_KEY = 'throttler:skip';
export const THROTTLER_LIMIT_KEY = 'throttler:limit';
export const THROTTLER_TTL_KEY = 'throttler:ttl';

/**
 * Skip rate limiting for specific routes
 * Use with caution - only for webhooks with IP whitelisting
 */
export const SkipThrottle = () => SetMetadata(THROTTLER_SKIP_KEY, true);

/**
 * Custom rate limit for specific routes
 * 
 * @param name - Throttler name from config (auth, payment, admin, default)
 */
export const UseThrottler = (name: 'auth' | 'payment' | 'admin' | 'default') =>
  SetMetadata('throttlerName', name);
