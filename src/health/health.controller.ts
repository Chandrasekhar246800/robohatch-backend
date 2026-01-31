import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

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
}

