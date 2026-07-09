import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ClothesService } from 'src/modules/clothes/services/clothes.service';
import { CustomerService } from 'src/modules/customer/services/customer-internal.service';
import { QuoteDetailEntity } from 'src/modules/quote/entities/quote-detail.entity';
import { QuoteEntity } from 'src/modules/quote/entities/quote.entity';
import { QuoteStatus } from 'src/modules/quote/enums/status.enum';
import { QuoteService } from 'src/modules/quote/quote.service';
import { TenantEntity } from 'src/modules/tenant/entities/tenant.entity';
import {
  createClothesFactory,
  createVariantFactory,
} from '../factories/clothes.factory';
import { createCustomerFactory } from '../factories/customer.factory';
import {
  createQuoteDetailFactory,
  createQuoteFactory,
} from '../factories/quote.factory';
import { createTenantEntityFactory } from '../factories/tenant.factory';
import { seedCatalog } from '../helpers/catalog';
import { resetDatabase } from '../helpers/database';
import { createTestApp } from '../helpers/test-app';
import { CLOTHES_GENDER } from 'src/modules/clothes/enum/gender.enum';
import { CLOTHES_SIZES } from 'src/modules/clothes/enum/size.enum';

describe('Quote integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let clothesService: ClothesService;
  let customerService: CustomerService;
  let quoteService: QuoteService;
  let tenantRepository: Repository<TenantEntity>;
  let quoteRepository: Repository<QuoteEntity>;
  let quoteDetailRepository: Repository<QuoteDetailEntity>;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    clothesService = app.get(ClothesService);
    customerService = app.get(CustomerService);
    quoteService = app.get(QuoteService);
    tenantRepository = app.get(getRepositoryToken(TenantEntity));
    quoteRepository = app.get(getRepositoryToken(QuoteEntity));
    quoteDetailRepository = app.get(getRepositoryToken(QuoteDetailEntity));
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    await seedCatalog(dataSource);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates a quote, calculates totals and persists detail unit prices', async () => {
    const { tenant, customer, variantA, variantB } = await createQuoteFixture();

    const quote = await quoteService.createQuote(
      createQuoteFactory({
        customerId: customer.id,
        details: [
          createQuoteDetailFactory({
            clothesVariantId: variantA.id,
            quantity: 2,
            customizations: [{ name: 'Logo', number: 7 }],
          }),
          createQuoteDetailFactory({
            clothesVariantId: variantB.id,
            quantity: 3,
          }),
        ],
      }),
      tenant.id,
    );

    expect(Number(quote.total)).toBe(560);
    expect(quote.status).toBe(QuoteStatus.PENDING);
    expect(quote.details).toHaveLength(2);
    expect(quote.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          clothesVariantId: variantA.id,
          unitPrice: 100,
          quantity: 2,
          customizations: [{ name: 'Logo', number: 7 }],
        }),
        expect.objectContaining({
          clothesVariantId: variantB.id,
          unitPrice: 120,
          quantity: 3,
        }),
      ]),
    );

    await expect(quoteRepository.find()).resolves.toHaveLength(1);
    await expect(quoteDetailRepository.find()).resolves.toHaveLength(2);
  });

  it('rejects customizations when they exceed the requested quantity', async () => {
    const { tenant, customer, variantA } = await createQuoteFixture();

    await expect(
      quoteService.createQuote(
        createQuoteFactory({
          customerId: customer.id,
          details: [
            createQuoteDetailFactory({
              clothesVariantId: variantA.id,
              quantity: 1,
              customizations: [{ name: 'A' }, { name: 'B' }],
            }),
          ],
        }),
        tenant.id,
      ),
    ).rejects.toThrow('Customizations cannot exceed quantity');

    await expect(quoteRepository.find()).resolves.toHaveLength(0);
  });

  it('rejects quotes that try to use variants from another tenant', async () => {
    const { tenant, customer } = await createQuoteFixture();
    const otherTenant = await createTenantEntityFactory(tenantRepository);
    const otherClothes = await createPricedClothes(otherTenant.id);

    await expect(
      quoteService.createQuote(
        createQuoteFactory({
          customerId: customer.id,
          details: [
            createQuoteDetailFactory({
              clothesVariantId: otherClothes.variants[0].id,
              quantity: 1,
            }),
          ],
        }),
        tenant.id,
      ),
    ).rejects.toThrow('No clothes variants found');

    await expect(quoteRepository.find()).resolves.toHaveLength(0);
  });

  it('returns quote summaries with customer data and production totals', async () => {
    const { tenant, customer, variantA, variantB } = await createQuoteFixture();

    const quote = await quoteService.createQuote(
      createQuoteFactory({
        customerId: customer.id,
        details: [
          createQuoteDetailFactory({
            clothesVariantId: variantA.id,
            quantity: 2,
          }),
          createQuoteDetailFactory({
            clothesVariantId: variantB.id,
            quantity: 3,
          }),
        ],
      }),
      tenant.id,
    );

    await expect(quoteService.getAll(tenant.id)).resolves.toEqual([
      expect.objectContaining({
        id: quote.id,
        total: '560.00',
        customer: expect.objectContaining({
          id: customer.id,
          names: customer.names,
        }),
        totalClothes: 1,
        totalUnitsToProduced: 5,
      }),
    ]);
  });

  async function createQuoteFixture() {
    const tenant = await createTenantEntityFactory(tenantRepository);
    const customer = await customerService.createCustomer(
      createCustomerFactory({ names: 'Quote', lastNames: 'Customer' }),
      tenant.id,
    );
    const clothes = await createPricedClothes(tenant.id);

    return {
      tenant,
      customer,
      variantA: clothes.variants[0],
      variantB: clothes.variants[1],
    };
  }

  async function createPricedClothes(tenantId: string) {
    return clothesService.createClothe(
      createClothesFactory({
        price: 100,
        variants: [
          createVariantFactory({
            size: CLOTHES_SIZES.M,
            gender: CLOTHES_GENDER.UNISEX,
            additional: 0,
          }),
          createVariantFactory({
            size: CLOTHES_SIZES.L,
            gender: CLOTHES_GENDER.UNISEX,
            additional: 20,
          }),
        ],
      }),
      tenantId,
    );
  }
});
