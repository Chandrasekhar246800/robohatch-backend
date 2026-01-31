import { Module } from '@nestjs/common';
import { CustomFilesController } from './custom-files.controller';
import { CustomFilesService } from './custom-files.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomFilesController],
  providers: [CustomFilesService],
})
export class CustomFilesModule {}
