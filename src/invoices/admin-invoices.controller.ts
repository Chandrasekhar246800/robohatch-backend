import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('api/v1/admin/invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminInvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /**
   * Get invoice metadata by order ID (Admin - all invoices)
   */
  @Get('order/:orderId')
  async getInvoiceByOrderId(@Param('orderId') orderId: string) {
    return this.invoicesService.getInvoiceByOrderIdAdmin(orderId);
  }

  /**
   * Download invoice PDF by order ID (Admin - all invoices)
   */
  @Get('order/:orderId/download')
  async downloadInvoice(
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.getInvoiceByOrderIdAdmin(orderId);
    const filePath = this.invoicesService.getInvoiceFilePath(invoice.invoiceUrl);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Invoice file not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
}
