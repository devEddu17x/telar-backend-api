import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocSetupTenant() {
  return applyDecorators(ApiOperation({ summary: 'Setup a new tenant' }));
}

export function ApiDocGetTenant() {
  return applyDecorators(
    ApiOperation({ summary: 'Get tenant information by ID' }),
  );
}
