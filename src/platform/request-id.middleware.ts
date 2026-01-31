import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request ID Middleware - Phase 13
 * 
 * Adds a unique correlation ID to each request for tracing
 * Used for debugging and log aggregation
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] || randomUUID();
    
    // Store in request for controllers/services (extend Request interface)
    (req as any).requestId = requestId;
    
    // Return in response headers
    res.setHeader('X-Request-Id', requestId);
    
    next();
  }
}

