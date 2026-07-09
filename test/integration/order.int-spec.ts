import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ClothesService } from 'src/modules/clothes/services/clothes.service';
import { CLOTHES_GENDER } from 'src/modules/clothes/enum/gender.enum';
import { CLOTHES_SIZES } from 'src/modules/clothes/enum/size.enum';
import { CustomerService } from 'src/modules/customer/services/customer-internal.service';
import { AddressEntity } from 'src/modules/order/entities/address.entity';
import { OrderEntity } from 'src/modules/order/entities/order.entity';
import { OrderStatus } from 'src/modules/order/enum/order-status.enum';
import { OrderService } from 'src/modules/order/order.service';
import { QuoteEntity } from 'src/modules/quote/entities/quote.entity';
import { QuoteStatus } from 'src/modules/quote/enums/status.enum';
import { QuoteService } from 'src/modules/quote/quote.service';
import { TenantEntity } from 'src/modules/tenant/entities/tenant.entity';
import {
  createClothesFactory,
  createVariantFactory,
} from '../factories/clothes.factory';
import { createCustomerFactory } from '../factories/customer.factory';
import { createOrderFactory } from '../factories/order.factory';
import {
  createQuoteDetailFactory,
  createQuoteFactory,
} from '../factories/quote.factory';
import { createTenantEntityFactory } from '../factories/tenant.factory';
import { seedCatalog } from '../helpers/catalog';
import { resetDatabase } from '../helpers/database';
import { createTestApp } from '../helpers/test-app';

describe('Order integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let clothesService: ClothesService;
  let customerService: CustomerService;
  let orderService: OrderService;
  let quoteService: QuoteService;
  let tenantRepository: Repository<TenantEntity>;
  let orderRepository: Repository<OrderEntity>;
  let addressRepository: Repository<AddressEntity>;
  let quoteRepository: Repository<QuoteEntity>;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    clothesService = app.get(ClothesService);
    customerService = app.get(CustomerService);
    orderService = app.get(OrderService);
    quoteService = app.get(QuoteService);
    tenantRepository = app.get(getRepositoryToken(TenantEntity));
    orderRepository = app.get(getRepositoryToken(OrderEntity));
    addressRepository = app.get(getRepositoryToken(AddressEntity));
    quoteRepository = app.get(getRepositoryToken(QuoteEntity));
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    await seedCatalog(dataSource);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('creates an order from a pending quote and approves the quote', async () => {
    const { tenant, quote } = await createOrderFixture();

    const order = await orderService.createOrder(
      createOrderFactory({ quoteId: quote.id }),
      tenant.id,
    );

    expect(order).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        tenantId: tenant.id,
        quoteId: quote.id,
        total: '250.00',
        status: OrderStatus.IN_PRODUCTION,
      }),
    );

    await expect(addressRepository.find()).resolves.toHaveLength(1);
    await expect(
      quoteRepository.findOneByOrFail({ id: quote.id }),
    ).resolves.toEqual(
      expect.objectContaining({ status: QuoteStatus.APPROVED }),
    );
  });

  it('rejects order creation from a cancelled quote without creating rows', async () => {
    const { tenant, quote } = await createOrderFixture();
    await quoteService.cancelQuote(quote.id, tenant.id);

    await expect(
      orderService.createOrder(
        createOrderFactory({ quoteId: quote.id }),
        tenant.id,
      ),
    ).rejects.toThrow('cancelled quote');

    await expect(orderRepository.find()).resolves.toHaveLength(0);
    await expect(addressRepository.find()).resolves.toHaveLength(0);
  });

  it('returns order summaries with customer, address and production totals', async () => {
    const { tenant, quote, customer } = await createOrderFixture();
    const order = await orderService.createOrder(
      createOrderFactory({ quoteId: quote.id }),
      tenant.id,
    );

    await expect(orderService.getOrders(tenant.id)).resolves.toEqual([
      expect.objectContaining({
        id: order.id,
        total: '250.00',
        quoteId: quote.id,
        customer: expect.objectContaining({
          id: customer.id,
          names: customer.names,
        }),
        address: expect.objectContaining({
          district: 'Miraflores',
        }),
        totalClothes: 1,
        totalUnitsToProduced: 2,
      }),
    ]);
  });

  it('allows DONE only from IN_PRODUCTION and keeps DONE as final', async () => {
    const { tenant, quote } = await createOrderFixture();
    const order = await orderService.createOrder(
      createOrderFactory({ quoteId: quote.id }),
      tenant.id,
    );

    const doneOrder = await orderService.updateOrderStatus(
      order.id,
      OrderStatus.DONE,
      tenant.id,
    );

    expect(doneOrder.status).toBe(OrderStatus.DONE);
    await expect(
      orderService.updateOrderStatus(
        order.id,
        OrderStatus.IN_PRODUCTION,
        tenant.id,
      ),
    ).rejects.toThrow('already DONE');
  });

  it('keeps cancelled orders as final', async () => {
    const { tenant, quote } = await createOrderFixture();
    const order = await orderService.createOrder(
      createOrderFactory({ quoteId: quote.id }),
      tenant.id,
    );

    await orderService.cancelOrder(
      order.id,
      'Customer changed plans',
      tenant.id,
    );

    await expect(
      orderService.updateOrderStatus(
        order.id,
        OrderStatus.IN_PRODUCTION,
        tenant.id,
      ),
    ).rejects.toThrow('order that is CANCELLED');
    await expect(
      orderService.updateOrderStatus(order.id, OrderStatus.DONE, tenant.id),
    ).rejects.toThrow('must be in IN_PRODUCTION');
  });

  async function createOrderFixture() {
    const tenant = await createTenantEntityFactory(tenantRepository);
    const customer = await customerService.createCustomer(
      createCustomerFactory({ names: 'Order', lastNames: 'Customer' }),
      tenant.id,
    );
    const clothes = await clothesService.createClothe(
      createClothesFactory({
        price: 100,
        variants: [
          createVariantFactory({
            size: CLOTHES_SIZES.M,
            gender: CLOTHES_GENDER.UNISEX,
            additional: 25,
          }),
        ],
      }),
      tenant.id,
    );
    const quote = await quoteService.createQuote(
      createQuoteFactory({
        customerId: customer.id,
        details: [
          createQuoteDetailFactory({
            clothesVariantId: clothes.variants[0].id,
            quantity: 2,
          }),
        ],
      }),
      tenant.id,
    );

    return { tenant, customer, quote, clothes };
  }
});
