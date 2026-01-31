import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { users_role as Role } from '@prisma/client';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * CartController - Phase 5 Shopping Cart API
 * 
 * SECURITY:
 * - All routes require CUSTOMER role
 * - Admins are forbidden from accessing cart
 * - Cart ownership enforced via JWT userId
 * 
 * ROUTES:
 * - GET    /api/v1/cart              - Get cart
 * - POST   /api/v1/cart/items        - Add item
 * - PATCH  /api/v1/cart/items/:id    - Update quantity
 * - DELETE /api/v1/cart/items/:id    - Remove item
 * 
 * OUT OF SCOPE:
 * - No admin routes
 * - No bulk updates
 * - No checkout (Phase 6)
 */
@Controller('cart')
@Roles(Role.CUSTOMER) // CUSTOMER-ONLY: Admins cannot access cart
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Get user's cart
   * 
   * Returns cart with calculated prices and warnings if items were removed
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getCart(@Req() req: RequestWithUser) {
    const userId = req.user.userId;
    return this.cartService.getCart(userId);
  }

  /**
   * Add item to cart
   * 
   * If item already exists, increments quantity
   * Validates product and material are active
   */
  @Post('items')
  @HttpCode(HttpStatus.OK)
  async addItem(@Req() req: RequestWithUser, @Body() addToCartDto: AddToCartDto) {
    const userId = req.user.userId;
    return this.cartService.addItem(userId, addToCartDto);
  }

  /**
   * Update cart item quantity
   * 
   * Quantity must be >= 1
   * Use DELETE endpoint to remove items
   */
  @Put('items/:itemId')
  @HttpCode(HttpStatus.OK)
  async updateItemQuantity(
    @Req() req: RequestWithUser,
    @Param('itemId') itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    const userId = req.user.userId;
    return this.cartService.updateItemQuantity(userId, itemId, updateCartItemDto);
  }

  /**
   * Remove item from cart
   * 
   * Hard delete - removal is explicit
   */
  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  async removeItem(@Req() req: RequestWithUser, @Param('itemId') itemId: string) {
    const userId = req.user.userId;
    return this.cartService.removeItem(userId, itemId);
  }
}


