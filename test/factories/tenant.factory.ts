import { faker } from '@faker-js/faker';
import { Repository } from 'typeorm';
import { TenantEntity } from 'src/modules/tenant/entities/tenant.entity';

let sequence = 0;

interface TenantFactoryData {
  name: string;
  ruc: string | null;
  address: string | null;
}

export function createTenantFactory(
  overrides: Partial<TenantFactoryData> = {},
): TenantFactoryData {
  sequence += 1;

  return {
    name: `${faker.company.name()} ${sequence}`,
    ruc: null,
    address: null,
    ...overrides,
  };
}

export async function createTenantEntityFactory(
  tenantRepository: Repository<TenantEntity>,
  overrides: Partial<TenantFactoryData> = {},
): Promise<TenantEntity> {
  const tenantData = createTenantFactory(overrides);

  return tenantRepository.save(
    tenantRepository.create({
      name: tenantData.name,
      ruc: tenantData.ruc,
      address: tenantData.address,
    }),
  );
}
