import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * OrdersController - Phase 6 Order Creation
 * 
 * SECURITY:
 * - CUSTOMER only (admins cannot create orders)
 * - User ID from JWT
 * - Idempotency key from header
 * 
 * ROUTES:
 * - POST /api/v1/orders       - Create order
 * - GET  /api/v1/orders/:id   - Get order
 * 
 * OUT OF SCOPE:
 * - No payment gateway
 * - No order listing
 * - No admin order views
 * - No order cancellation
 */
@Controller('orders')
@Roles(Role.CUSTOMER) // CUSTOMER-ONLY: Admins cannot create orders
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create order from cart
   * 
   * IDEMPOTENCY:
   * - Requires Idempotency-Key header
   * - Same key + user → returns same order
   * - Different key → creates new order
   * 
   * TRANSACTION:
   * - Creates order
   * - Snapshots cart items
   * - Snapshots address
   * - Clears cart
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Req() req: RequestWithUser, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user.userId;

    // Extract Idempotency-Key from header
    const idempotencyKey = req.headers['idempotency-key'] as string;

    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    return this.ordersService.createOrder(userId, idempotencyKey, createOrderDto);
  }

  /**
   * Get order by ID
   * 
   * OWNERSHIP:
   * - User can only view their own orders
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOrder(@Req() req: RequestWithUser, @Param('id') orderId: string) {
    const userId = req.user.userId;
    return this.ordersService.getOrder(userId, orderId);
  }
}
