import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { users_role as Role } from '@prisma/client';
import { CreateShipmentDto, UpdateShipmentDto } from './dto/shipment.dto';
import { ShipmentResponseDto, AdminShipmentListDto } from './dto/shipment-response.dto';

/**
 * AdminShipmentsController - Phase 12 Admin Shipment Management
 * 
 * SECURITY:
 * - ADMIN role ONLY
 * - JWT authentication required
 * - Full access to shipment CRUD
 * 
 * ENDPOINTS:
 * POST   /api/v1/admin/shipments/:orderId      - Create shipment
 * PATCH  /api/v1/admin/shipments/:shipmentId   - Update shipment
 * GET    /api/v1/admin/shipments                - List all shipments
 * GET    /api/v1/admin/shipments/:shipmentId    - Get shipment by ID
 * 
 * PHASE BOUNDARIES:
 * - Does NOT modify Order, Payment, or Product
 * - Does NOT recalculate prices
 * - Logistics layer only
 */
@Controller('admin/shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN) // ADMIN-ONLY
export class AdminShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  /**
   * Create shipment for a paid order
   * 
   * POST /api/v1/admin/shipments/:orderId
   * 
   * VALIDATION:
   * - Order must exist
   * - Order must be PAID
   * - Shipment must not already exist
   * 
   * REQUEST BODY:
   * {
   *   "courierName": "FedEx",
   *   "trackingNumber": "123456789"
   * }
   * 
   * RESPONSE:
   * {
   *   "id": "uuid",
   *   "orderId": "uuid",
   *   "courierName": "FedEx",
   *   "trackingNumber": "123456789",
   *   "status": "PENDING",
   *   "shippedAt": null,
   *   "deliveredAt": null,
   *   "createdAt": "2026-01-27T09:00:00Z",
   *   "updatedAt": "2026-01-27T09:00:00Z"
   * }
   * 
   * FAILURE CASES:
   * - 404: Order not found
   * - 400: Order not PAID
   * - 409: Shipment already exists / tracking number in use
   */
  @Post(':orderId')
  @HttpCode(HttpStatus.CREATED)
  async createShipment(
    @Param('orderId') orderId: string,
    @Body() createShipmentDto: CreateShipmentDto,
  ): Promise<ShipmentResponseDto> {
    return this.shipmentsService.createShipment(orderId, createShipmentDto);
  }

  /**
   * Update shipment status or details
   * 
   * PATCH /api/v1/admin/shipments/:shipmentId
   * 
   * STATUS FLOW (enforced):
   * PENDING → SHIPPED → IN_TRANSIT → DELIVERED
   * 
   * REQUEST BODY:
   * {
   *   "status": "SHIPPED",
   *   "courierName": "UPS",  // optional
   *   "trackingNumber": "987654321"  // optional
   * }
   * 
   * AUTOMATIC TIMESTAMPS:
   * - shippedAt: Set when status → SHIPPED
   * - deliveredAt: Set when status → DELIVERED
   * 
   * FAILURE CASES:
   * - 404: Shipment not found
   * - 400: Invalid status transition (backwards/skip)
   * - 409: Tracking number already in use
   */
  @Patch(':shipmentId')
  @HttpCode(HttpStatus.OK)
  async updateShipment(
    @Param('shipmentId') shipmentId: string,
    @Body() updateShipmentDto: UpdateShipmentDto,
  ): Promise<ShipmentResponseDto> {
    return this.shipmentsService.updateShipment(shipmentId, updateShipmentDto);
  }

  /**
   * List all shipments (admin view)
   * 
   * GET /api/v1/admin/shipments
   * 
   * RESPONSE:
   * [
   *   {
   *     "id": "uuid",
   *     "orderId": "uuid",
   *     "courierName": "FedEx",
   *     "trackingNumber": "123456789",
   *     "status": "DELIVERED",
   *     "shippedAt": "2026-01-27T10:00:00Z",
   *     "deliveredAt": "2026-01-27T15:00:00Z",
   *     "createdAt": "2026-01-27T09:00:00Z",
   *     "updatedAt": "2026-01-27T15:00:00Z",
   *     "userEmail": "customer@example.com",
   *     "orderTotal": 1499.99
   *   }
   * ]
   * 
   * Ordered by: Most recent first (createdAt DESC)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listAllShipments(): Promise<AdminShipmentListDto[]> {
    return this.shipmentsService.listAllShipments();
  }

  /**
   * Get shipment by ID (admin view)
   * 
   * GET /api/v1/admin/shipments/:shipmentId
   * 
   * FAILURE CASES:
   * - 404: Shipment not found
   */
  @Get(':shipmentId')
  @HttpCode(HttpStatus.OK)
  async getShipment(
    @Param('shipmentId') shipmentId: string,
  ): Promise<ShipmentResponseDto> {
    return this.shipmentsService.getShipmentById(shipmentId);
  }
}


