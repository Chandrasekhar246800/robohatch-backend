import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import {
  AdminOrderResponseDto,
  AdminOrderItemDto,
  AdminOrderAddressDto,
} from './dto/admin-order-response.dto';

interface OrderFilters {
  status?: OrderStatus;
  userId?: string;
  fromDate?: Date;
  toDate?: Date;
}

interface PaginationOptions {
  limit?: number;
  page?: number;
}

@Injectable()
export class AdminOrdersService {
  constructor(private prisma: PrismaService) {}

  /**
   * List all orders with filters (Admin read-only)
   */
  async listOrders(
    filters: OrderFilters = {},
    pagination: PaginationOptions = {},
  ): Promise<{ orders: AdminOrderResponseDto[]; total: number }> {
    const { status, userId, fromDate, toDate } = filters;
    const { limit = 50, page = 1 } = pagination;

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch orders (READ-ONLY)
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          address: true,
          payment: true,
          user: {
            select: { email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.order.count({ where }),
    ]);

    // Map to DTO (no mutations, pure transformation)
    return {
      orders: orders.map((order) => this.mapToAdminOrderDto(order)),
      total,
    };
  }

  /**
   * Get single order by ID (Admin read-only)
   */
  async getOrderById(orderId: string): Promise<AdminOrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        address: true,
        payment: true,
        user: {
          select: { email: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return this.mapToAdminOrderDto(order);
  }

  /**
   * Map Prisma order to admin DTO (read-only transformation)
   * NO MUTATIONS - pure data mapping
   */
  private mapToAdminOrderDto(order: any): AdminOrderResponseDto {
    return {
      id: order.id,
      status: order.status,
      subtotal: order.subtotal.toString(),
      total: order.total.toString(),
      userId: order.userId,
      userEmail: order.user.email,
      paymentStatus: order.payment?.status,
      paymentProvider: order.payment?.gateway,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item: any): AdminOrderItemDto => ({
        productName: item.productName,
        materialName: item.materialName,
        quantity: item.quantity,
        itemPrice: item.itemPrice.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
      address: order.address
        ? {
            fullName: order.address.fullName,
            line1: order.address.line1,
            line2: order.address.line2,
            city: order.address.city,
            state: order.address.state,
            postalCode: order.address.postalCode,
            country: order.address.country,
          }
        : undefined,
    };
  }
}
