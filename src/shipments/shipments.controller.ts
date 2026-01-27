import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { ShipmentResponseDto } from './dto/shipment-response.dto';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    email: string;
    role: Role;
  };
}

/**
 * ShipmentsController - Phase 12 Customer Shipment Access
 * 
 * SECURITY:
 * - CUSTOMER role ONLY (admins use admin controller)
 * - JWT authentication required
 * - Ownership verified by service layer
 * 
 * ENDPOINTS:
 * GET /api/v1/orders/:orderId/shipment
 *   → Get shipment for own order
 * 
 * PHASE BOUNDARIES:
 * - Read-only access to shipment data
 * - No Order/Payment mutations
 * - Ownership enforced via findFirst({ orderId, userId })
 */
@Controller('orders/:orderId/shipment')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER) // CUSTOMER-ONLY: Admins use /admin/shipments
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  /**
   * Get shipment for customer's own order
   * 
   * GET /api/v1/orders/:orderId/shipment
   * 
   * SECURITY:
   * - CUSTOMER role required
   * - User must own order (userId check in service)
   * 
   * RESPONSE:
   * {
   *   "id": "uuid",
   *   "orderId": "uuid",
   *   "courierName": "FedEx",
   *   "trackingNumber": "123456789",
   *   "status": "SHIPPED",
   *   "shippedAt": "2026-01-27T10:00:00Z",
   *   "deliveredAt": null,
   *   "createdAt": "2026-01-27T09:00:00Z",
   *   "updatedAt": "2026-01-27T10:00:00Z"
   * }
   * 
   * FAILURE CASES:
   * - 404: Order not found / not owned by user / shipment doesn't exist
   * - 401: No JWT token
   * - 403: Not a CUSTOMER role
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getShipment(
    @Param('orderId') orderId: string,
    @Req() req: RequestWithUser,
  ): Promise<ShipmentResponseDto> {
    const userId = req.user.sub;
    return this.shipmentsService.getShipmentByOrderId(orderId, userId);
  }
}
