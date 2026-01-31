import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminOrdersService } from './admin-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { users_role as Role, orders_status as OrderStatus } from '@prisma/client';

@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  /**
   * List all orders (Admin only, read-only)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listOrders(
    @Query('status') status?: OrderStatus,
    @Query('userId') userId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    const filters = {
      status,
      userId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
    };

    const pagination = {
      limit: limit ? parseInt(limit, 10) : 50,
      page: page ? parseInt(page, 10) : 1,
    };

    return this.adminOrdersService.listOrders(filters, pagination);
  }

  /**
   * Get single order by ID (Admin only, read-only)
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getOrderById(@Param('id') orderId: string) {
    return this.adminOrdersService.getOrderById(orderId);
  }
}

