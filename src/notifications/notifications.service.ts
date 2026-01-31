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
      this.emailService
        .sendOrderCreatedEmail(data)
        .catch(() => {});
    } catch (error: any) {
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
      this.emailService
        .sendPaymentSuccessEmail(data)
        .catch(() => {});
    } catch (error: any) {
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
      this.emailService
        .sendShipmentCreatedEmail(data)
        .catch(() => {});
    } catch (error: any) {
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
      this.emailService
        .sendOrderShippedEmail(data)
        .catch(() => {});
    } catch (error: any) {
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
      this.emailService
        .sendOrderDeliveredEmail(data)
        .catch(() => {});
    } catch (error: any) {
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
      this.emailService
        .sendPasswordResetEmail(data)
        .catch(() => {});
    } catch (error: any) {
    }
  }
}

