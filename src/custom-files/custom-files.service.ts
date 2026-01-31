import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

interface FileUploadData {
  file: Express.Multer.File;
  userId: string;
  userEmail: string;
  productId: string;
  notes?: string;
}

@Injectable()
export class CustomFilesService {
  private readonly logger = new Logger(CustomFilesService.name);
  private transporter: nodemailer.Transporter;

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

  async processFileUpload(data: FileUploadData) {
    const { file, userId, userEmail, productId, notes } = data;

    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

    try {
      await this.sendFileToAdmin({
        file,
        userId,
        userEmail,
        productId,
        notes,
        fileSizeMB,
      });

      const metadata = await this.prisma.custom_file_requests.create({
        data: {
          userId,
          productId,
          filename: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          notes: notes || null,
        },
      });

      return {
        message: 'File uploaded and sent to manufacturing team',
        requestId: metadata.id,
        filename: metadata.filename,
        fileSize: `${fileSizeMB} MB`,
        uploadedAt: metadata.createdAt,
      };
    } catch (error) {
      this.logger.error('Failed to process file upload', error);

      if (error.message && error.message.includes('email')) {
        throw new InternalServerErrorException(
          'Failed to send file to manufacturing team',
        );
      }

      throw new InternalServerErrorException(
        'Failed to process file upload',
      );
    }
  }

  private async sendFileToAdmin(data: {
    file: Express.Multer.File;
    userId: string;
    userEmail: string;
    productId: string;
    notes?: string;
    fileSizeMB: string;
  }) {
    const { file, userId, userEmail, productId, notes, fileSizeMB } = data;

    const adminEmail = this.configService.get<string>('email.adminEmail');

    if (!adminEmail) {
      throw new Error('ADMIN_EMAIL not configured');
    }

    const fromName = this.configService.get<string>('email.from.name');
    const fromAddress = this.configService.get<string>('email.from.address');

    const uploadTimestamp = new Date().toLocaleString('en-IN', {
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
            .notes { background-color: #fef3c7; padding: 15px; margin-top: 20px; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📦 New Custom File Upload</h1>
              <p style="margin: 5px 0;">Order Intake</p>
            </div>
            <div class="content">
              <h2 style="color: #1f2937; margin-bottom: 20px;">Customer File Details</h2>
              
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
                <span class="label">Original Filename:</span>
                <span class="value">${file.originalname}</span>
              </div>
              
              <div class="detail">
                <span class="label">File Size:</span>
                <span class="value">${fileSizeMB} MB</span>
              </div>
              
              <div class="detail">
                <span class="label">Upload Timestamp:</span>
                <span class="value">${uploadTimestamp}</span>
              </div>

              ${
                notes
                  ? `
              <div class="notes">
                <h3 style="margin-top: 0; color: #92400e;">Customer Notes:</h3>
                <p style="margin-bottom: 0; color: #78350f;">${notes}</p>
              </div>
              `
                  : ''
              }
            </div>
            <div class="footer">
              <p>RoboHatch Manufacturing System</p>
              <p>This file is attached to this email. Please process according to manufacturing workflow.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: adminEmail,
        subject: '📦 New Custom File Upload — Order Intake',
        html: emailBody,
        attachments: [
          {
            filename: file.originalname,
            content: file.buffer,
            contentType: file.mimetype,
          },
        ],
      });

      this.logger.log(
        `Custom file sent to admin: ${file.originalname} (${fileSizeMB} MB)`,
      );
    } catch (error) {
      this.logger.error('Failed to send email to admin', error);
      throw new Error('Failed to send email to manufacturing team');
    }
  }
}
