import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomFilesService } from './custom-files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@Controller('custom-files')
@UseGuards(JwtAuthGuard)
export class CustomFilesController {
  constructor(private readonly customFilesService: CustomFilesService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
      fileFilter: (req, file, callback) => {
        const allowedExtensions = [
          '.stl',
          '.zip',
          '.pdf',
          '.png',
          '.jpg',
          '.jpeg',
          '.docx',
        ];

        const fileExtension = file.originalname
          .toLowerCase()
          .substring(file.originalname.lastIndexOf('.'));

        if (!allowedExtensions.includes(fileExtension)) {
          return callback(
            new BadRequestException(
              `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`,
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('productId') productId: string,
    @Body('notes') notes: string,
    @Req() req: RequestWithUser,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!productId) {
      throw new BadRequestException('productId is required');
    }

    return this.customFilesService.processFileUpload({
      file,
      userId: req.user.userId,
      userEmail: req.user.email,
      productId,
      notes: notes || undefined,
    });
  }
}
