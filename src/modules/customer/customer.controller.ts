import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomerService } from './services/customer-internal.service';
import {
  ApiDocCreateCustomer,
  ApiDocGetAllCustomers,
  ApiDocSearchCustomers,
  ApiDocUpdateCustomer,
} from './docs/customer.doc';
import { CreateCustomerDTO } from './dtos/create-customer.dto';
import { ROLES } from 'src/common/enum/roles';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';
import { Roles } from '../../modules/auth/decorators/roles.decorator';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';
import { CustomerEntity } from './entities/customer.entity';
import { UpdateCustomerDTO } from './dtos/update-customer.dto';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RequireTenantGuard } from '../../modules/auth/guards/require-tenant.guard';
@Roles(ROLES.SELLER, ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ApiDocCreateCustomer()
  async createCustomer(
    @Body() customerDTO: CreateCustomerDTO,
    @CurrentUser() user: any,
  ) {
    return await this.customerService.createCustomer(
      customerDTO,
      user.tenantId,
    );
  }

  @Get()
  @ApiDocGetAllCustomers()
  async getAllCustomers(@CurrentUser() user: any): Promise<CustomerEntity[]> {
    return await this.customerService.getAllCustomers(user.tenantId);
  }

  @Get('search')
  @ApiDocSearchCustomers()
  async searchCustomers(
    @CurrentUser() user: any,
    @Query('names') names?: string,
    @Query('lastnames') lastNames?: string,
    @Query('phone') phone?: string,
  ): Promise<CustomerEntity[]> {
    return await this.customerService.searchCustomers(
      user.tenantId,
      names,
      lastNames,
      phone,
    );
  }

  @Patch(':id')
  @ApiDocUpdateCustomer()
  async updateCustomer(
    @Body() customerDTO: UpdateCustomerDTO,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return await this.customerService.updateCustomer(
      id,
      customerDTO,
      user.tenantId,
    );
  }
}
