import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/**
 * PUBLIC VISIBILITY RULES (Phase 4 Contract)
 * 
 * RULE: Public APIs ALWAYS filter isActive = true
 * RULE: Admin APIs CAN opt-in to include inactive data
 * RULE: Phase 5 carts MUST NEVER reference inactive products
 * 
 * Implementation:
 * - Public routes call methods with includeInactive = false (default)
 * - Admin routes call methods with includeInactive = true (explicit)
 */
const PUBLIC_VISIBILITY = {
  /** Public APIs always exclude inactive records */
  ACTIVE_ONLY: false,
  /** Admin APIs can optionally include inactive records */
  INCLUDE_INACTIVE: true,
} as const;

/**
 * PRICE CALCULATION CONTRACT (Phase 4 → Phase 5)
 * 
 * FORMULA: finalPrice = product.basePrice + material.price
 * 
 * RULES:
 * - basePrice: Base cost of the product (minimum price)
 * - material.price: Additional cost for material selection (modifier)
 * - Final price computation happens ONLY in cart/order phase (Phase 5)
 * 
 * PHASE 4 RESPONSIBILITY:
 * - Store basePrice and material prices
 * - Do NOT calculate final prices
 * - Do NOT apply discounts/taxes
 * 
 * PHASE 5 RESPONSIBILITY:
 * - Fetch active product + selected material
 * - Calculate: basePrice + material.price
 * - Apply quantity multiplier
 * - Handle cart totals and checkout pricing
 * 
 * CRITICAL: This service NEVER returns computed final prices
 */

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        ...createProductDto,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        basePrice: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll(includeInactive: boolean = PUBLIC_VISIBILITY.ACTIVE_ONLY) {
    return this.prisma.product.findMany({
      where: includeInactive ? {} : { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        basePrice: true,
        // isActive: Only included for admin routes
        isActive: true,
        createdAt: true,
        updatedAt: true,
        models: {
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
            // productId: Excluded (internal foreign key)
          },
        },
        materials: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            price: true,
            // isActive: Excluded from public view unless admin
            isActive: true,
            // productId: Excluded (internal foreign key)
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, includeInactive: boolean = PUBLIC_VISIBILITY.ACTIVE_ONLY) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        basePrice: true,
        // isActive: Included for both public and admin
        isActive: true,
        createdAt: true,
        updatedAt: true,
        models: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            fileSize: true,
            createdAt: true,
            // productId: Excluded (internal foreign key)
          },
        },
        materials: {
          where: includeInactive ? {} : { isActive: true },
          select: {
            id: true,
            name: true,
            price: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            // productId: Excluded (internal foreign key)
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // For public access, filter out inactive products
    if (!includeInactive && !product.isActive) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    // Verify product exists (admin can update inactive products)
    await this.findOne(id, PUBLIC_VISIBILITY.INCLUDE_INACTIVE);

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      select: {
        id: true,
        name: true,
        description: true,
        basePrice: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    // Verify product exists (admin can delete already inactive products)
    await this.findOne(id, PUBLIC_VISIBILITY.INCLUDE_INACTIVE);

    // Soft delete
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });
  }
}


