import { IsString, IsNotEmpty } from 'class-validator';

/**
 * CreateOrderDto - Request validation for order creation
 * 
 * RULES:
 * - addressId must belong to user (verified in service)
 * - NO cartId (cart fetched via userId)
 * - NO prices (calculated from cart)
 * - NO product data (fetched from cart)
 * 
 * IDEMPOTENCY:
 * - Idempotency-Key header required (handled in controller)
 */
export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  addressId!: string;
}

