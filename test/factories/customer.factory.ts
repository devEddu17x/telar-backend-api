import { faker } from '@faker-js/faker';
import { CreateCustomerDTO } from 'src/modules/customer/dtos/create-customer.dto';

export function createCustomerFactory(
  overrides: Partial<CreateCustomerDTO> = {},
): CreateCustomerDTO {
  return {
    names: faker.person.firstName(),
    lastNames: faker.person.lastName(),
    phone: `9${faker.string.numeric(8)}`,
    reference: faker.location.streetAddress(),
    ...overrides,
  };
}
