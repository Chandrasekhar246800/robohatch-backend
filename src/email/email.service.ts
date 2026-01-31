import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter!: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  async onModuleInit() {
    await this.verifyConnection();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = this.configService.get<number>('EMAIL_PORT');
    const secure = this.configService.get<string>('EMAIL_SECURE') === 'true';
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASSWORD');

    if (!host || !user || !pass) {
      this.logger.warn('Email configuration incomplete. Email service disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  private async verifyConnection() {
    if (!this.transporter) {
      return;
    }

    try {
      await this.transporter.verify();
      this.logger.log('✅ SMTP connection verified');
    } catch (error: any) {
      this.logger.error('❌ SMTP connection failed', error.message);
    }
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.warn('Email service not configured. Skipping email.');
      return;
    }

    const from = this.configService.get<string>('EMAIL_FROM') || 
                 `"${this.configService.get<string>('EMAIL_FROM_NAME')}" <${this.configService.get<string>('EMAIL_FROM_ADDRESS')}>`;

    try {
      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      this.logger.log(`Email sent: ${options.subject} → ${options.to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${options.subject}`, error.message);
    }
  }
}
