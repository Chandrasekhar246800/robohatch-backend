import { ValidationPipe } from '@nestjs/common';

export class GlobalValidationPipe extends ValidationPipe {
  constructor(isDevelopment: boolean) {
    super({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Automatically convert types
      },
      disableErrorMessages: false, // Show detailed errors in development
      validationError: {
        target: isDevelopment, // Include target in validation errors (dev only)
        value: isDevelopment, // Include value in validation errors (dev only)
      },
    });
  }
}

