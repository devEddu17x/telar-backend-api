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
import { CreateCustomerDTO } from './dtos/create-customer.dto';
import { ROLES } from 'src/auth/constants/roles';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CustomerEntity } from './entities/customer.entity';
import { UpdateCustomerDTO } from './dtos/update-customer.dto';

@Controller('customers')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
  ) { }

  @Roles(ROLES.SELLER)
  @UseGuards(RolesGuard)
  @Post()
  async createCustomer(@Body() customerDTO: CreateCustomerDTO) {
    return await this.customerService.createCustomer(customerDTO);
  }

  @Roles(ROLES.SELLER)
  @UseGuards(RolesGuard)
  @Get()
  async getAllCustomers(): Promise<CustomerEntity[]> {
    return await this.customerService.getAllCustomers();
  }

  @Roles(ROLES.SELLER)
  @UseGuards(RolesGuard)
  @Get('search')
  async searchCustomers(
    @Query('names') names?: string,
    @Query('lastnames') lastNames?: string,
    @Query('phone') phone?: string,
  ): Promise<CustomerEntity[]> {
    return await this.customerService.searchCustomers(names, lastNames, phone);
  }

  @Roles(ROLES.SELLER)
  @UseGuards(RolesGuard)
  @Patch(':id')
  async updateCustomer(
    @Body() customerDTO: UpdateCustomerDTO,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.customerService.updateCustomer(id, customerDTO);
  }
}
