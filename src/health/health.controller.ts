import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  async health() {
    return this.healthService.checkHealth();
  }

  @Public()
  @Get('ready')
  async ready() {
    const isReady = await this.healthService.checkReadiness();

    if (!isReady) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        message: 'Database not reachable',
      });
    }

    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('db')
  async testDb() {
    const result = await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'DB CONNECTED', result };
  }
}


