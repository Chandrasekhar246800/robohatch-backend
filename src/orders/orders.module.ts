import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * OrdersModule - Phase 6 Order Creation & Checkout
 * 
 * SCOPE:
 * - Immutable financial records
 * - Price snapshots (never recalculated)
 * - Cart → Order conversion
 * - Idempotency enforcement
 * - Zero payment logic (Phase 7)
 */
@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
