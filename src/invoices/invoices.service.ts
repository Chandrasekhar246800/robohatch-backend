import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);
  private readonly invoicesDir = path.join(process.cwd(), 'invoices');

  constructor(private prisma: PrismaService) {
    this.ensureInvoicesDirectory();
  }

  private ensureInvoicesDirectory() {
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
      this.logger.log(`Created invoices directory: ${this.invoicesDir}`);
    }
  }

  /**
   * Generate invoice for a paid order
   * IDEMPOTENT: Only generates if invoice doesn't exist
   * Called after payment webhook confirms PAID status
   */
  async generateInvoice(orderId: string): Promise<void> {
    try {
      // Check if invoice already exists (idempotency)
      const existingInvoice = await this.prisma.invoice.findUnique({
        where: { orderId },
      });

      if (existingInvoice) {
        this.logger.log(
          `Invoice already exists for order ${orderId}, skipping generation`,
        );
        return;
      }

      // Fetch order with all snapshot data
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          address: true,
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      if (!order) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }

      if (!order.address) {
        throw new Error(`Order ${orderId} has no address snapshot`);
      }

      // Generate invoice number (format: INV-YYYYMMDD-XXXXX)
      const invoiceNumber = await this.generateInvoiceNumber();

      // Generate PDF
      const fileName = `${invoiceNumber}.pdf`;
      const filePath = path.join(this.invoicesDir, fileName);

      await this.createPDF(order, invoiceNumber, filePath);

      // Store invoice metadata in database
      await this.prisma.invoice.create({
        data: {
          orderId,
          invoiceNumber,
          invoiceUrl: `/invoices/${fileName}`,
        },
      });

      this.logger.log(`✅ Invoice generated: ${invoiceNumber} for order ${orderId}`);
    } catch (error: any) {
      this.logger.error(
        `❌ Failed to generate invoice for order ${orderId}: ${error.message}`,
      );
      // Do not throw - invoice generation must not affect payment processing
    }
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    
    // Get count of invoices today
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const count = await this.prisma.invoice.count({
      where: {
        issuedAt: {
          gte: startOfDay,
        },
      },
    });

    const sequence = String(count + 1).padStart(5, '0');
    return `INV-${dateStr}-${sequence}`;
  }

  /**
   * Create PDF invoice from order snapshot
   * Uses ONLY snapshot data - never fetches live product/material data
   */
  private async createPDF(
    order: any,
    invoiceNumber: string,
    filePath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header
        doc
          .fontSize(20)
          .text('RoboHatch', 50, 50)
          .fontSize(10)
          .text('3D Printing Made Easy', 50, 75)
          .text('www.robohatch.com', 50, 90);

        // Invoice Title
        doc
          .fontSize(20)
          .text('INVOICE', 400, 50, { align: 'right' });

        // Invoice Details
        doc
          .fontSize(10)
          .text(`Invoice #: ${invoiceNumber}`, 400, 75, { align: 'right' })
          .text(`Date: ${new Date().toLocaleDateString()}`, 400, 90, { align: 'right' })
          .text(`Order ID: ${order.id}`, 400, 105, { align: 'right' });

        // Customer Details
        doc
          .fontSize(12)
          .text('Bill To:', 50, 150)
          .fontSize(10)
          .text(order.address.fullName, 50, 170)
          .text(order.user.email, 50, 185);

        // Shipping Address
        doc
          .fontSize(12)
          .text('Ship To:', 300, 150)
          .fontSize(10)
          .text(order.address.fullName, 300, 170)
          .text(order.address.line1, 300, 185);
        
        if (order.address.line2) {
          doc.text(order.address.line2, 300, 200);
        }
        
        doc
          .text(
            `${order.address.city}, ${order.address.state} ${order.address.postalCode}`,
            300,
            order.address.line2 ? 215 : 200,
          )
          .text(order.address.country, 300, order.address.line2 ? 230 : 215);

        // Line Items Table
        const tableTop = 280;
        doc
          .fontSize(10)
          .text('Product', 50, tableTop)
          .text('Material', 200, tableTop)
          .text('Qty', 350, tableTop, { width: 50, align: 'center' })
          .text('Price', 420, tableTop, { width: 70, align: 'right' })
          .text('Total', 500, tableTop, { width: 70, align: 'right' });

        // Draw line
        doc
          .moveTo(50, tableTop + 15)
          .lineTo(570, tableTop + 15)
          .stroke();

        // Line Items (from snapshot)
        let yPosition = tableTop + 25;
        order.items.forEach((item: any) => {
          doc
            .fontSize(9)
            .text(item.productName, 50, yPosition, { width: 140 })
            .text(item.materialName, 200, yPosition, { width: 140 })
            .text(item.quantity.toString(), 350, yPosition, { width: 50, align: 'center' })
            .text(`₹${Number(item.itemPrice).toFixed(2)}`, 420, yPosition, { width: 70, align: 'right' })
            .text(`₹${Number(item.lineTotal).toFixed(2)}`, 500, yPosition, { width: 70, align: 'right' });

          yPosition += 20;
        });

        // Totals
        yPosition += 10;
        doc
          .moveTo(50, yPosition)
          .lineTo(570, yPosition)
          .stroke();

        yPosition += 15;
        doc
          .fontSize(10)
          .text('Subtotal:', 400, yPosition)
          .text(`₹${Number(order.subtotal).toFixed(2)}`, 500, yPosition, { width: 70, align: 'right' });

        yPosition += 20;
        doc
          .fontSize(12)
          .text('Total:', 400, yPosition)
          .text(`₹${Number(order.total).toFixed(2)}`, 500, yPosition, { width: 70, align: 'right' });

        // Payment Status
        yPosition += 30;
        doc
          .fontSize(10)
          .fillColor('green')
          .text('Payment Status: PAID', 50, yPosition);

        // Footer
        doc
          .fontSize(8)
          .fillColor('black')
          .text(
            'Thank you for your business!',
            50,
            700,
            { align: 'center', width: 500 },
          );

        doc.end();

        stream.on('finish', () => {
          resolve();
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get invoice by order ID
   * Returns invoice metadata with download URL
   */
  async getInvoiceByOrderId(orderId: string, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            userId: true,
            total: true,
            createdAt: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Security check - user can only access their own invoices
    if (invoice.order.userId !== userId) {
      throw new NotFoundException('Invoice not found');
    }

    return {
      id: invoice.id,
      orderId: invoice.orderId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceUrl: invoice.invoiceUrl,
      issuedAt: invoice.issuedAt,
      total: Number(invoice.order.total),
    };
  }

  /**
   * Get invoice by order ID (Admin access - no user check)
   */
  async getInvoiceByOrderIdAdmin(orderId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            total: true,
            createdAt: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return {
      id: invoice.id,
      orderId: invoice.orderId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceUrl: invoice.invoiceUrl,
      issuedAt: invoice.issuedAt,
      total: Number(invoice.order.total),
    };
  }

  /**
   * Get invoice file path for download
   */
  getInvoiceFilePath(invoiceUrl: string): string {
    const fileName = invoiceUrl.replace('/invoices/', '');
    return path.join(this.invoicesDir, fileName);
  }
}
