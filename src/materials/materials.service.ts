import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';

@Injectable()
export class MaterialsService {
  constructor(private prisma: PrismaService) {}

  async create(productId: string, createMaterialDto: CreateMaterialDto) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // SAFEGUARD: Prevent duplicate material names per product
    // This avoids cart ambiguity in Phase 5 (e.g., "Which PLA material?")
    const existingMaterial = await this.prisma.material.findFirst({
      where: {
        productId,
        name: createMaterialDto.name,
      },
    });

    if (existingMaterial) {
      throw new ConflictException(
        `Material "${createMaterialDto.name}" already exists for this product`
      );
    }

    return this.prisma.material.create({
      data: {
        ...createMaterialDto,
        productId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByProduct(productId: string, includeInactive = false) {
    return this.prisma.material.findMany({
      where: {
        productId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      select: {
        id: true,
        name: true,
        price: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(materialId: string, updateMaterialDto: UpdateMaterialDto) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    return this.prisma.material.update({
      where: { id: materialId },
      data: updateMaterialDto,
      select: {
        id: true,
        name: true,
        price: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(materialId: string) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    // Soft delete
    return this.prisma.material.update({
      where: { id: materialId },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });
  }
}
