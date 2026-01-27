import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AdminProductsController } from './admin-products.controller';
import { ProductModelsModule } from '../product-models/product-models.module';
import { MaterialsModule } from '../materials/materials.module';

@Module({
  imports: [ProductModelsModule, MaterialsModule],
  controllers: [ProductsController, AdminProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
