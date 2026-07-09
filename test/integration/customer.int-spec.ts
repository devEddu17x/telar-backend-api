import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CustomerEntity } from 'src/modules/customer/entities/customer.entity';
import { CustomerService } from 'src/modules/customer/services/customer-internal.service';
import { TenantEntity } from 'src/modules/tenant/entities/tenant.entity';
import { createCustomerFactory } from '../factories/customer.factory';
import { createTenantEntityFactory } from '../factories/tenant.factory';
import { resetDatabase } from '../helpers/database';
import { createTestApp } from '../helpers/test-app';

describe('Customer integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let customerService: CustomerService;
  let customerRepository: Repository<CustomerEntity>;
  let tenantRepository: Repository<TenantEntity>;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    customerService = app.get(CustomerService);
    customerRepository = app.get(getRepositoryToken(CustomerEntity));
    tenantRepository = app.get(getRepositoryToken(TenantEntity));
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates a customer with the current tenant id and persists customer data', async () => {
    const tenant = await createTenantEntityFactory(tenantRepository);
    const customerData = createCustomerFactory({
      names: 'Camila',
      lastNames: 'Rivera',
      phone: '987654321',
      reference: 'Near the central market',
    });

    const customer = await customerService.createCustomer(
      customerData,
      tenant.id,
    );

    expect(customer).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        tenantId: tenant.id,
        names: customerData.names,
        lastNames: customerData.lastNames,
        phone: customerData.phone,
        reference: customerData.reference,
      }),
    );

    await expect(
      customerRepository.findOneByOrFail({ id: customer.id }),
    ).resolves.toEqual(expect.objectContaining({ tenantId: tenant.id }));
  });

  it('isolates customer listing and search by tenant', async () => {
    const tenantA = await createTenantEntityFactory(tenantRepository, {
      name: 'Tenant A',
    });
    const tenantB = await createTenantEntityFactory(tenantRepository, {
      name: 'Tenant B',
    });

    const customerA = await customerService.createCustomer(
      createCustomerFactory({ names: 'Ana', lastNames: 'Tenant A' }),
      tenantA.id,
    );
    const customerB = await customerService.createCustomer(
      createCustomerFactory({ names: 'Bruno', lastNames: 'Tenant B' }),
      tenantB.id,
    );

    await expect(customerService.getAllCustomers(tenantA.id)).resolves.toEqual([
      expect.objectContaining({ id: customerA.id, tenantId: tenantA.id }),
    ]);
    await expect(
      customerService.getCustomerById(customerB.id, tenantA.id),
    ).rejects.toThrow('Customer not found');
  });

  it('searches customers by partial name, last name and phone inside the same tenant only', async () => {
    const tenantA = await createTenantEntityFactory(tenantRepository, {
      name: 'Search Tenant A',
    });
    const tenantB = await createTenantEntityFactory(tenantRepository, {
      name: 'Search Tenant B',
    });

    const target = await customerService.createCustomer(
      createCustomerFactory({
        names: 'Valentina',
        lastNames: 'Quispe Torres',
        phone: '912345678',
      }),
      tenantA.id,
    );
    await customerService.createCustomer(
      createCustomerFactory({
        names: 'Valentina',
        lastNames: 'Quispe Torres',
        phone: '912345678',
      }),
      tenantB.id,
    );
    await customerService.createCustomer(
      createCustomerFactory({
        names: 'Lucia',
        lastNames: 'Paredes',
        phone: '987111222',
      }),
      tenantA.id,
    );

    await expect(
      customerService.searchCustomers(tenantA.id, 'valen'),
    ).resolves.toEqual([
      expect.objectContaining({ id: target.id, tenantId: tenantA.id }),
    ]);
    await expect(
      customerService.searchCustomers(tenantA.id, undefined, 'torres'),
    ).resolves.toEqual([
      expect.objectContaining({ id: target.id, tenantId: tenantA.id }),
    ]);
    await expect(
      customerService.searchCustomers(tenantA.id, undefined, undefined, '234'),
    ).resolves.toEqual([
      expect.objectContaining({ id: target.id, tenantId: tenantA.id }),
    ]);
  });

  it('returns an empty list when searching without filters', async () => {
    const tenant = await createTenantEntityFactory(tenantRepository);
    await customerService.createCustomer(createCustomerFactory(), tenant.id);

    await expect(customerService.searchCustomers(tenant.id)).resolves.toEqual(
      [],
    );
  });
});
