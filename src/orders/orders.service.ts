import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto, OrderItemResponseDto, OrderAddressResponseDto } from './dto/order-response.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * OrdersService - Phase 6 Order Creation & Checkout
 * 
 * CRITICAL PRINCIPLES:
 * 1. Orders are IMMUTABLE financial records
 * 2. Prices are SNAPSHOTS (never recalculated)
 * 3. Cart is CLEARED after order creation
 * 4. Idempotency prevents duplicate orders
 * 5. Everything happens in a TRANSACTION
 * 
 * PRICE SNAPSHOT FORMULA (LOCKED):
 * - itemPrice = basePrice + materialPrice
 * - lineTotal = itemPrice * quantity
 * - subtotal = sum(lineTotal)
 * - total = subtotal (taxes/shipping later)
 */
@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Checkout - Create order from cart
   * 
   * FLOW:
   * 1. Fetch cart + items
   * 2. Validate cart not empty
   * 3. Revalidate products/materials active
   * 4. Calculate prices server-side
   * 5. BEGIN TRANSACTION
   *    - Create Order (status = CREATED)
   *    - Create OrderItems with snapshots
   *    - Clear cart items
   * 6. COMMIT
   * 7. Return order summary
   */
  async checkout(userId: string): Promise<OrderResponseDto> {
    const cart = await this.prisma.carts.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
            material: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const invalidItems: string[] = [];
    for (const item of cart.items) {
      if (!item.product.isActive || !item.material.isActive) {
        invalidItems.push(item.id);
      }
    }

    if (invalidItems.length > 0) {
      throw new BadRequestException('Cart contains inactive items');
    }

    let subtotal = new Decimal(0);
    const orderItemsData = cart.items.map((item) => {
      const basePrice = new Decimal(item.product.basePrice);
      const materialPrice = new Decimal(item.material.price);
      const itemPrice = basePrice.add(materialPrice);
      const lineTotal = itemPrice.mul(item.quantity);
      subtotal = subtotal.add(lineTotal);

      return {
        productId: item.product.id,
        productName: item.product.name,
        basePrice: basePrice,
        materialId: item.material.id,
        materialName: item.material.name,
        materialPrice: materialPrice,
        quantity: item.quantity,
        itemPrice: itemPrice,
        lineTotal: lineTotal,
      };
    });

    const total = subtotal;

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          idempotencyKey: `checkout_${userId}_${Date.now()}`,
          subtotal,
          total,
          status: 'CREATED',
        },
      });

      await tx.orderItem.createMany({
        data: orderItemsData.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          productName: item.productName,
          basePrice: item.basePrice,
          materialId: item.materialId,
          materialName: item.materialName,
          materialPrice: item.materialPrice,
          quantity: item.quantity,
          itemPrice: item.itemPrice,
          lineTotal: item.lineTotal,
        })),
      });

      await tx.cart_items.deleteMany({
        where: { cartId: cart.id },
      });

      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          items: true,
        },
      });
    });

    return this.mapCheckoutOrderToResponse(order!);
  }

  async getOrders(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
      },
    });

    return orders.map((order) => ({
      orderId: order.id,
      status: order.status,
      totalAmount: parseFloat(order.total.toString()),
      createdAt: order.createdAt,
    }));
  }

  /**
   * Create order from cart
   * 
   * FLOW (DO NOT REORDER):
   * 1. Extract userId from JWT
   * 2. Read Idempotency-Key header
   * 3. If order exists with same key + user → return it
   * 4. Fetch cart + items
   * 5. If cart empty → reject
   * 6. Revalidate cart items (product/material active)
   * 7. Recalculate prices
   * 8. Fetch address → validate ownership
   * 9. BEGIN TRANSACTION
   *    9.1 Create Order
   *    9.2 Create OrderItems (snapshot)
   *    9.3 Create OrderAddress (snapshot)
   *    9.4 Clear cart
   * 10. COMMIT
   * 11. Return order summary
   * 
   * If any step fails → rollback
   */
  async createOrder(
    userId: string,
    idempotencyKey: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const { addressId } = createOrderDto;

    // STEP 3: Check if order already exists with same idempotency key + user
    const existingOrder = await this.prisma.order.findFirst({
      where: {
        userId,
        idempotencyKey,
      },
      include: {
        items: true,
        address: true,
      },
    });

    if (existingOrder) {
      // Return existing order (idempotent behavior)
      return this.mapOrderToResponse(existingOrder);
    }

    // STEP 4: Fetch cart + items
    const cart = await this.prisma.carts.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
            material: true,
          },
        },
      },
    });

    // STEP 5: If cart empty → reject
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty. Add items before creating an order.');
    }

    // STEP 6: Revalidate cart items
    const invalidItems: string[] = [];
    for (const item of cart.items) {
      if (!item.product.isActive || !item.material.isActive) {
        invalidItems.push(item.id);
      }
    }

    if (invalidItems.length > 0) {
      throw new BadRequestException(
        'Cart contains inactive items. Please refresh your cart before checkout.',
      );
    }

    // STEP 7: Recalculate prices (snapshot at creation time)
    let subtotal = new Decimal(0);
    const orderItemsData = cart.items.map((item) => {
      const basePrice = new Decimal(item.product.basePrice);
      const materialPrice = new Decimal(item.material.price);
      const itemPrice = basePrice.add(materialPrice);
      const lineTotal = itemPrice.mul(item.quantity);
      subtotal = subtotal.add(lineTotal);

      return {
        productId: item.product.id,
        productName: item.product.name,
        basePrice: basePrice,
        materialId: item.material.id,
        materialName: item.material.name,
        materialPrice: materialPrice,
        quantity: item.quantity,
        itemPrice: itemPrice,
        lineTotal: lineTotal,
      };
    });

    const total = subtotal; // No taxes/shipping yet

    // STEP 8: Fetch address → validate ownership
    const address = await this.prisma.addresses.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found or does not belong to you');
    }

    // Fetch user profile for full name and phone
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    // STEP 9: BEGIN TRANSACTION
    const order = await this.prisma.$transaction(async (tx) => {
      // 9.1 Create Order
      const newOrder = await tx.order.create({
        data: {
          userId,
          idempotencyKey,
          subtotal,
          total,
          status: 'CREATED',
        },
      });

      // 9.2 Create OrderItems (snapshot)
      await tx.orderItem.createMany({
        data: orderItemsData.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          productName: item.productName,
          basePrice: item.basePrice,
          materialId: item.materialId,
          materialName: item.materialName,
          materialPrice: item.materialPrice,
          quantity: item.quantity,
          itemPrice: item.itemPrice,
          lineTotal: item.lineTotal,
        })),
      });

      // 9.3 Create OrderAddress (snapshot)
      await tx.order_addresses.create({
        data: {
          orderId: newOrder.id,
          fullName: profile?.fullName || 'N/A',
          phone: profile?.phone || 'N/A',
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
        },
      });

      // 9.4 Clear cart
      await tx.cart_items.deleteMany({
        where: { cartId: cart.id },
      });

      // Return order with relations
      return tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          items: true,
          address: true,
          user: true,
        },
      });
    });

    // STEP 10: COMMIT (automatic)
    
    // STEP 10.5: Send order created email (fire-and-forget)
    this.notificationsService.notifyOrderCreated({
      email: order!.user.email,
      orderId: order!.id,
      total: parseFloat(order!.total.toString()),
      orderDate: order!.createdAt,
    });
    
    // STEP 11: Return order summary
    return this.mapOrderToResponse(order!);
  }

  /**
   * Get order by ID
   * 
   * OWNERSHIP: User can only view their own orders
   */
  async getOrder(userId: string, orderId: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        items: true,
        address: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrderToResponse(order);
  }

  /**
   * Map Prisma order to response DTO
   */
  private mapOrderToResponse(order: any): OrderResponseDto {
    return {
      id: order.id,
      status: order.status,
      subtotal: parseFloat(order.subtotal.toString()),
      total: parseFloat(order.total.toString()),
      items: order.items.map((item: any): OrderItemResponseDto => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        basePrice: parseFloat(item.basePrice.toString()),
        materialId: item.materialId,
        materialName: item.materialName,
        materialPrice: parseFloat(item.materialPrice.toString()),
        quantity: item.quantity,
        itemPrice: parseFloat(item.itemPrice.toString()),
        lineTotal: parseFloat(item.lineTotal.toString()),
      })),
      address: {
        fullName: order.address.fullName,
        phone: order.address.phone,
        line1: order.address.line1,
        line2: order.address.line2,
        city: order.address.city,
        state: order.address.state,
        postalCode: order.address.postalCode,
        country: order.address.country,
      },
      createdAt: order.createdAt,
    };
  }

  private mapCheckoutOrderToResponse(order: any): OrderResponseDto {
    return {
      id: order.id,
      status: order.status,
      subtotal: parseFloat(order.subtotal.toString()),
      total: parseFloat(order.total.toString()),
      items: order.items.map((item: any): OrderItemResponseDto => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        basePrice: parseFloat(item.basePrice.toString()),
        materialId: item.materialId,
        materialName: item.materialName,
        materialPrice: parseFloat(item.materialPrice.toString()),
        quantity: item.quantity,
        itemPrice: parseFloat(item.itemPrice.toString()),
        lineTotal: parseFloat(item.lineTotal.toString()),
      })),
      address: {
        fullName: order.address.fullName,
        phone: order.address.phone,
        line1: order.address.line1,
        line2: order.address.line2,
        city: order.address.city,
        state: order.address.state,
        postalCode: order.address.postalCode,
        country: order.address.country,
      },
      createdAt: order.createdAt,
    };
  }
}





