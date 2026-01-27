/**
 * Public Product Model Response DTO
 * 
 * Excludes internal fields:
 * - productId (internal foreign key)
 * 
 * Only includes fields necessary for 3D model display/download.
 */
export class PublicProductModelDto {
  id!: string;
  fileName!: string;
  fileType!: string;
  fileSize!: number;
  createdAt!: Date;
}
