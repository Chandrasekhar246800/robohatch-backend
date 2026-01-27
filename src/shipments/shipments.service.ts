import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OrderStatus, ShipmentStatus } from '@prisma/client';
import { CreateShipmentDto, UpdateShipmentDto } from './dto/shipment.dto';
import { ShipmentResponseDto, AdminShipmentListDto } from './dto/shipment-response.dto';

/**
 * ShipmentsService - Phase 12 Fulfillment & Shipping Management
 * 
 * CRITICAL PRINCIPLES:
 * 1. Shipments are SEPARATE from orders (logistics layer)
 * 2. Orders remain IMMUTABLE (no price/item changes)
 * 3. Payments are UNTOUCHED (no financial mutations)
 * 4. One shipment per order (unique constraint)
 * 5. Only PAID orders can have shipments
 * 6. Status flow is enforced (cannot move backwards)
 * 
 * PHASE BOUNDARIES:
 * - Does NOT modify Order, OrderItem, Payment, or Product
 * - Does NOT recalculate prices
 * - Does NOT trigger refunds
 * - Phase 12 is logistics only
 */
@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Create shipment for a paid order
   * 
   * ADMIN-ONLY operation
   * 
   * VALIDATION (ALL MUST PASS):
   * 1. Order must exist
   * 2. Order must be PAID
   * 3. Shipment must not already exist
   * 4. Courier name + tracking number required
   * 
   * POST-CREATION:
   * - Email notification sent (fire-and-forget)
   * - Shipment status defaults to PENDING
   */
  async createShipment(
    orderId: string,
    createShipmentDto: CreateShipmentDto,
  ): Promise<ShipmentResponseDto> {
    const { courierName, trackingNumber } = createShipmentDto;

    // STEP 1: Verify order exists and is PAID
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        userId: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        `Cannot create shipment for order with status: ${order.status}. Order must be PAID.`,
      );
    }

    // STEP 2: Check if shipment already exists (prevent duplicates)
    const existingShipment = await this.prisma.shipment.findUnique({
      where: { orderId },
    });

    if (existingShipment) {
      throw new ConflictException(
        `Shipment already exists for order ${orderId}`,
      );
    }

    // STEP 3: Check if tracking number is unique
    const duplicateTracking = await this.prisma.shipment.findUnique({
      where: { trackingNumber },
    });

    if (duplicateTracking) {
      throw new ConflictException(
        `Tracking number ${trackingNumber} is already in use`,
      );
    }

    // STEP 4: Create shipment (no transaction needed - single write)
    const shipment = await this.prisma.shipment.create({
      data: {
        orderId,
        courierName,
        trackingNumber,
        status: ShipmentStatus.PENDING,
      },
    });

    this.logger.log(
      `Shipment created for order ${orderId} (courier: ${courierName}, tracking: ${trackingNumber})`,
    );

    // STEP 5: Send notification (fire-and-forget)
    this.notificationsService.notifyShipmentCreated({
      email: order.user.email,
      orderId,
      courierName,
      trackingNumber,
    });

    return this.mapToResponseDto(shipment);
  }

  /**
   * Update shipment status
   * 
   * ADMIN-ONLY operation
   * 
   * STATUS FLOW ENFORCEMENT:
   * PENDING → SHIPPED → IN_TRANSIT → DELIVERED
   * 
   * AUTOMATIC TIMESTAMPS:
   * - shippedAt: Set when status changes to SHIPPED
   * - deliveredAt: Set when status changes to DELIVERED
   * 
   * VALIDATION:
   * - Cannot move backwards in status
   * - Tracking number must be unique if changed
   */
  async updateShipment(
    shipmentId: string,
    updateShipmentDto: UpdateShipmentDto,
  ): Promise<ShipmentResponseDto> {
    const { status, courierName, trackingNumber } = updateShipmentDto;

    // STEP 1: Verify shipment exists
    const existingShipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: {
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!existingShipment) {
      throw new NotFoundException('Shipment not found');
    }

    // STEP 2: Validate status transition (if status is being updated)
    if (status && status !== existingShipment.status) {
      this.validateStatusTransition(existingShipment.status, status);
    }

    // STEP 3: Check tracking number uniqueness (if being changed)
    if (trackingNumber && trackingNumber !== existingShipment.trackingNumber) {
      const duplicateTracking = await this.prisma.shipment.findUnique({
        where: { trackingNumber },
      });

      if (duplicateTracking) {
        throw new ConflictException(
          `Tracking number ${trackingNumber} is already in use`,
        );
      }
    }

    // STEP 4: Prepare update data with automatic timestamps
    const updateData: any = {};

    if (courierName) updateData.courierName = courierName;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;

    if (status) {
      updateData.status = status;

      // Set shippedAt when status changes to SHIPPED
      if (status === ShipmentStatus.SHIPPED && !existingShipment.shippedAt) {
        updateData.shippedAt = new Date();
      }

      // Set deliveredAt when status changes to DELIVERED
      if (status === ShipmentStatus.DELIVERED && !existingShipment.deliveredAt) {
        updateData.deliveredAt = new Date();
      }
    }

    // STEP 5: Update shipment
    const shipment = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: updateData,
    });

    this.logger.log(
      `Shipment ${shipmentId} updated (status: ${shipment.status})`,
    );

    // STEP 6: Send notifications based on status change (fire-and-forget)
    const userEmail = existingShipment.order.user.email;

    if (status === ShipmentStatus.SHIPPED && status !== existingShipment.status) {
      this.notificationsService.notifyOrderShipped({
        email: userEmail,
        orderId: shipment.orderId,
        courierName: shipment.courierName,
        trackingNumber: shipment.trackingNumber,
        shippedAt: shipment.shippedAt!,
      });
    }

    if (status === ShipmentStatus.DELIVERED && status !== existingShipment.status) {
      this.notificationsService.notifyOrderDelivered({
        email: userEmail,
        orderId: shipment.orderId,
        deliveredAt: shipment.deliveredAt!,
      });
    }

    return this.mapToResponseDto(shipment);
  }

  /**
   * Get shipment by order ID (Customer access with ownership check)
   * 
   * CUSTOMER operation
   * OWNERSHIP: User can only view shipment for their own order
   */
  async getShipmentByOrderId(
    orderId: string,
    userId: string,
  ): Promise<ShipmentResponseDto> {
    // STEP 1: Verify order ownership (CRITICAL security check)
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // STEP 2: Fetch shipment
    const shipment = await this.prisma.shipment.findUnique({
      where: { orderId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found for this order');
    }

    return this.mapToResponseDto(shipment);
  }

  /**
   * Get shipment by ID (Admin access - no ownership check)
   * 
   * ADMIN operation
   */
  async getShipmentById(shipmentId: string): Promise<ShipmentResponseDto> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    return this.mapToResponseDto(shipment);
  }

  /**
   * List all shipments (Admin access)
   * 
   * ADMIN operation
   * Includes user email and order total for admin convenience
   */
  async listAllShipments(): Promise<AdminShipmentListDto[]> {
    const shipments = await this.prisma.shipment.findMany({
      include: {
        order: {
          select: {
            total: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return shipments.map((shipment) => ({
      ...this.mapToResponseDto(shipment),
      userEmail: shipment.order.user.email,
      orderTotal: Number(shipment.order.total),
    }));
  }

  /**
   * Validate status transition
   * 
   * ENFORCED FLOW:
   * PENDING → SHIPPED → IN_TRANSIT → DELIVERED
   * 
   * RULES:
   * - Cannot move backwards
   * - Cannot skip steps (e.g., PENDING → DELIVERED)
   */
  private validateStatusTransition(
    currentStatus: ShipmentStatus,
    newStatus: ShipmentStatus,
  ): void {
    const statusOrder = [
      ShipmentStatus.PENDING,
      ShipmentStatus.SHIPPED,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.DELIVERED,
    ];

    const currentIndex = statusOrder.indexOf(currentStatus);
    const newIndex = statusOrder.indexOf(newStatus);

    // Cannot move backwards
    if (newIndex < currentIndex) {
      throw new BadRequestException(
        `Invalid status transition: Cannot move from ${currentStatus} to ${newStatus} (backwards movement not allowed)`,
      );
    }

    // Cannot skip steps (must move one step at a time)
    if (newIndex > currentIndex + 1) {
      throw new BadRequestException(
        `Invalid status transition: Cannot skip from ${currentStatus} to ${newStatus} (must progress sequentially)`,
      );
    }

    // Cannot stay in the same status (no-op updates rejected)
    if (newIndex === currentIndex) {
      throw new BadRequestException(
        `Invalid status transition: Shipment is already ${currentStatus}`,
      );
    }
  }

  /**
   * Map Prisma shipment to response DTO
   */
  private mapToResponseDto(shipment: any): ShipmentResponseDto {
    return {
      id: shipment.id,
      orderId: shipment.orderId,
      courierName: shipment.courierName,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      shippedAt: shipment.shippedAt,
      deliveredAt: shipment.deliveredAt,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    };
  }
}
