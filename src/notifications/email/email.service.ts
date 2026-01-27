import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
    this.loadTemplates();
  }

  private initializeTransporter() {
    const emailConfig = {
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: this.configService.get<boolean>('email.secure'),
      auth: {
        user: this.configService.get<string>('email.auth.user'),
        pass: this.configService.get<string>('email.auth.pass'),
      },
    };

    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      this.logger.warn('⚠️  Email credentials not configured. Emails will be logged only.');
      return;
    }

    this.transporter = nodemailer.createTransport(emailConfig);
    this.logger.log('✅ Email transporter initialized');
  }

  private loadTemplates() {
    const templatesDir = path.join(__dirname, 'templates');
    
    // Load order-created template
    try {
      const orderCreatedPath = path.join(templatesDir, 'order-created.hbs');
      if (fs.existsSync(orderCreatedPath)) {
        const template = fs.readFileSync(orderCreatedPath, 'utf-8');
        this.templates.set('order-created', handlebars.compile(template));
      }
    } catch (error) {
      this.logger.warn('Could not load order-created template');
    }

    // Load payment-success template
    try {
      const paymentSuccessPath = path.join(templatesDir, 'payment-success.hbs');
      if (fs.existsSync(paymentSuccessPath)) {
        const template = fs.readFileSync(paymentSuccessPath, 'utf-8');
        this.templates.set('payment-success', handlebars.compile(template));
      }
    } catch (error) {
      this.logger.warn('Could not load payment-success template');
    }
  }

  /**
   * Send email asynchronously (fire-and-forget)
   * Failures are logged but do not throw exceptions
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      if (!this.transporter) {
        this.logger.log(`[EMAIL NOT SENT - No transporter] To: ${to}, Subject: ${subject}`);
        return;
      }

      const fromName = this.configService.get<string>('email.from.name');
      const fromAddress = this.configService.get<string>('email.from.address');

      await this.transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to,
        subject,
        html,
      });

      this.logger.log(`✅ Email sent to ${to}: ${subject}`);
    } catch (error: any) {
      this.logger.error(`❌ Failed to send email to ${to}: ${error.message}`);
      // DO NOT throw - fire and forget
    }
  }

  /**
   * Send order created notification
   */
  async sendOrderCreatedEmail(data: {
    email: string;
    orderId: string;
    total: number;
    orderDate: Date;
  }): Promise<void> {
    const template = this.templates.get('order-created');
    
    const html = template
      ? template({
          orderId: data.orderId,
          total: data.total.toFixed(2),
          orderDate: data.orderDate.toLocaleDateString(),
        })
      : this.getDefaultOrderCreatedHtml(data);

    await this.sendEmail(
      data.email,
      `Order Confirmation - ${data.orderId}`,
      html,
    );
  }

  /**
   * Send payment success notification
   */
  async sendPaymentSuccessEmail(data: {
    email: string;
    orderId: string;
    total: number;
    paymentDate: Date;
  }): Promise<void> {
    const template = this.templates.get('payment-success');
    
    const html = template
      ? template({
          orderId: data.orderId,
          total: data.total.toFixed(2),
          paymentDate: data.paymentDate.toLocaleDateString(),
        })
      : this.getDefaultPaymentSuccessHtml(data);

    await this.sendEmail(
      data.email,
      `Payment Successful - Order ${data.orderId}`,
      html,
    );
  }

  private getDefaultOrderCreatedHtml(data: {
    orderId: string;
    total: number;
    orderDate: Date;
  }): string {
    return `
      <h1>Order Confirmation</h1>
      <p>Thank you for your order!</p>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Total:</strong> ₹${data.total.toFixed(2)}</p>
      <p><strong>Date:</strong> ${data.orderDate.toLocaleDateString()}</p>
      <p>You will receive another email once your payment is confirmed.</p>
      <hr>
      <p>RoboHatch - 3D Printing Made Easy</p>
    `;
  }

  private getDefaultPaymentSuccessHtml(data: {
    orderId: string;
    total: number;
    paymentDate: Date;
  }): string {
    return `
      <h1>Payment Successful!</h1>
      <p>Your payment has been successfully processed.</p>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Amount Paid:</strong> ₹${data.total.toFixed(2)}</p>
      <p><strong>Payment Date:</strong> ${data.paymentDate.toLocaleDateString()}</p>
      <p>Your order is now being processed.</p>
      <hr>
      <p>RoboHatch - 3D Printing Made Easy</p>
    `;
  }

  /**
   * Send shipment created notification
   * Phase 12: Fulfillment & Shipping Management
   */
  async sendShipmentCreatedEmail(data: {
    email: string;
    orderId: string;
    courierName: string;
    trackingNumber: string;
  }): Promise<void> {
    const html = this.getDefaultShipmentCreatedHtml(data);
    await this.sendEmail(
      data.email,
      `Shipment Created - Order ${data.orderId}`,
      html,
    );
  }

  /**
   * Send order shipped notification
   * Phase 12: Fulfillment & Shipping Management
   */
  async sendOrderShippedEmail(data: {
    email: string;
    orderId: string;
    courierName: string;
    trackingNumber: string;
    shippedAt: Date;
  }): Promise<void> {
    const html = this.getDefaultOrderShippedHtml(data);
    await this.sendEmail(
      data.email,
      `Order Shipped - ${data.orderId}`,
      html,
    );
  }

  /**
   * Send order delivered notification
   * Phase 12: Fulfillment & Shipping Management
   */
  async sendOrderDeliveredEmail(data: {
    email: string;
    orderId: string;
    deliveredAt: Date;
  }): Promise<void> {
    const html = this.getDefaultOrderDeliveredHtml(data);
    await this.sendEmail(
      data.email,
      `Order Delivered - ${data.orderId}`,
      html,
    );
  }

  private getDefaultShipmentCreatedHtml(data: {
    orderId: string;
    courierName: string;
    trackingNumber: string;
  }): string {
    return `
      <h1>Shipment Created</h1>
      <p>Your order has been prepared for shipping.</p>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Courier:</strong> ${data.courierName}</p>
      <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
      <p>You will receive another email once your order is shipped.</p>
      <hr>
      <p>RoboHatch - 3D Printing Made Easy</p>
    `;
  }

  private getDefaultOrderShippedHtml(data: {
    orderId: string;
    courierName: string;
    trackingNumber: string;
    shippedAt: Date;
  }): string {
    return `
      <h1>Order Shipped!</h1>
      <p>Your order is on its way!</p>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Courier:</strong> ${data.courierName}</p>
      <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
      <p><strong>Shipped On:</strong> ${data.shippedAt.toLocaleDateString()}</p>
      <p>Track your order using the tracking number above.</p>
      <hr>
      <p>RoboHatch - 3D Printing Made Easy</p>
    `;
  }

  private getDefaultOrderDeliveredHtml(data: {
    orderId: string;
    deliveredAt: Date;
  }): string {
    return `
      <h1>Order Delivered!</h1>
      <p>Your order has been successfully delivered.</p>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Delivered On:</strong> ${data.deliveredAt.toLocaleDateString()}</p>
      <p>Thank you for choosing RoboHatch!</p>
      <p>We hope you enjoy your 3D printed products.</p>
      <hr>
      <p>RoboHatch - 3D Printing Made Easy</p>
    `;
  }

  /**
   * Send password reset email - Phase 15
   * 
   * SECURITY:
   * - Never logs the reset token
   * - Uses environment variable for frontend URL
   * - Template includes expiry warning
   * - Fire-and-forget pattern (does not throw)
   */
  async sendPasswordResetEmail(data: {
    email: string;
    resetToken: string;
    expiresAt: Date;
  }): Promise<void> {
    // Calculate expiry in minutes
    const expiryMinutes = Math.round(
      (data.expiresAt.getTime() - Date.now()) / (60 * 1000),
    );

    // Get frontend URL from environment
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${data.resetToken}`;

    // Prepare template data
    const templateData = {
      email: data.email,
      resetToken: data.resetToken,
      resetUrl,
      expiryMinutes,
      year: new Date().getFullYear(),
    };

    // Get or load template
    let template = this.templates.get('password-reset');
    if (!template) {
      try {
        const templatesDir = path.join(__dirname, 'templates');
        const templatePath = path.join(templatesDir, 'password-reset.hbs');
        if (fs.existsSync(templatePath)) {
          const templateSource = fs.readFileSync(templatePath, 'utf-8');
          template = handlebars.compile(templateSource);
          this.templates.set('password-reset', template);
        }
      } catch (error) {
        this.logger.warn('Could not load password-reset template, using default');
      }
    }

    // Render template or use default
    const html = template
      ? template(templateData)
      : this.getDefaultPasswordResetHtml(templateData);

    // Send email
    await this.sendEmail(
      data.email,
      '🔐 Reset Your Password - RoboHatch',
      html,
    );

    // Never log the token - only log success
    this.logger.log(`Password reset email sent to ${data.email}`);
  }

  private getDefaultPasswordResetHtml(data: {
    email: string;
    resetToken: string;
    resetUrl: string;
    expiryMinutes: number;
    year: number;
  }): string {
    return `
      <h1>🔐 Reset Your Password</h1>
      <p>Hello,</p>
      <p>We received a request to reset your password for your RoboHatch account associated with <strong>${data.email}</strong>.</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="${data.resetUrl}" style="display: inline-block; padding: 14px 32px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a></p>
      <p style="font-size: 12px; color: #666;">Or copy and paste this link: ${data.resetUrl}</p>
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <strong>⏰ Important:</strong> This link will expire in <strong>${data.expiryMinutes} minutes</strong> for security reasons.
      </div>
      <div style="background: #e7f3ff; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; font-size: 14px;">
        <strong>🛡️ Security Notice:</strong>
        <ul>
          <li>This link can only be used <strong>once</strong></li>
          <li>If you didn't request a password reset, please ignore this email</li>
          <li>Your password will not be changed unless you click the link above</li>
          <li>Never share this link with anyone</li>
        </ul>
      </div>
      <p style="font-size: 14px; color: #666;">
        Reset Token: <code style="background: #f8f9fa; padding: 5px 10px; border-radius: 4px;">${data.resetToken}</code>
      </p>
      <p style="font-size: 13px; color: #999;">
        If you did not request this password reset, please ignore this email or contact our support team.
      </p>
      <hr>
      <p style="font-size: 12px; color: #999;"><strong>RoboHatch</strong> - Custom 3D Printed Products<br>&copy; ${data.year} RoboHatch. All rights reserved.</p>
    `;
  }
}

