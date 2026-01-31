import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProductModelsService } from '../product-models/product-models.service';
import { MaterialsService } from '../materials/materials.service';
import { CreateProductModelDto } from '../product-models/dto/create-product-model.dto';
import { CreateMaterialDto } from '../materials/dto/create-material.dto';
import { UpdateMaterialDto } from '../materials/dto/update-material.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { users_role as Role } from '@prisma/client';
import { Patch } from '@nestjs/common';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminProductsController {
  constructor(
    private readonly productModelsService: ProductModelsService,
    private readonly materialsService: MaterialsService,
  ) {}

  // ========== 3D MODEL ENDPOINTS ==========

  @Post(':id/models')
  async createModel(
    @Param('id') productId: string,
    @Body() createProductModelDto: CreateProductModelDto,
  ) {
    return this.productModelsService.create(productId, createProductModelDto);
  }

  @Delete('models/:modelId')
  async deleteModel(@Param('modelId') modelId: string) {
    return this.productModelsService.remove(modelId);
  }

  // ========== MATERIAL ENDPOINTS ==========

  @Post(':id/materials')
  async createMaterial(
    @Param('id') productId: string,
    @Body() createMaterialDto: CreateMaterialDto,
  ) {
    return this.materialsService.create(productId, createMaterialDto);
  }

  @Patch('materials/:materialId')
  async updateMaterial(
    @Param('materialId') materialId: string,
    @Body() updateMaterialDto: UpdateMaterialDto,
  ) {
    return this.materialsService.update(materialId, updateMaterialDto);
  }

  @Delete('materials/:materialId')
  async deleteMaterial(@Param('materialId') materialId: string) {
    return this.materialsService.remove(materialId);
  }
}

