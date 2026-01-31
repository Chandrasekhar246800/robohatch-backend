import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * FileService - Centralized file URL management
 * 
 * CRITICAL CONTRACT:
 * - This is the ONLY source of truth for file URLs
 * - Never accept arbitrary URLs from clients
 * - All file uploads must go through pre-signed URL flow
 * 
 * PHASE 5 INTEGRATION:
 * - Add S3/Cloudflare R2 SDK
 * - Implement generatePreSignedUploadUrl()
 * - Add bucket/prefix configuration
 */
@Injectable()
export class FileService {
  // Whitelisted storage configuration
  private readonly ALLOWED_BUCKET_PREFIX = 'https://storage.robohatch.com';
  private readonly ALLOWED_PROTOCOLS = ['https'];
  private readonly MAX_FILE_SIZE_MB = 500;

  constructor(private configService: ConfigService) {}

  /**
   * Generates the canonical storage path for a product model file
   * 
   * Format: https://storage.robohatch.com/products/{productId}/models/{filename}
   * 
   * @param productId - UUID of the product
   * @param filename - Original filename (will be sanitized)
   * @returns Canonical file URL
   */
  generateProductModelPath(productId: string, filename: string): string {
    const sanitizedFilename = this.sanitizeFilename(filename);
    return `${this.ALLOWED_BUCKET_PREFIX}/products/${productId}/models/${sanitizedFilename}`;
  }

  /**
   * Validates that a file URL is from our trusted storage
   * 
   * SECURITY: Prevents arbitrary URL injection
   * 
   * @param fileUrl - URL to validate
   * @throws BadRequestException if URL is not from trusted source
   */
  validateFileUrl(fileUrl: string): void {
    try {
      const url = new URL(fileUrl);

      // Check protocol
      if (!this.ALLOWED_PROTOCOLS.includes(url.protocol.replace(':', ''))) {
        throw new BadRequestException('Invalid file URL protocol. Only HTTPS allowed.');
      }

      // Check domain/bucket
      if (!fileUrl.startsWith(this.ALLOWED_BUCKET_PREFIX)) {
        throw new BadRequestException(
          `File URL must be from trusted storage: ${this.ALLOWED_BUCKET_PREFIX}`
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid file URL format');
    }
  }

  /**
   * Validates file extension against allowed types
   * 
   * @param filename - Name of the file
   * @param allowedExtensions - Array of allowed extensions (e.g., ['stl', 'obj'])
   * @throws BadRequestException if extension not allowed
   */
  validateFileExtension(filename: string, allowedExtensions: string[]): void {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${allowedExtensions.join(', ')}`
      );
    }
  }

  /**
   * Validates file size
   * 
   * @param sizeInBytes - File size in bytes
   * @throws BadRequestException if size exceeds limit
   */
  validateFileSize(sizeInBytes: number): void {
    const maxBytes = this.MAX_FILE_SIZE_MB * 1024 * 1024;
    
    if (sizeInBytes > maxBytes) {
      throw new BadRequestException(
        `File size exceeds maximum of ${this.MAX_FILE_SIZE_MB}MB`
      );
    }

    if (sizeInBytes <= 0) {
      throw new BadRequestException('Invalid file size');
    }
  }

  /**
   * Sanitizes filename to prevent path traversal and special characters
   * 
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  private sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    let sanitized = filename.replace(/\.\./g, '');
    
    // Remove special characters except dots, dashes, underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Limit length
    if (sanitized.length > 255) {
      const extension = sanitized.split('.').pop();
      const nameWithoutExt = sanitized.substring(0, 255 - (extension?.length || 0) - 1);
      sanitized = `${nameWithoutExt}.${extension}`;
    }
    
    return sanitized;
  }

  /**
   * TODO: Phase 5 - Implement pre-signed upload URL generation
   * 
   * async generatePreSignedUploadUrl(
   *   productId: string,
   *   filename: string,
   *   contentType: string
   * ): Promise<{ uploadUrl: string; fileUrl: string }> {
   *   // Generate S3/R2 pre-signed URL
   *   // Return both upload URL (temporary) and final file URL (permanent)
   * }
   */
}

