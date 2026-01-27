import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { OrderStatus, PaymentStatus, PaymentGateway } from '@prisma/client';
import { InitiatePaymentResponseDto } from './dto/initiate-payment.response.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../platform/audit-log.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private razorpayService: RazorpayService,
    private invoicesService: InvoicesService,
    private notificationsService: NotificationsService,
    private auditLogService: AuditLogService,
  ) {}

  /**
   * Initiate payment for an order
   * CUSTOMER only
   * Idempotent - returns existing Razorpay order if already created
   */
  async initiatePayment(
    orderId: string,
    userId: string,
    ip: string,
  ): Promise<InitiatePaymentResponseDto> {
    // Fetch order by ID + userId (security check)
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Validate order status
    if (order.status !== OrderStatus.CREATED) {
      throw new BadRequestException(
        `Cannot initiate payment for order with status: ${order.status}`,
      );
    }

    // Check if payment already exists (idempotency)
    const existingPayment = await this.prisma.payment.findUnique({
      where: { orderId },
    });

    if (existingPayment && existingPayment.razorpayOrderId) {
      this.logger.log(
        `Payment already exists for order ${orderId}, returning existing Razorpay order`,
      );

      return {
        razorpayOrderId: existingPayment.razorpayOrderId,
        amount: Number(order.total) * 100, // Convert to paise
        currency: 'INR',
        key: this.razorpayService.getKeyId(),
      };
    }

    // Step 1: Create Razorpay Order (external side-effect, safe to retry)
    const razorpayOrder = await this.razorpayService.createOrder(
      orderId,
      Number(order.total),
      'INR',
    );

    // Step 2: Atomic DB mutation - Payment + Order status update
    await this.prisma.$transaction(async (tx) => {
      // Create or update Payment record
      await tx.payment.upsert({
        where: { orderId },
        create: {
          orderId,
          userId,
          amount: order.total,
          currency: 'INR',
          status: PaymentStatus.INITIATED,
          gateway: PaymentGateway.RAZORPAY,
          razorpayOrderId: razorpayOrder.razorpayOrderId,
        },
        update: {
          razorpayOrderId: razorpayOrder.razorpayOrderId,
          status: PaymentStatus.INITIATED,
        },
      });

      // Update Order status to PAYMENT_PENDING
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PAYMENT_PENDING },
      });
    });

    this.logger.log(
      `Payment initiated for order ${orderId}, Razorpay Order: ${razorpayOrder.razorpayOrderId}`,
    );

    // Phase 13: Log payment initiation
    await this.auditLogService.logPaymentInitiated(
      userId,
      orderId,
      Number(order.total),
      ip,
    );

    return {
      razorpayOrderId: razorpayOrder.razorpayOrderId,
      amount: typeof razorpayOrder.amount === 'string' 
        ? parseInt(razorpayOrder.amount, 10) 
        : razorpayOrder.amount,
      currency: 'INR',
      key: this.razorpayService.getKeyId(),
    };
  }

  /**
   * Handle Razorpay webhook events
   * Called by webhook controller after signature verification
   * MUST be idempotent - webhooks can be delivered multiple times
   */
  async handleWebhookEvent(event: string, payload: any) {
    this.logger.log(`Processing Razorpay webhook: ${event}`);

    switch (event) {
      case 'payment.authorized':
        await this.handlePaymentAuthorized(payload);
        break;

      case 'payment.captured':
        await this.handlePaymentCaptured(payload);
        break;

      case 'payment.failed':
        await this.handlePaymentFailed(payload);
        break;

      default:
        this.logger.warn(`Unhandled webhook event: ${event}`);
    }
  }

  /**
   * Handle payment.authorized event
   * Updates payment status to AUTHORIZED and stores payment ID
   */
  private async handlePaymentAuthorized(payload: any) {
    const razorpayPaymentId = payload.payment?.entity?.id;
    const razorpayOrderId = payload.payment?.entity?.order_id;

    if (!razorpayPaymentId || !razorpayOrderId) {
      this.logger.error('Missing payment ID or order ID in authorized event');
      return;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId },
    });

    if (!payment) {
      this.logger.error(
        `Payment not found for Razorpay Order: ${razorpayOrderId}`,
      );
      return;
    }

    // Idempotent update
    if (payment.status === PaymentStatus.AUTHORIZED || 
        payment.status === PaymentStatus.CAPTURED) {
      this.logger.log(
        `Payment ${payment.id} already authorized/captured, skipping`,
      );
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.AUTHORIZED,
        razorpayPaymentId,
      },
    });

    this.logger.log(
      `✅ Payment authorized for Razorpay Order: ${razorpayOrderId}`,
    );
  }

  /**
   * Handle payment.captured event
   * CRITICAL: Updates both payment status and order status atomically
   */
  private async handlePaymentCaptured(payload: any) {
    const razorpayPaymentId = payload.payment?.entity?.id;
    const razorpayOrderId = payload.payment?.entity?.order_id;

    if (!razorpayPaymentId || !razorpayOrderId) {
      this.logger.error('Missing payment ID or order ID in captured event');
      return;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId },
      include: { 
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!payment) {
      this.logger.error(
        `Payment not found for Razorpay Order: ${razorpayOrderId}`,
      );
      return;
    }

    // Idempotent check - skip if already captured
    if (payment.status === PaymentStatus.CAPTURED && 
        payment.order.status === OrderStatus.PAID) {
      this.logger.log(
        `Payment ${payment.id} already captured and order paid, skipping`,
      );
      return;
    }

    // ATOMIC transaction - update both payment and order
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CAPTURED,
          razorpayPaymentId,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAID },
      });
    });

    this.logger.log(
      `✅ Payment captured and Order ${payment.orderId} marked as PAID (Payment: ${razorpayPaymentId})`,
    );

    // Fire-and-forget: Generate invoice and send email
    // These operations must NOT affect payment/order state
    this.invoicesService.generateInvoice(payment.orderId);
    this.notificationsService.notifyPaymentSuccess({
      email: payment.order.user.email,
      orderId: payment.orderId,
      total: Number(payment.order.total),
      paymentDate: new Date(),
    });
  }

  /**
   * Handle payment.failed event
   * Updates payment and order status to FAILED
   */
  private async handlePaymentFailed(payload: any) {
    const razorpayPaymentId = payload.payment?.entity?.id;
    const razorpayOrderId = payload.payment?.entity?.order_id;

    if (!razorpayOrderId) {
      this.logger.error('Missing order ID in failed payment event');
      return;
    }

    const payment = await this.prisma.payment.findUnique({
      where: { razorpayOrderId },
      include: { order: true },
    });

    if (!payment) {
      this.logger.error(
        `Payment not found for Razorpay Order: ${razorpayOrderId}`,
      );
      return;
    }

    // Idempotent check
    if (payment.status === PaymentStatus.FAILED) {
      this.logger.log(`Payment ${payment.id} already marked as failed, skipping`);
      return;
    }

    // ATOMIC transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
          razorpayPaymentId: razorpayPaymentId || payment.razorpayPaymentId,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.PAYMENT_FAILED },
      });
    });

    this.logger.log(
      `❌ Payment failed for Razorpay Order: ${razorpayOrderId}, Order ${payment.orderId} marked as PAYMENT_FAILED`,
    );
  }

  /**
   * Get payment status by order ID
   * CUSTOMER can only see their own payments
   */
  async getPaymentByOrderId(orderId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            total: true,
            userId: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Security check - user can only access their own payments
    if (payment.order.userId !== userId) {
      throw new NotFoundException('Payment not found');
    }

    return {
      id: payment.id,
      orderId: payment.orderId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      gateway: payment.gateway,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
