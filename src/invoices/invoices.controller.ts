import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('api/v1/invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /**
   * Get invoice metadata by order ID
   * Customer can only access their own invoices
   */
  @Get('order/:orderId')
  @Roles('CUSTOMER', 'ADMIN')
  async getInvoiceByOrderId(@Param('orderId') orderId: string, @Request() req: any) {
    return this.invoicesService.getInvoiceByOrderId(orderId, req.user.userId);
  }

  /**
   * Download invoice PDF by order ID
   * Customer can only download their own invoices
   */
  @Get('order/:orderId/download')
  @Roles('CUSTOMER', 'ADMIN')
  async downloadInvoice(
    @Param('orderId') orderId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.getInvoiceByOrderId(
      orderId,
      req.user.userId,
    );
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
