import { Module } from '@nestjs/common';
import { ProductModelsService } from './product-models.service';

@Module({
  providers: [ProductModelsService],
  exports: [ProductModelsService],
})
export class ProductModelsModule {}
