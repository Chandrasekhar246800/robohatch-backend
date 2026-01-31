import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * CartModule - Phase 5 Shopping Cart
 * 
 * SCOPE:
 * - User-specific mutable state
 * - Correct pricing with validation
 * - Strict validation rules
 * - Zero checkout logic (Phase 6)
 */
@Module({
  imports: [PrismaModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}

