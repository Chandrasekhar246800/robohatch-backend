import { Module } from '@nestjs/common';
import { CustomTextController } from './custom-text.controller';
import { CustomTextService } from './custom-text.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomTextController],
  providers: [CustomTextService],
})
export class CustomTextModule {}
