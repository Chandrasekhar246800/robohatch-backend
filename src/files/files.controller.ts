import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Request } from 'express';
import { FileResponseDto, DownloadUrlResponseDto } from './dto/file-response.dto';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    email: string;
    role: Role;
  };
}

/**
 * FilesController - Phase 11 Secure File Delivery
 * 
 * SECURITY ENFORCEMENT:
 * - CUSTOMER role ONLY (admins cannot download)
 * - JWT authentication required
 * - Ownership verified by service layer
 * - All endpoints require PAID orders
 * 
 * ENDPOINTS:
 * 1. GET /api/v1/orders/:orderId/files
 *    → List downloadable files (metadata only, NO URLs)
 * 
 * 2. GET /api/v1/orders/:orderId/files/:fileId/download
 *    → Get signed URL (expires in ≤ 5 minutes)
 * 
 * PHASE BOUNDARIES:
 * - No Order/Payment mutations
 * - No Product/Material price changes
 * - Read-only access to order snapshots
 * - File metadata from ProductModel (Phase 4)
 */
@Controller('orders/:orderId/files')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER) // CUSTOMER-ONLY: Admins cannot download files
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * List downloadable files for a paid order
   * 
   * GET /api/v1/orders/:orderId/files
   * 
   * SECURITY:
   * - CUSTOMER role required
   * - Order must be PAID
   * - User must own order
   * - Returns metadata only (NO URLs)
   * 
   * RESPONSE:
   * [
   *   {
   *     "fileId": "uuid",
   *     "fileName": "dragon.stl",
   *     "fileType": "STL"
   *   }
   * ]
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async listOrderFiles(
    @Param('orderId') orderId: string,
    @Req() req: RequestWithUser,
  ): Promise<FileResponseDto[]> {
    const userId = req.user.sub;
    return this.filesService.listOrderFiles(orderId, userId);
  }

  /**
   * Generate signed URL for file download
   * 
   * GET /api/v1/orders/:orderId/files/:fileId/download
   * 
   * SECURITY (ALL CHECKS ENFORCED):
   * 1. CUSTOMER role required
   * 2. Order must be PAID
   * 3. User must own order
   * 4. File must belong to product in order
   * 5. URL expires in ≤ 5 minutes
   * 6. Access is logged (audit trail)
   * 
   * RESPONSE:
   * {
   *   "downloadUrl": "https://signed-url-valid-for-300-seconds",
   *   "expiresIn": 300
   * }
   * 
   * FAILURE CASES:
   * - 404: Order not found / not paid / file not in order
   * - 403: File not available for this order
   * - 500: Signed URL generation failed
   */
  @Get(':fileId/download')
  @HttpCode(HttpStatus.OK)
  async downloadFile(
    @Param('orderId') orderId: string,
    @Param('fileId') fileId: string,
    @Req() req: RequestWithUser,
  ): Promise<DownloadUrlResponseDto> {
    const userId = req.user.sub;
    const ipAddress = req.ip || req.socket.remoteAddress;

    return this.filesService.generateDownloadUrl(
      orderId,
      fileId,
      userId,
      ipAddress,
    );
  }
}
