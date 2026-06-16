import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocGetEmployee() {
  return applyDecorators(
    ApiOperation({ summary: 'Get current employee profile and roles' }),
  );
}

export function ApiDocUpdateEmployee() {
  return applyDecorators(
    ApiOperation({ summary: 'Update current employee profile' }),
  );
}
