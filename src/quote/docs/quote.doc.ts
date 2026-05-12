import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocCreateQuote() {
  return applyDecorators(ApiOperation({ summary: 'Create a new quote' }));
}

export function ApiDocGetQuotes() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all quotes for tenant, optionally filtered by status',
    }),
  );
}

export function ApiDocGetQuoteById() {
  return applyDecorators(ApiOperation({ summary: 'Get quote by ID' }));
}

export function ApiDocUpdateQuote() {
  return applyDecorators(ApiOperation({ summary: 'Update quote by ID' }));
}

export function ApiDocCancelQuote() {
  return applyDecorators(ApiOperation({ summary: 'Cancel quote by ID' }));
}

export function ApiDocDeleteQuote() {
  return applyDecorators(ApiOperation({ summary: 'Delete quote by ID' }));
}
