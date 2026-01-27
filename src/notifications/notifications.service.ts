import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from './email/email.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private emailService: EmailService) {}

  /**
   * Send order created notification (fire-and-forget)
   * Called after order is successfully created
   */
  async notifyOrderCreated(data: {
    email: string;
    orderId: string;
    total: number;
    orderDate: Date;
  }): Promise<void> {
    try {
      // Fire-and-forget - do not await
      this.emailService
        .sendOrderCreatedEmail(data)
        .catch((error) => {
          this.logger.error(
            `Failed to send order created email for ${data.orderId}: ${error.message}`,
          );
        });

      this.logger.log(`Order created notification queued for ${data.orderId}`);
    } catch (error: any) {
      this.logger.error(
        `Error queueing order created notification: ${error.message}`,
      );
      // Do not throw - notifications must not affect business logic
    }
  }

  /**
   * Send payment success notification (fire-and-forget)
   * Called after payment webhook confirms PAID status
   */
  async notifyPaymentSuccess(data: {
    email: string;
    orderId: string;
    total: number;
    paymentDate: Date;
  }): Promise<void> {
    try {
      // Fire-and-forget - do not await
      this.emailService
        .sendPaymentSuccessEmail(data)
        .catch((error) => {
          this.logger.error(
            `Failed to send payment success email for ${data.orderId}: ${error.message}`,
          );
        });

      this.logger.log(`Payment success notification queued for ${data.orderId}`);
    } catch (error: any) {
      this.logger.error(
        `Error queueing payment success notification: ${error.message}`,
      );
      // Do not throw - notifications must not affect business logic
    }
  }

  /**
   * Send shipment created notification (fire-and-forget)
   * Called after admin creates shipment
   * Phase 12: Fulfillment & Shipping Management
   */
  async notifyShipmentCreated(data: {
    email: string;
    orderId: string;
    courierName: string;
    trackingNumber: string;
  }): Promise<void> {
    try {
      // Fire-and-forget - do not await
      this.emailService
        .sendShipmentCreatedEmail(data)
        .catch((error) => {
          this.logger.error(
            `Failed to send shipment created email for ${data.orderId}: ${error.message}`,
          );
        });

      this.logger.log(`Shipment created notification queued for ${data.orderId}`);
    } catch (error: any) {
      this.logger.error(
        `Error queueing shipment created notification: ${error.message}`,
      );
      // Do not throw - notifications must not affect business logic
    }
  }

  /**
   * Send order shipped notification (fire-and-forget)
   * Called when shipment status changes to SHIPPED
   * Phase 12: Fulfillment & Shipping Management
   */
  async notifyOrderShipped(data: {
    email: string;
    orderId: string;
    courierName: string;
    trackingNumber: string;
    shippedAt: Date;
  }): Promise<void> {
    try {
      // Fire-and-forget - do not await
      this.emailService
        .sendOrderShippedEmail(data)
        .catch((error) => {
          this.logger.error(
            `Failed to send order shipped email for ${data.orderId}: ${error.message}`,
          );
        });

      this.logger.log(`Order shipped notification queued for ${data.orderId}`);
    } catch (error: any) {
      this.logger.error(
        `Error queueing order shipped notification: ${error.message}`,
      );
      // Do not throw - notifications must not affect business logic
    }
  }

  /**
   * Send order delivered notification (fire-and-forget)
   * Called when shipment status changes to DELIVERED
   * Phase 12: Fulfillment & Shipping Management
   */
  async notifyOrderDelivered(data: {
    email: string;
    orderId: string;
    deliveredAt: Date;
  }): Promise<void> {
    try {
      // Fire-and-forget - do not await
      this.emailService
        .sendOrderDeliveredEmail(data)
        .catch((error) => {
          this.logger.error(
            `Failed to send order delivered email for ${data.orderId}: ${error.message}`,
          );
        });

      this.logger.log(`Order delivered notification queued for ${data.orderId}`);
    } catch (error: any) {
      this.logger.error(
        `Error queueing order delivered notification: ${error.message}`,
      );
      // Do not throw - notifications must not affect business logic
    }
  }

  /**
   * Send password reset notification (fire-and-forget) - Phase 15
   * Called after forgot password request is processed
   * 
   * SECURITY:
   * - Never logs the reset token
   * - Fire-and-forget to prevent timing attacks
   * - Does not throw errors (silent fail)
   */
  async notifyPasswordReset(data: {
    email: string;
    resetToken: string;
    expiresAt: Date;
  }): Promise<void> {
    try {
      // Fire-and-forget - do not await
      this.emailService
        .sendPasswordResetEmail(data)
        .catch((error) => {
          // Never log the token - only log generic error
          this.logger.error(
            `Failed to send password reset email to ${data.email}: ${error.message}`,
          );
        });

      // Never log the token - only log that email was queued
      this.logger.log(`Password reset notification queued for ${data.email}`);
    } catch (error: any) {
      this.logger.error(
        `Error queueing password reset notification: ${error.message}`,
      );
      // Do not throw - notifications must not affect business logic
    }
  }
}

