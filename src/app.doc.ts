import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocHealth() {
  return applyDecorators(
    ApiOperation({ summary: 'Check if the application is running' }),
  );
}
