import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * HealthController - Phase 13 Enhanced
 * 
 * Kubernetes/Docker-compatible health checks
 * 
 * /health/live  - Liveness probe (is the app running?)
 * /health/ready - Readiness probe (can it accept traffic?)
 */
@Controller('health')
export class HealthController {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Liveness probe
   * Returns 200 if the application is alive
   * Used by Kubernetes to restart unhealthy pods
   */
  @Public()
  @Get('live')
  live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness probe
   * Returns 200 if the application is ready to accept traffic
   * Checks dependencies: DB (critical), Razorpay, SMTP, S3 (optional)
   */
  @Public()
  @Get('ready')
  async ready() {
    const checks = {
      database: await this.checkDatabase(),
      razorpay: this.checkRazorpay(),
      smtp: this.checkSmtp(),
      s3: this.checkS3(),
    };

    // Only database is critical for readiness
    // Other services (Razorpay, SMTP, S3) are optional features
    const criticalHealthy = checks.database.healthy;

    if (!criticalHealthy) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        checks,
        timestamp: new Date().toISOString(),
        message: 'Database connection required',
      });
    }

    // Determine overall status
    const allHealthy = Object.values(checks).every((check) => check.healthy);
    const status = allHealthy ? 'ready' : 'degraded';

    return {
      status,
      checks,
      timestamp: new Date().toISOString(),
      environment: this.configService.get<string>('app.nodeEnv'),
    };
  }

  /**
   * Legacy health check (backwards compatibility)
   */
  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      environment: this.configService.get<string>('app.nodeEnv'),
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== HEALTH CHECK HELPERS ====================

  private async checkDatabase(): Promise<{ healthy: boolean; message?: string }> {
    try {
      // Simple query to verify DB connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        message: 'Database connection failed',
      };
    }
  }

  private checkRazorpay(): { healthy: boolean; message?: string } {
    const keyId = this.configService.get<string>('razorpay.keyId');
    const keySecret = this.configService.get<string>('razorpay.keySecret');

    if (!keyId || !keySecret) {
      return {
        healthy: false,
        message: 'Razorpay credentials not configured',
      };
    }

    return { healthy: true };
  }

  private checkSmtp(): { healthy: boolean; message?: string } {
    const smtpHost = this.configService.get<string>('smtp.host');
    const smtpUser = this.configService.get<string>('smtp.user');

    if (!smtpHost || !smtpUser) {
      return {
        healthy: false,
        message: 'SMTP not configured',
      };
    }

    return { healthy: true };
  }

  private checkS3(): { healthy: boolean; message?: string } {
    const bucket = this.configService.get<string>('aws.s3Bucket');
    const accessKey = this.configService.get<string>('aws.accessKeyId');

    if (!bucket || !accessKey) {
      return {
        healthy: false,
        message: 'AWS S3 not configured',
      };
    }

    return { healthy: true };
  }
}

