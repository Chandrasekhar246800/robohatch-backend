import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * StorageService - Phase 11 Secure File Delivery
 * 
 * CRITICAL PRINCIPLES:
 * 1. NEVER return permanent URLs
 * 2. Signed URLs expire in ≤ 5 minutes
 * 3. GET-only permissions
 * 4. Single object access (no wildcards)
 * 5. No public bucket exposure
 * 
 * SECURITY CONTRACT:
 * - Expiry enforced at AWS level
 * - Leaked URLs become invalid automatically
 * - No permanent file access possible
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly signedUrlExpiry: number;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('storage.aws.region');
    const accessKeyId = this.configService.get<string>('storage.aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>('storage.aws.secretAccessKey');
    this.bucket = this.configService.get<string>('storage.aws.bucket') || '';
    this.signedUrlExpiry = this.configService.get<number>('storage.signedUrlExpiry') || 300;

    if (!accessKeyId || !secretAccessKey || !this.bucket) {
      this.logger.warn('⚠️  AWS S3 credentials not configured. File downloads will fail.');
    }

    this.s3Client = new S3Client({
      region: region || 'us-east-1',
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });

    this.logger.log(`StorageService initialized (bucket: ${this.bucket}, expiry: ${this.signedUrlExpiry}s)`);
  }

  /**
   * Generate signed URL for file download
   * 
   * SECURITY:
   * - Expires in ≤ 300 seconds (5 minutes)
   * - GET-only operation
   * - Single object access
   * - No wildcard permissions
   * 
   * @param fileKey - S3 object key (e.g., "models/dragon.stl")
   * @returns Signed URL valid for configured expiry time
   */
  async generateSignedUrl(fileKey: string): Promise<string> {
    try {
      // Enforce maximum expiry of 5 minutes
      const expirySeconds = Math.min(this.signedUrlExpiry, 300);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expirySeconds,
      });

      this.logger.log(`Generated signed URL for ${fileKey} (expires in ${expirySeconds}s)`);
      return signedUrl;
    } catch (error: any) {
      this.logger.error(`Failed to generate signed URL for ${fileKey}: ${error.message}`);
      throw new Error(`Failed to generate download link: ${error.message}`);
    }
  }

  /**
   * Check if file exists in S3 (optional validation)
   * Not strictly required but useful for better error messages
   */
  async fileExists(fileKey: string): Promise<boolean> {
    try {
      // HeadObject would be used here in production
      // For now, we assume file exists if storage URL is configured
      return true;
    } catch (error: any) {
      this.logger.error(`File existence check failed for ${fileKey}: ${error.message}`);
      return false;
    }
  }
}

