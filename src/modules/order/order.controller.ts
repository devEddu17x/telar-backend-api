import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import {
  ApiDocCreateOrder,
  ApiDocGetOrders,
  ApiDocGetOrderById,
  ApiDocUpdateOrderStatus,
  ApiDocCancelOrder,
  ApiDocDeleteOrder,
} from './docs/order.doc';
import { CreateOrderDTO } from './dtos/create-order.dto';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';
import { UpdateOrderDTO } from './dtos/update-order.dto';
import { CancelOrderDTO } from './dtos/cancel-order.dto';
import { ROLES } from 'src/common/enum/roles';
import { Roles } from '../../modules/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { RequireTenantGuard } from '../../modules/auth/guards/require-tenant.guard';
import { RolesGuard } from '../../modules/auth/guards/roles.guard';

@Roles(ROLES.OWNER, ROLES.ADMIN, ROLES.SELLER)
@UseGuards(JwtAuthGuard, RequireTenantGuard, RolesGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiDocCreateOrder()
  async createOrder(@Body() dto: CreateOrderDTO, @CurrentUser() user: any) {
    return await this.orderService.createOrder(dto, user.tenantId);
  }

  @Get()
  @ApiDocGetOrders()
  async getOrders(@CurrentUser() user: any) {
    return await this.orderService.getOrders(user.tenantId);
  }

  @Get(':id')
  @ApiDocGetOrderById()
  async getOrderById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return await this.orderService.getOrderById(id, user.tenantId);
  }

  @Patch(':id')
  @ApiDocUpdateOrderStatus()
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
  @ApiDocCancelOrder()
  async cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDTO,
    @CurrentUser() user: any,
  ) {
    return await this.orderService.cancelOrder(id, dto.reason, user.tenantId);
  }

  @Roles(ROLES.OWNER, ROLES.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  @ApiDocDeleteOrder()
  async deleteOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return await this.orderService.deleteOrder(id, user.tenantId);
  }
}
