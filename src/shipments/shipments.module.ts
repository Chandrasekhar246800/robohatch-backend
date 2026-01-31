import { Module } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ShipmentsController } from './shipments.controller';
import { AdminShipmentsController } from './admin-shipments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * ShipmentsModule - Phase 12 Fulfillment & Shipping Management
 * 
 * DEPENDENCIES:
 * - PrismaModule: Database access for shipment CRUD
 * - NotificationsModule: Email notifications for shipment events
 * 
 * CONTROLLERS:
 * - ShipmentsController: Customer endpoints (view own shipments)
 * - AdminShipmentsController: Admin endpoints (CRUD operations)
 * 
 * EXPORTS:
 * - ShipmentsService: Available for future integrations
 * 
 * PHASE BOUNDARIES:
 * - Does NOT modify Order, Payment, or Product
 * - Logistics layer only
 * - Integrates with Phase 10 (Notifications) for email alerts
 */
@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [ShipmentsController, AdminShipmentsController],
  providers: [ShipmentsService],
  exports: [ShipmentsService],
})
export class ShipmentsModule {}

