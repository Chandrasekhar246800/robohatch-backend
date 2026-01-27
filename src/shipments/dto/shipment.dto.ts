import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ShipmentStatus } from '@prisma/client';

/**
 * CreateShipmentDto - Phase 12 Shipment Creation
 * 
 * ADMIN-ONLY operation
 * 
 * REQUIREMENTS:
 * - Order must exist
 * - Order must be PAID
 * - Shipment must not already exist
 * - Courier name and tracking number required
 */
export class CreateShipmentDto {
  @IsString()
  @IsNotEmpty()
  courierName!: string;

  @IsString()
  @IsNotEmpty()
  trackingNumber!: string;
}

/**
 * UpdateShipmentDto - Phase 12 Shipment Status Update
 * 
 * ADMIN-ONLY operation
 * 
 * STATUS FLOW (Cannot move backwards):
 * PENDING → SHIPPED → IN_TRANSIT → DELIVERED
 * 
 * AUTOMATIC TIMESTAMPS:
 * - shippedAt set when status = SHIPPED
 * - deliveredAt set when status = DELIVERED
 */
export class UpdateShipmentDto {
  @IsEnum(ShipmentStatus)
  @IsOptional()
  status?: ShipmentStatus;

  @IsString()
  @IsOptional()
  courierName?: string;

  @IsString()
  @IsOptional()
  trackingNumber?: string;
}
