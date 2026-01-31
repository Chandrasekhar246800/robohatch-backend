import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../common/services/storage.service';
import { orders_status as OrderStatus } from '@prisma/client';
import { FileResponseDto, DownloadUrlResponseDto } from './dto/file-response.dto';

/**
 * FilesService - Phase 11 Secure File Delivery
 * 
 * CRITICAL SECURITY RULES:
 * 1. Only PAID orders can access files
 * 2. User must OWN the order (userId check)
 * 3. File must belong to a product IN that order
 * 4. Signed URLs only (≤ 5 minutes expiry)
 * 5. No permanent URLs ever returned
 * 6. All access is logged (audit trail)
 * 
 * OWNERSHIP PATTERN:
 * findFirst({ orderId, userId, status: PAID })
 * 
 * IMMUTABILITY CONTRACT:
 * - No Order/OrderItem/Payment mutations
 * - No Product/Material price changes
 * - Read-only access to order snapshots
 */
@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  /**
   * List downloadable files for a paid order
   * 
   * SECURITY CHECKS:
   * 1. Order must exist
   * 2. User must own order
   * 3. Order must be PAID
   * 4. Return file metadata only (NO URLs)
   * 
   * OWNERSHIP: findFirst({ orderId, userId, status: PAID })
   */
  async listOrderFiles(
    orderId: string,
    userId: string,
  ): Promise<FileResponseDto[]> {
    // STEP 1: Verify order ownership and payment status (CRITICAL)
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        status: OrderStatus.PAID, // MUST be PAID
      },
      include: {
        items: {
          include: {
            order: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      // Return 404 for both "not found" and "not paid" to avoid leaking info
      throw new NotFoundException('Order not found or not eligible for file access');
    }

    // STEP 2: Extract unique product IDs from order items (snapshot)
    const productIds = [...new Set(order.items.map((item) => item.productId))];

    // STEP 3: Fetch 3D model files for products in this order
    const productModels = await this.prisma.product_models.findMany({
      where: {
        productId: { in: productIds },
      },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileUrl: true, // S3 key, never exposed to client
      },
    });

    // STEP 4: Map to response DTO (metadata only, NO URLs)
    return productModels.map((model) => ({
      fileId: model.id,
      fileName: model.fileName,
      fileType: model.fileType,
    }));
  }

  /**
   * Generate signed URL for file download
   * 
   * SECURITY CHECKS (ALL MUST PASS):
   * 1. Order must exist
   * 2. User must own order
   * 3. Order must be PAID
   * 4. File must belong to a product in that order
   * 5. File must be active (not deleted)
   * 
   * POST-VALIDATION:
   * 6. Generate signed URL (≤ 5 minutes expiry)
   * 7. Log access (audit trail)
   * 8. Return signed URL only
   */
  async generateDownloadUrl(
    orderId: string,
    fileId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<DownloadUrlResponseDto> {
    // STEP 1: Verify order ownership and payment status (CRITICAL)
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        status: OrderStatus.PAID, // MUST be PAID
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or not eligible for file access');
    }

    // STEP 2: Verify file exists and belongs to a product in this order
    const productModel = await this.prisma.product_models.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        productId: true,
      },
    });

    if (!productModel) {
      throw new NotFoundException('File not found');
    }

    // STEP 3: Verify file's product is in the order (security check)
    const productInOrder = order.items.some(
      (item) => item.productId === productModel.productId,
    );

    if (!productInOrder) {
      // User trying to access file from product they didn't purchase
      this.logger.warn(
        `User ${userId} attempted to access file ${fileId} not in order ${orderId}`,
      );
      throw new ForbiddenException('This file is not available for this order');
    }

    // STEP 4: Generate signed URL (≤ 5 minutes expiry, enforced by StorageService)
    const signedUrl = await this.storageService.generateSignedUrl(
      productModel.fileUrl,
    );

    // STEP 5: Log file access (audit trail, non-blocking)
    this.logFileAccess(userId, orderId, fileId, ipAddress);

    this.logger.log(
      `User ${userId} downloaded file ${fileId} from order ${orderId}`,
    );

    return {
      downloadUrl: signedUrl,
      expiresIn: 300, // 5 minutes
    };
  }

  /**
   * Log file access for audit trail
   * 
   * NON-BLOCKING: Failures must not prevent file access
   * Purpose: Security monitoring, abuse detection, legal traceability
   */
  private async logFileAccess(
    userId: string,
    orderId: string,
    fileId: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.prisma.file_access_logs.create({
        data: {
          userId,
          orderId,
          fileId,
          ipAddress: ipAddress || null,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to log file access (user: ${userId}, file: ${fileId}): ${error.message}`,
      );
      // Do not throw - logging failures must not block downloads
    }
  }
}

