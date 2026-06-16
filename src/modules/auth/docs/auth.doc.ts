import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocRegister() {
  return applyDecorators(ApiOperation({ summary: 'Register a new owner' }));
}

export function ApiDocConfirmEmail() {
  return applyDecorators(ApiOperation({ summary: 'Confirm user email' }));
}

export function ApiDocResendCode() {
  return applyDecorators(ApiOperation({ summary: 'Resend confirmation code' }));
}
