import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AddressesModule } from './addresses/addresses.module';
import { ProductsModule } from './products/products.module';
import { ProductModelsModule } from './product-models/product-models.module';
import { MaterialsModule } from './materials/materials.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AdminOrdersModule } from './admin-orders/admin-orders.module';
import { DemoModule } from './demo/demo.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InvoicesModule } from './invoices/invoices.module';
import { FilesModule } from './files/files.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { CustomFilesModule } from './custom-files/custom-files.module';
import { PlatformModule } from './platform/platform.module'; // Phase 13
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { RequestIdMiddleware } from './platform/request-id.middleware'; // Phase 13
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import razorpayConfig from './config/razorpay.config';
import emailConfig from './config/email.config';
import storageConfig from './config/storage.config';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    // Global configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, razorpayConfig, emailConfig, storageConfig],
      envFilePath: ['.env'],
      cache: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    // Global Prisma module
    PrismaModule,
    // Global common utilities
    CommonModule,
    // Phase 13: Platform Infrastructure (Rate Limiting, Audit Logging)
    PlatformModule,
    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    AddressesModule,
    ProductsModule,
    ProductModelsModule,
    MaterialsModule,
    CartModule, // Phase 5: Shopping Cart
    OrdersModule, // Phase 6: Orders
    PaymentsModule, // Phase 7: Payments
    AdminOrdersModule, // Phase 9: Admin Order Management (Read-Only)
    WebhooksModule, // Phase 7: Webhooks
    NotificationsModule, // Phase 10: Email Notifications
    InvoicesModule, // Phase 10: Invoice Generation
    FilesModule, // Phase 11: Secure File Delivery
    ShipmentsModule, // Phase 12: Fulfillment & Shipping Management
    CustomFilesModule, // Custom File Upload via Email
    DemoModule,
  ],
  providers: [
    // Apply JWT guard globally
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Apply Roles guard globally
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Phase 13: Add correlation ID to all requests
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}


