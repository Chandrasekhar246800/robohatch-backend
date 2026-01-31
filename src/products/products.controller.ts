import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { users_role as Role } from '@prisma/client';

@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ========== PUBLIC ROUTES ==========

  @Public()
  @Get('products')
  async findAll() {
    // PUBLIC VISIBILITY: Always exclude inactive products
    return this.productsService.findAll(false);
  }

  @Public()
  @Get('products/:id')
  async findOne(@Param('id') id: string) {
    // PUBLIC VISIBILITY: Always exclude inactive products
    return this.productsService.findOne(id, false);
  }

  // ========== ADMIN ROUTES ==========

  @Post('admin/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch('admin/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    // ADMIN VISIBILITY: Can update inactive products
    return this.productsService.update(id, updateProductDto);
  }

  @Delete('admin/products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string) {
    // SOFT DELETE: Sets isActive = false
    // PHASE 5 IMPACT: Existing cart items with this product will be invalidated
    return this.productsService.remove(id);
  }
}


