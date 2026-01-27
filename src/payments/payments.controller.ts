import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: Role;
  };
}

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payments/initiate/:orderId
   * Initiate Razorpay payment for an order
   * CUSTOMER only
   * Phase 13: Rate limited to 3 requests/minute
   */
  @Post('initiate/:orderId')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // Phase 13: 3 requests/minute
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  async initiatePayment(
    @Param('orderId') orderId: string,
    @Req() req: RequestWithUser,
    @Ip() ip: string,
  ) {
    return this.paymentsService.initiatePayment(orderId, req.user.userId, ip);
  }

  /**
   * GET /payments/:orderId
   * Get payment status by order ID
   * CUSTOMER only (can only see their own payments)
   */
  @Get(':orderId')
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  async getPaymentByOrderId(
    @Param('orderId') orderId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.paymentsService.getPaymentByOrderId(orderId, req.user.userId);
  }
}
