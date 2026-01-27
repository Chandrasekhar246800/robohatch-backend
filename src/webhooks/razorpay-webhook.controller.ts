import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { RazorpayService } from '../payments/razorpay.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('webhooks/razorpay')
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly razorpayService: RazorpayService,
  ) {}

  /**
   * POST /webhooks/razorpay
   * Handle Razorpay webhook events
   * PUBLIC endpoint (no JWT required)
   * CRITICAL: Signature verification is MANDATORY
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: any,
    @Req() req: RawBodyRequest<Request>,
  ) {
    this.logger.log('Razorpay webhook received');

    if (!signature) {
      this.logger.error('❌ Razorpay webhook signature missing');
      throw new BadRequestException('Signature required');
    }

    // Get raw body for signature verification
    // NestJS should be configured to provide rawBody for this route
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(body);

    // CRITICAL: Verify webhook signature
    const isValid = this.razorpayService.verifyWebhookSignature(
      rawBody,
      signature,
    );

    if (!isValid) {
      this.logger.error('❌ Razorpay webhook signature verification FAILED');
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log('✅ Razorpay webhook signature verified');

    // Extract event type
    const event = body.event;

    if (!event) {
      this.logger.error('❌ Missing event type in webhook payload');
      throw new BadRequestException('Invalid webhook payload');
    }

    // Process webhook event (idempotent)
    try {
      await this.paymentsService.handleWebhookEvent(event, body);
      this.logger.log(`✅ Razorpay webhook processed successfully: ${event}`);
      return { received: true };
    } catch (error: any) {
      this.logger.error(`❌ Razorpay webhook processing failed: ${error.message}`);
      // Return 200 anyway to prevent Razorpay retries for application errors
      // Only signature verification failures should return 4xx
      return { received: false, error: error.message };
    }
  }
}
