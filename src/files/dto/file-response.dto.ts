/**
 * FileResponseDto - Phase 11 File Metadata Response
 * 
 * SECURITY RULE: NEVER include storage URLs or permanent links
 * Only metadata is exposed here - download URLs are separate
 */
export class FileResponseDto {
  fileId!: string;
  fileName!: string;
  fileType!: string;
}

/**
 * DownloadUrlResponseDto - Signed URL Response
 * 
 * SECURITY:
 * - URL expires in ≤ 5 minutes
 * - Single-use recommended
 * - No permanent access
 */
export class DownloadUrlResponseDto {
  downloadUrl!: string;
  expiresIn?: number; // Optional: seconds until expiry
}
