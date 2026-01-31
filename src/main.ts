import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { VersioningType, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalValidationPipe } from './common/pipes/validation.pipe';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { getCorsConfig } from './platform/cors.config';
import { PrismaService } from './prisma/prisma.service';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
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

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    }),
  );

  const corsConfig = getCorsConfig(isDevelopment);
  app.enableCors(corsConfig);

  if (isDevelopment) {
    logger.warn('⚠️  CORS is permissive in development mode');
  } else {
    logger.log('✅ CORS is locked down for production');
  }

  // Set global prefix with versioning included
  app.setGlobalPrefix(`api/${apiVersion}`);

  // Apply global validation pipe
  app.useGlobalPipes(new GlobalValidationPipe(isDevelopment));

  // Apply global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port);

  const prisma = app.get(PrismaService);

  const shutdown = async (signal: string) => {
    logger.log(`${signal} received, starting graceful shutdown`);

    try {
      await prisma.$disconnect();
      logger.log('Database connections closed');

      await app.close();
      logger.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.log(`🚀 Application is running on: http://localhost:${port}/api/${apiVersion}`);
  logger.log(`📊 Environment: ${nodeEnv}`);
  logger.log(`🏥 Health check: http://localhost:${port}/api/${apiVersion}/health`);
  logger.log(`🔒 Rate limiting: ENABLED (Phase 13)`);
  logger.log(`🛡️  Security headers: ENABLED (Helmet)`);
}

bootstrap();

