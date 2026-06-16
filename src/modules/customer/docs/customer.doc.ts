import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocCreateCustomer() {
  return applyDecorators(ApiOperation({ summary: 'Create a new customer' }));
}

export function ApiDocGetAllCustomers() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all customers for tenant' }),
  );
}

export function ApiDocSearchCustomers() {
  return applyDecorators(
    ApiOperation({ summary: 'Search customers by filters' }),
  );
}

export function ApiDocUpdateCustomer() {
  return applyDecorators(ApiOperation({ summary: 'Update customer by ID' }));
}
