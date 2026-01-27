import { Module, Global } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuditLogService } from './audit-log.service';
import { PrismaModule } from '../prisma/prisma.module';
import { throttlerConfig } from './rate-limit.config';

/**
 * PlatformModule - Phase 13
 * 
 * Centralized infrastructure module for:
 * - Rate limiting
 * - Audit logging
 * - Request correlation
 * 
 * Global module - available everywhere
 */
@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot(throttlerConfig),
    PrismaModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AuditLogService,
  ],
  exports: [AuditLogService],
})
export class PlatformModule {}
