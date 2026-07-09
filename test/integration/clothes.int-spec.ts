import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ClothesVariantEntity } from 'src/modules/clothes/entities/clothes-variant.entity';
import { ClothesEntity } from 'src/modules/clothes/entities/clothes.entity';
import { CLOTHES_GENDER } from 'src/modules/clothes/enum/gender.enum';
import { CLOTHES_SIZES } from 'src/modules/clothes/enum/size.enum';
import { ClothesService } from 'src/modules/clothes/services/clothes.service';
import {
  createClothesFactory,
  createDraftClothesFactory,
  createVariantFactory,
} from '../factories/clothes.factory';
import { createTenantEntityFactory } from '../factories/tenant.factory';
import { expectCatalogSeeded, seedCatalog } from '../helpers/catalog';
import { resetDatabase } from '../helpers/database';
import { createTestApp } from '../helpers/test-app';
import { TenantEntity } from 'src/modules/tenant/entities/tenant.entity';

describe('Clothes integration', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let clothesService: ClothesService;
  let clothesRepository: Repository<ClothesEntity>;
  let variantRepository: Repository<ClothesVariantEntity>;
  let tenantRepository: Repository<TenantEntity>;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = app.get(DataSource);
    clothesService = app.get(ClothesService);
    clothesRepository = app.get(getRepositoryToken(ClothesEntity));
    variantRepository = app.get(getRepositoryToken(ClothesVariantEntity));
    tenantRepository = app.get(getRepositoryToken(TenantEntity));
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    await seedCatalog(dataSource);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('seeds the clothes size and gender catalogs required by creation flows', async () => {
    await expectCatalogSeeded(dataSource);
  });

  it('creates clothes with variants for the current tenant', async () => {
    const tenant = await createTenantEntityFactory(tenantRepository);
    const dto = createClothesFactory({
      name: 'Premium Hoodie',
      price: 80,
      variants: [
        createVariantFactory({
          size: CLOTHES_SIZES.M,
          gender: CLOTHES_GENDER.UNISEX,
          additional: 0,
        }),
        createVariantFactory({
          size: CLOTHES_SIZES.L,
          gender: CLOTHES_GENDER.UNISEX,
          additional: 15,
        }),
      ],
    });

    const clothes = await clothesService.createClothe(dto, tenant.id);

    expect(clothes).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        tenantId: tenant.id,
        name: dto.name,
      }),
    );
    expect(clothes.variants).toHaveLength(2);
    expect(
      clothes.variants.map((variant) => Number(variant.additional)),
    ).toEqual([0, 15]);

    await expect(
      variantRepository.find({ where: { clothesId: clothes.id } }),
    ).resolves.toHaveLength(2);
  });

  it('creates draft clothes with the default M and UNISEX variant', async () => {
    const tenant = await createTenantEntityFactory(tenantRepository);

    const draft = await clothesService.createDraftClothe(
      createDraftClothesFactory({ name: 'Incomplete Uniform', price: 35 }),
      tenant.id,
    );

    expect(draft.isDraft).toBe(true);
    expect(draft.isInEcommerce).toBe(false);
    expect(draft.variants).toHaveLength(1);

    const created = await clothesService.getClothesById(draft.id, tenant.id);
    expect(created.clothes_variant[0].size.size).toBe(CLOTHES_SIZES.M);
    expect(created.clothes_variant[0].gender.gender).toBe(
      CLOTHES_GENDER.UNISEX,
    );
  });

  it('rejects duplicate size and gender combinations before creating rows', async () => {
    const tenant = await createTenantEntityFactory(tenantRepository);

    await expect(
      clothesService.createClothe(
        createClothesFactory({
          variants: [
            createVariantFactory({
              size: CLOTHES_SIZES.M,
              gender: CLOTHES_GENDER.UNISEX,
            }),
            createVariantFactory({
              size: CLOTHES_SIZES.M,
              gender: CLOTHES_GENDER.UNISEX,
            }),
          ],
        }),
        tenant.id,
      ),
    ).rejects.toThrow('Duplicate combination');

    await expect(clothesRepository.find()).resolves.toHaveLength(0);
    await expect(variantRepository.find()).resolves.toHaveLength(0);
  });
});
