import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileService } from '../common/services/file.service';
import { CreateProductModelDto } from './dto/create-product-model.dto';

@Injectable()
export class ProductModelsService {
  constructor(
    private prisma: PrismaService,
    private fileService: FileService,
  ) {}

  async create(productId: string, createProductModelDto: CreateProductModelDto) {
    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // SECURITY: Validate file URL is from trusted storage
    this.fileService.validateFileUrl(createProductModelDto.fileUrl);

    // Validate file extension
    this.fileService.validateFileExtension(
      createProductModelDto.fileName,
      ['stl', 'obj']
    );

    // Validate file size
    this.fileService.validateFileSize(createProductModelDto.fileSize);

    // Validate file type
    const validTypes = ['STL', 'OBJ', 'stl', 'obj'];
    if (!validTypes.includes(createProductModelDto.fileType)) {
      throw new BadRequestException('Invalid file type. Only STL and OBJ are supported.');
    }

    // Normalize file type to uppercase
    const normalizedFileType = createProductModelDto.fileType.toUpperCase();

    return this.prisma.product_models.create({
      data: {
        ...createProductModelDto,
        fileType: normalizedFileType,
        productId,
      },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileType: true,
        fileSize: true,
        createdAt: true,
      },
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.product_models.findMany({
      where: { productId },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        fileType: true,
        fileSize: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(modelId: string) {
    const model = await this.prisma.product_models.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      throw new NotFoundException('Product model not found');
    }

    await this.prisma.product_models.delete({
      where: { id: modelId },
    });

    return { message: 'Product model deleted successfully' };
  }
}

