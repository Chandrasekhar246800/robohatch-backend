/**
 * CartResponseDto - API Response for cart operations
 * 
 * CONTRACT:
 * - items: Array of cart items with calculated prices
 * - total: Sum of all line totals
 * - warnings: Optional array of messages (e.g., "Items removed due to deactivation")
 * 
 * PRICING RULES:
 * - itemPrice = product.basePrice + material.price
 * - lineTotal = itemPrice * quantity
 * - total = sum(lineTotal)
 */
export class CartResponseDto {
  items!: CartItemResponseDto[];
  total!: number;
  warnings?: string[];
}

export class CartItemResponseDto {
  id!: string;
  product!: {
    id: string;
    name: string;
    basePrice: number;
  };
  material!: {
    id: string;
    name: string;
    price: number;
  };
  quantity!: number;
  itemPrice!: number;  // basePrice + material.price
  lineTotal!: number;  // itemPrice * quantity
}

