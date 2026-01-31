import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

interface CustomTextRequestData {
  userId: string;
  userEmail: string;
  productId: string;
  customizationText: string;
  notes?: string;
}

@Injectable()
export class CustomTextService {
  private readonly logger = new Logger(CustomTextService.name);
  private transporter!: nodemailer.Transporter;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeTransporter();
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
      this.logger.error('Email configuration missing');
      throw new Error('Email service not configured');
    }

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  async processCustomTextRequest(data: CustomTextRequestData) {
    const { userId, userEmail, productId, customizationText, notes } = data;

    const sanitizedText = this.sanitizeInput(customizationText);
    const sanitizedNotes = notes ? this.sanitizeInput(notes) : undefined;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, isActive: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is no longer available');
    }

    try {
      await this.sendCustomTextEmail({
        userId,
        userEmail,
        productId: product.id,
        productName: product.name,
        customizationText: sanitizedText,
        notes: sanitizedNotes,
      });

      const metadata = await this.prisma.custom_text_requests.create({
        data: {
          userId,
          productId: product.id,
          customizationText: sanitizedText,
          notes: sanitizedNotes || null,
        },
      });

      return {
        message: 'Custom text request submitted successfully',
        requestId: metadata.id,
        productName: product.name,
        customizationText: sanitizedText,
        submittedAt: metadata.createdAt,
      };
    } catch (error: any) {
      this.logger.error('Failed to process custom text request', error);

      if (error.message && error.message.includes('email')) {
        throw new InternalServerErrorException(
          'Failed to send request to manufacturing team',
        );
      }

      throw new InternalServerErrorException(
        'Failed to process custom text request',
      );
    }
  }

  private sanitizeInput(input: string): string {
    return input
      .replace(/<[^>]*>/g, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  private async sendCustomTextEmail(data: {
    userId: string;
    userEmail: string;
    productId: string;
    productName: string;
    customizationText: string;
    notes?: string;
  }) {
    const {
      userId,
      userEmail,
      productId,
      productName,
      customizationText,
      notes,
    } = data;

    const adminEmail = this.configService.get<string>('email.adminEmail');

    if (!adminEmail) {
      throw new Error('ADMIN_EMAIL not configured');
    }

    const fromName = this.configService.get<string>('email.from.name');
    const fromAddress = this.configService.get<string>('email.from.address');

    const timestamp = new Date().toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .detail { margin: 12px 0; padding: 8px; background: white; border-left: 3px solid #3b82f6; }
            .label { font-weight: bold; color: #1f2937; }
            .value { color: #4b5563; }
            .customization { background-color: #dbeafe; padding: 20px; margin: 20px 0; border-radius: 5px; border: 2px solid #3b82f6; }
            .customization-text { font-size: 18px; font-weight: bold; color: #1e40af; word-break: break-word; }
            .notes { background-color: #fef3c7; padding: 15px; margin-top: 20px; border-radius: 5px; }
            .disclaimer { background-color: #fee2e2; padding: 15px; margin-top: 20px; border-radius: 5px; border-left: 4px solid #dc2626; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📝 New Custom Text Order</h1>
              <p style="margin: 5px 0;">Manufacturing Required</p>
            </div>
            <div class="content">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Customer Customization Request</h2>
              
              <div class="detail">
                <span class="label">User ID:</span>
                <span class="value">${userId}</span>
              </div>
              
              <div class="detail">
                <span class="label">User Email:</span>
                <span class="value">${userEmail}</span>
              </div>
              
              <div class="detail">
                <span class="label">Product ID:</span>
                <span class="value">${productId}</span>
              </div>

              <div class="detail">
                <span class="label">Product Name:</span>
                <span class="value">${productName}</span>
              </div>
              
              <div class="customization">
                <h3 style="margin-top: 0; color: #1e40af;">Customization Text:</h3>
                <p class="customization-text">"${customizationText}"</p>
              </div>

              <div class="detail">
                <span class="label">Request Timestamp:</span>
                <span class="value">${timestamp}</span>
              </div>

              ${
                notes
                  ? `
              <div class="notes">
                <h3 style="margin-top: 0; color: #92400e;">Additional Notes:</h3>
                <p style="margin-bottom: 0; color: #78350f;">${notes}</p>
              </div>
              `
                  : ''
              }

              <div class="disclaimer">
                <strong>⚠️ Important:</strong> Custom products are non-refundable once production starts
              </div>
            </div>
            <div class="footer">
              <p>RoboHatch Manufacturing System</p>
              <p>Please process this customization request according to manufacturing workflow.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: adminEmail,
        subject: '📝 New Custom Text Order — Manufacturing Required',
        html: emailBody,
      });

      this.logger.log(
        `Custom text request sent to admin: "${customizationText}"`,
      );
    } catch (error) {
      this.logger.error('Failed to send email to admin', error);
      throw new Error('Failed to send email to manufacturing team');
    }
  }
}
