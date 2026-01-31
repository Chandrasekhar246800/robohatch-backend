import { IsInt, Min } from 'class-validator';

/**
 * UpdateCartItemDto - Request validation for updating cart item quantity
 * 
 * RULES:
 * - quantity must be >= 1 only
 * - quantity = 0 is rejected (use DELETE endpoint to remove)
 */
export class UpdateCartItemDto {
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1. Use DELETE to remove items.' })
  quantity!: number;
}

