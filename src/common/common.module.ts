import { Module, Global } from '@nestjs/common';
import { FileService } from './services/file.service';
import { StorageService } from './services/storage.service';

/**
 * CommonModule - Global utilities and services
 * 
 * Exported services:
 * - FileService: File URL generation and validation
 * - StorageService: Signed URL generation for secure file delivery (Phase 11)
 */
@Global()
@Module({
  providers: [FileService, StorageService],
  exports: [FileService, StorageService],
})
export class CommonModule {}

