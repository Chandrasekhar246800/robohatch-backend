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
    if (!signature) {
      throw new BadRequestException('Signature required');
    }

    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(body);

    const isValid = this.razorpayService.verifyWebhookSignature(
      rawBody,
      signature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = body.event;

    if (!event) {
      throw new BadRequestException('Invalid webhook payload');
    }

    try {
      await this.paymentsService.handleWebhookEvent(event, body);
      return { received: true };
    } catch (error: any) {
      return { received: false, error: error.message };
    }
  }
}

