import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocCreateOrder() {
  return applyDecorators(ApiOperation({ summary: 'Create a new order' }));
}

export function ApiDocGetOrders() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all orders for tenant' }),
  );
}

export function ApiDocGetOrderById() {
  return applyDecorators(ApiOperation({ summary: 'Get order by ID' }));
}

export function ApiDocUpdateOrderStatus() {
  return applyDecorators(
    ApiOperation({ summary: 'Update order status by ID' }),
  );
}

export function ApiDocCancelOrder() {
  return applyDecorators(ApiOperation({ summary: 'Cancel order by ID' }));
}

export function ApiDocDeleteOrder() {
  return applyDecorators(ApiOperation({ summary: 'Delete order by ID' }));
}
