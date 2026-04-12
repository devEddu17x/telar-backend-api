import { Body, Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('tenant')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post('setup')
  async setupTenant(
    @Body() createTenantDto: CreateTenantDto,
    @CurrentUser() user: any,
  ) {
    return this.tenantService.createTenant(
      createTenantDto,
      user.email,
      user.sub,
    );
  }

  @Get(':id')
  async getTenant(@Param('id') id: string) {
    return this.tenantService.getTenantById(id);
  }
}
