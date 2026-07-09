import { faker } from '@faker-js/faker';
import {
  CognitoEmployeeParams,
  CognitoOwnerParams,
} from 'src/modules/auth/interfaces/cognito-user-interface';

let sequence = 0;

export function createOwnerFactory(
  overrides: Partial<CognitoOwnerParams> = {},
): CognitoOwnerParams {
  return {
    email: uniqueEmail('owner'),
    name: faker.person.firstName(),
    lastName: faker.person.lastName(),
    password: 'ValidPass123!',
    ...overrides,
  };
}

export function createEmployeeFactory(
  overrides: Partial<CognitoEmployeeParams> = {},
): CognitoEmployeeParams {
  return {
    email: uniqueEmail('employee'),
    name: faker.person.firstName(),
    lastName: faker.person.lastName(),
    ...overrides,
  };
}

function uniqueEmail(prefix: string): string {
  sequence += 1;
  return `${prefix}-${faker.string.alphanumeric(8)}-${sequence}@example.com`;
}
