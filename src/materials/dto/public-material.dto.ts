/**
 * Public Material Response DTO
 * 
 * Excludes internal fields:
 * - isActive (internal visibility flag)
 * - productId (internal foreign key)
 * 
 * Only includes fields necessary for material selection.
 */
export class PublicMaterialDto {
  id!: string;
  name!: string;
  price!: number;
}
