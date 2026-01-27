import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { VersioningType, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalValidationPipe } from './common/pipes/validation.pipe';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { getCorsConfig } from './platform/cors.config';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until logger is ready
  });
  
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Get configuration values
  const port = configService.get<number>('app.port') || 3000;
  const nodeEnv = configService.get<string>('app.nodeEnv') || 'development';
  const isDevelopment = configService.get<boolean>('app.isDevelopment') || false;
  const apiVersion = configService.get<string>('app.apiVersion') || 'v1';

  // Validate required environment variables
  const databaseUrl = configService.get<string>('database.url');
  if (!databaseUrl) {
    logger.error('❌ DATABASE_URL is not defined in environment variables');
    process.exit(1);
  }

  // ==================== PHASE 13: PRODUCTION HARDENING ====================

  // Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // CORS Configuration (Phase 13 Hardened)
  const corsConfig = getCorsConfig(isDevelopment);
  app.enableCors(corsConfig);

  if (isDevelopment) {
    logger.warn('⚠️  CORS is permissive in development mode');
  } else {
    logger.log('✅ CORS is locked down for production');
  }

  // ========================================================================

  // Set global prefix with versioning included
  app.setGlobalPrefix(`api/${apiVersion}`);

  // Apply global validation pipe
  app.useGlobalPipes(new GlobalValidationPipe(isDevelopment));

  // Apply global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Start the application
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/api/${apiVersion}`);
  logger.log(`📊 Environment: ${nodeEnv}`);
  logger.log(`🏥 Health check: http://localhost:${port}/api/${apiVersion}/health`);
  logger.log(`🔒 Rate limiting: ENABLED (Phase 13)`);
  logger.log(`🛡️  Security headers: ENABLED (Helmet)`);
}

bootstrap();
