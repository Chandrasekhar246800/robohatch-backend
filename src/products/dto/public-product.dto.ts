/**
 * Public Product Response DTO
 * 
 * Excludes internal fields that should not be exposed to public clients:
 * - isActive (internal visibility flag)
 * - Internal timestamps (can be exposed if needed for sorting)
 * 
 * Only includes fields necessary for product browsing.
 */
export class PublicProductDto {
  id!: string;
  name!: string;
  description?: string;
  basePrice!: number;
  createdAt!: Date;
  updatedAt!: Date;
}

