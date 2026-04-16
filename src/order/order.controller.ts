import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDTO } from './dtos/create-order.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UpdateOrderDTO } from './dtos/update-order.dto';
import { CancelOrderDTO } from './dtos/cancel-order.dto';
import { ROLES } from 'src/auth/constants/roles';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequireTenantGuard } from 'src/auth/guards/require-tenant.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.SELLER)
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(@Body() dto: CreateOrderDTO, @CurrentUser() user: any) {
    return await this.orderService.createOrder(dto, user.tenantId);
  }

  @Get()
  async getOrders(@CurrentUser() user: any) {
    return await this.orderService.getOrders(user.tenantId);
  }

  @Get(':id')
  async getOrderById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return await this.orderService.getOrderById(id, user.tenantId);
  }

  @Patch(':id')
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderDTO,
    @CurrentUser() user: any,
  ) {
    return await this.orderService.updateOrderStatus(
      id,
      dto.status,
      user.tenantId,
    );
  }

  @Patch(':id/cancel')
  async cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDTO,
    @CurrentUser() user: any,
  ) {
    return await this.orderService.cancelOrder(id, dto.reason, user.tenantId);
  }
}
