import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private razorpay: Razorpay;
  private webhookSecret: string;

  constructor(private configService: ConfigService) {
    const keyId = this.configService.get<string>('razorpay.keyId');
    const keySecret = this.configService.get<string>('razorpay.keySecret');
    this.webhookSecret = this.configService.get<string>('razorpay.webhookSecret') || '';

    if (!keyId || !keySecret) {
      this.logger.warn('⚠️  Razorpay credentials not configured. Payment operations will fail until configured.');
    }

    // Initialize Razorpay even with empty credentials to prevent crashes
    // Actual operations will fail with meaningful errors if not configured
    this.razorpay = new Razorpay({
      key_id: keyId || 'not_configured',
      key_secret: keySecret || 'not_configured',
    });
  }

  /**
   * Check if Razorpay is properly configured
   */
  private isConfigured(): boolean {
    const keyId = this.configService.get<string>('razorpay.keyId');
    const keySecret = this.configService.get<string>('razorpay.keySecret');
    return !!(keyId && keySecret && keyId !== 'not_configured');
  }

  /**
   * Create Razorpay Order
   * Amount must be in paise (smallest currency unit)
   */
  async createOrder(orderId: string, amount: number, currency: string = 'INR') {
    if (!this.isConfigured()) {
      throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
    }

    try {
      // Amount is expected in paise (multiply by 100)
      const amountInPaise = Math.round(amount * 100);

      const options = {
        amount: amountInPaise,
        currency: currency,
        receipt: orderId,
        payment_capture: 0, // Manual capture (0 = manual, 1 = automatic)
      };

      const razorpayOrder = await this.razorpay.orders.create(options);

      this.logger.log(`Razorpay Order created: ${razorpayOrder.id}`);

      return {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        status: razorpayOrder.status,
      };
    } catch (error: any) {
      this.logger.error('Razorpay createOrder failed', error);
      throw new Error(`Razorpay order creation failed: ${error.message}`);
    }
  }

  /**
   * Verify Razorpay webhook signature
   * CRITICAL: This prevents malicious webhook requests
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(body)
        .digest('hex');

      const isValid = expectedSignature === signature;

      if (!isValid) {
        this.logger.warn('❌ Razorpay webhook signature verification failed');
      }

      return isValid;
    } catch (error: any) {
      this.logger.error('Razorpay webhook verification error', error);
      return false;
    }
  }

  /**
   * Get Razorpay Public Key ID (for frontend)
   */
  getKeyId(): string {
    return this.configService.get<string>('razorpay.keyId') || '';
  }

  /**
   * Fetch payment details from Razorpay
   * Useful for additional verification
   */
  async getPayment(paymentId: string) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error: any) {
      this.logger.error(`Failed to fetch payment ${paymentId}`, error);
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }

  /**
   * Fetch order details from Razorpay
   */
  async getOrder(razorpayOrderId: string) {
    try {
      const order = await this.razorpay.orders.fetch(razorpayOrderId);
      return order;
    } catch (error: any) {
      this.logger.error(`Failed to fetch order ${razorpayOrderId}`, error);
      throw new Error(`Failed to fetch order: ${error.message}`);
    }
  }
}
