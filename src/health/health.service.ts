import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly startTime: Date;

  constructor(private readonly prisma: PrismaService) {
    this.startTime = new Date();
  }

  async checkHealth() {
    const dbHealthy = await this.checkDatabase();
    const uptime = this.getUptime();

    return {
      status: dbHealthy ? 'ok' : 'degraded',
      database: dbHealthy,
      uptime,
      timestamp: new Date().toISOString(),
    };
  }

  async checkReadiness() {
    const dbHealthy = await this.checkDatabase();
    return dbHealthy;
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }
}
