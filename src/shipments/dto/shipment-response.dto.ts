import { shipments_status as ShipmentStatus } from '@prisma/client';

/**
 * ShipmentResponseDto - Phase 12 Shipment Response
 * 
 * CUSTOMER VIEW:
 * - Can see shipment for own order only
 * - Tracking information visible
 * - Status visible
 * 
 * ADMIN VIEW:
 * - Can see all shipments
 * - Full details visible
 */
export class ShipmentResponseDto {
  id!: string;
  orderId!: string;
  courierName!: string;
  trackingNumber!: string;
  status!: ShipmentStatus;
  shippedAt!: Date | null;
  deliveredAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * AdminShipmentListDto - Extended response for admin list view
 * Includes order user email for identification
 */
export class AdminShipmentListDto extends ShipmentResponseDto {
  userEmail?: string;
  orderTotal?: number;
}

