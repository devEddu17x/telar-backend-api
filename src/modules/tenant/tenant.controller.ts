import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { ApiDocSetupTenant, ApiDocGetTenant } from './docs/tenant.doc';
import { CreateTenantDto } from './dtos/create-tenant.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';

@Controller('tenant')
@UseGuards(JwtAuthGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post('setup')
  @ApiDocSetupTenant()
  async setupTenant(
    @Body() createTenantDto: CreateTenantDto,
    @CurrentUser() user: any,
  ) {
    return this.tenantService.createTenant(
      createTenantDto,
      user.email,
      user.sub,
      user,
    );
  }

  @Get(':id')
  @ApiDocGetTenant()
  async getTenant(@Param('id') id: string, @CurrentUser() user: any) {
    if (user.tenantId !== id) {
      throw new ForbiddenException(
        'You can only access your own tenant information',
      );
    }
    return this.tenantService.getTenantById(id);
  }
}
