import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

/**
 * FilesModule - Phase 11 Secure File Delivery
 * 
 * DEPENDENCIES:
 * - PrismaModule: Order ownership verification
 * - CommonModule: StorageService for signed URLs
 * 
 * EXPORTS:
 * - FilesService: Available for future admin/reporting needs
 * 
 * SECURITY:
 * - Controller enforces CUSTOMER role only
 * - Service validates PAID orders and ownership
 * - StorageService generates time-limited signed URLs
 */
@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}

