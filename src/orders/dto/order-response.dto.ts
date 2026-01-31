import { orders_status as OrderStatus } from '@prisma/client';

/**
 * OrderResponseDto - API Response for order operations
 * 
 * CONTRACT:
 * - id: Order ID
 * - status: Current order status
 * - subtotal: Sum of all line totals
 * - total: Final order total (subtotal for now, taxes/shipping later)
 * - items: Array of order items (immutable snapshots)
 * - address: Order address snapshot
 * - createdAt: Order creation timestamp
 * 
 * IMMUTABILITY:
 * - All prices are snapshots from creation time
 * - Never recalculated after creation
 */
export class OrderResponseDto {
  id!: string;
  status!: OrderStatus;
  subtotal!: number;
  total!: number;
  items!: OrderItemResponseDto[];
  address!: OrderAddressResponseDto;
  createdAt!: Date;
}

export class OrderItemResponseDto {
  id!: string;
  productId!: string;
  productName!: string;
  basePrice!: number;
  materialId!: string;
  materialName!: string;
  materialPrice!: number;
  quantity!: number;
  itemPrice!: number;  // basePrice + materialPrice (snapshot)
  lineTotal!: number;  // itemPrice * quantity (snapshot)
}

export class OrderAddressResponseDto {
  fullName!: string;
  phone!: string;
  line1!: string;
  line2?: string;
  city!: string;
  state!: string;
  postalCode!: string;
  country!: string;
}

