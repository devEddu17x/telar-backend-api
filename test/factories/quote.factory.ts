import {
  CreateQuoteDTO,
  QuoteDetailDTO,
} from 'src/modules/quote/dtos/create-quote.dto';

export function createQuoteDetailFactory(
  overrides: Partial<QuoteDetailDTO> = {},
): QuoteDetailDTO {
  return {
    clothesVariantId: overrides.clothesVariantId!,
    quantity: 1,
    customizations: [],
    ...overrides,
  };
}

export function createQuoteFactory(
  overrides: Partial<CreateQuoteDTO> = {},
): CreateQuoteDTO {
  return {
    customerId: overrides.customerId!,
    details: overrides.details ?? [],
    ...overrides,
  };
}
