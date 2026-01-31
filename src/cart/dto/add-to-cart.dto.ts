import { IsString, IsInt, Min, IsNotEmpty } from 'class-validator';

/**
 * AddToCartDto - Request validation for adding items to cart
 * 
 * RULES:
 * - productId and materialId are required
 * - quantity must be >= 1 (default: 1)
 * - quantity = 0 is rejected
 */
export class AddToCartDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  materialId!: string;

  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number = 1;
}

