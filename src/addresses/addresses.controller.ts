import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Req, 
  UseGuards,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  async create(
    @Req() req: any,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    const userId = req.user.sub;
    return this.addressesService.create(userId, createAddressDto);
  }

  @Get()
  async findAll(@Req() req: any) {
    const userId = req.user.sub;
    return this.addressesService.findAll(userId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.addressesService.findOne(id, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    const userId = req.user.sub;
    return this.addressesService.update(id, userId, updateAddressDto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.addressesService.remove(id, userId);
  }
}
