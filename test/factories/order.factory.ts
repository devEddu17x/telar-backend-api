import { CreateOrderDTO } from 'src/modules/order/dtos/create-order.dto';

export function createOrderFactory(
  overrides: Partial<CreateOrderDTO> = {},
): CreateOrderDTO {
  return {
    quoteId: overrides.quoteId!,
    deliveryDate: futureDate(),
    address: {
      department: 'Lima',
      city: 'Lima',
      district: 'Miraflores',
      street: 'Av. Test 123',
    },
    ...overrides,
  };
}

function futureDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}
