import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartResponseDto, CartItemResponseDto } from './dto/cart-response.dto';

/**
 * CartService - Phase 5 Shopping Cart Management
 * 
 * CORE PRINCIPLES:
 * 1. One cart per user
 * 2. Cart is NOT an order
 * 3. Cart is always revalidated
 * 4. Prices are NEVER stored
 * 5. Inactive products/materials cannot survive
 * 6. Cart is customer-only
 * 
 * OWNERSHIP RULE:
 * - Cart is always accessed via userId from JWT
 * - Never by cartId alone
 * 
 * PRICE CALCULATION FORMULA (LOCKED):
 * - itemPrice = product.basePrice + material.price
 * - lineTotal = itemPrice * quantity
 * - cartTotal = sum(lineTotal)
 */
@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get or create cart for user
   * 
   * OWNERSHIP: Uses userId from JWT
   */
  private async getOrCreateCart(userId: string) {
    let cart = await this.prisma.carts.findFirst({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.carts.create({
        data: { userId },
      });
    }

    return cart;
  }

  /**
   * Add item to cart
   * 
   * VALIDATION FLOW:
   * 1. Get or create cart
   * 2. Validate product exists and isActive
   * 3. Validate material exists, belongs to product, and isActive
   * 4. Check if item exists:
   *    - YES → increment quantity
   *    - NO  → create new item
   * 5. Return updated cart
   */
  async addItem(userId: string, addToCartDto: AddToCartDto): Promise<CartResponseDto> {
    const { productId, materialId, quantity } = addToCartDto;

    // Get or create cart
    const cart = await this.getOrCreateCart(userId);

    // Validate product exists and is active
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is no longer available');
    }

    // Validate material exists, belongs to product, and is active
    const material = await this.prisma.material.findFirst({
      where: {
        id: materialId,
        productId: productId,
      },
    });

    if (!material) {
      throw new NotFoundException('Material not found or does not belong to this product');
    }

    if (!material.isActive) {
      throw new BadRequestException('Material is no longer available');
    }

    // Use transaction to handle duplicate items atomically
    await this.prisma.$transaction(async (tx) => {
      const existingItem = await tx.cart_items.findFirst({
        where: {
          cartId: cart.id,
          productId: productId,
          materialId: materialId,
        },
      });

      if (existingItem) {
        await tx.cart_items.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + quantity,
            updatedAt: new Date(),
          },
        });
      } else {
        await tx.cart_items.create({
          data: {
            cartId: cart.id,
            productId: productId,
            materialId: materialId,
            quantity: quantity,
          },
        });
      }
    });

    // Return updated cart with prices calculated
    return this.getCart(userId);
  }

  /**
   * Get cart with price calculation and deactivation handling
   * 
   * AT READ TIME:
   * - Revalidate each item
   * - If product/material inactive: remove item and add warning
   * - Calculate prices fresh (never trust stored values)
   * 
   * PRICING:
   * - itemPrice = product.basePrice + material.price
   * - lineTotal = itemPrice * quantity
   * - total = sum(lineTotal)
   */
  async getCart(userId: string): Promise<CartResponseDto> {
    const cart = await this.getOrCreateCart(userId);

    // Fetch all cart items with related product and material
    const cartItems = await this.prisma.cart_items.findMany({
      where: { cartId: cart.id },
      include: {
        product: true,
        material: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const warnings: string[] = [];
    const validItems: CartItemResponseDto[] = [];
    const itemsToRemove: string[] = [];

    // Validate each item and calculate prices
    for (const item of cartItems) {
      // Check if product or material is deactivated
      if (!item.product.isActive || !item.material.isActive) {
        itemsToRemove.push(item.id);
        continue;
      }

      // Calculate prices (NEVER stored in DB)
      const itemPrice = item.product.basePrice + item.material.price;
      const lineTotal = itemPrice * item.quantity;

      validItems.push({
        id: item.id,
        product: {
          id: item.product.id,
          name: item.product.name,
          basePrice: item.product.basePrice,
        },
        material: {
          id: item.material.id,
          name: item.material.name,
          price: item.material.price,
        },
        quantity: item.quantity,
        itemPrice: itemPrice,
        lineTotal: lineTotal,
      });
    }

    // Remove deactivated items in batch
    if (itemsToRemove.length > 0) {
      await this.prisma.cart_items.deleteMany({
        where: {
          id: { in: itemsToRemove },
        },
      });
      warnings.push('Some items were removed because they are no longer available');
    }

    // Calculate cart total
    const total = validItems.reduce((sum, item) => sum + item.lineTotal, 0);

    return {
      items: validItems,
      total: total,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Update cart item quantity
   * 
   * VALIDATION:
   * 1. Verify cart ownership
   * 2. Verify cart item exists
   * 3. quantity >= 1 (enforced by DTO)
   * 4. Update atomically
   */
  async updateItemQuantity(
    userId: string,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ): Promise<CartResponseDto> {
    const { quantity } = updateCartItemDto;

    // Get user's cart
    const cart = await this.getOrCreateCart(userId);

    // Verify cart item exists
    const cartItem = await this.prisma.cart_items.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Verify ownership
    if (cartItem.cart.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Update quantity atomically
    await this.prisma.cart_items.update({
      where: { id: itemId },
      data: {
        quantity: quantity,
        updatedAt: new Date(),
      },
    });

    // Return updated cart
    return this.getCart(userId);
  }

  /**
   * Remove item from cart
   * 
   * VALIDATION:
   * 1. Verify cart ownership
   * 2. Verify cart item exists
   * 3. Hard delete (removal is explicit)
   */
  async removeItem(userId: string, itemId: string): Promise<CartResponseDto> {
    // Get user's cart
    const cart = await this.getOrCreateCart(userId);

    // Verify cart item exists
    const cartItem = await this.prisma.cart_items.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    // Verify ownership
    if (cartItem.cart.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Hard delete cart item
    await this.prisma.cart_items.delete({
      where: { id: itemId },
    });

    // Return updated cart
    return this.getCart(userId);
  }
}




