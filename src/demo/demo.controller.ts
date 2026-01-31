import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { users_role as Role } from '@prisma/client';

@Controller('demo')
export class DemoController {
  @Roles(Role.CUSTOMER)
  @Get('customer-only')
  customerOnly() {
    return {
      message: 'This route is only accessible by CUSTOMER role',
      success: true,
    };
  }

  @Roles(Role.ADMIN)
  @Get('admin-only')
  adminOnly() {
    return {
      message: 'This route is only accessible by ADMIN role',
      success: true,
    };
  }
}


