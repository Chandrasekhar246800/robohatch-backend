import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomTextService } from './custom-text.service';
import { CreateCustomTextDto } from './dto/create-custom-text.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@Controller('custom-text')
@UseGuards(JwtAuthGuard)
export class CustomTextController {
  constructor(private readonly customTextService: CustomTextService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCustomTextRequest(
    @Body() createCustomTextDto: CreateCustomTextDto,
    @Req() req: RequestWithUser,
  ) {
    return this.customTextService.processCustomTextRequest({
      ...createCustomTextDto,
      userId: req.user.userId,
      userEmail: req.user.email,
    });
  }
}
