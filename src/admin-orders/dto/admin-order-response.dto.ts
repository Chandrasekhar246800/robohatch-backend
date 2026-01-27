import { OrderStatus, PaymentStatus } from '@prisma/client';

export class AdminOrderItemDto {
  productName!: string;
  materialName!: string;
  quantity!: number;
  itemPrice!: string;
  lineTotal!: string;
}

export class AdminOrderAddressDto {
  fullName!: string;
  line1!: string;
  line2?: string;
  city!: string;
  state!: string;
  postalCode!: string;
  country!: string;
}

export class AdminOrderResponseDto {
  id!: string;
  status!: OrderStatus;

  subtotal!: string;
  total!: string;

  userId!: string;
  userEmail!: string;

  paymentStatus?: PaymentStatus;
  paymentProvider?: string;

  createdAt!: Date;
  updatedAt!: Date;

  items!: AdminOrderItemDto[];
  address?: AdminOrderAddressDto;
}
