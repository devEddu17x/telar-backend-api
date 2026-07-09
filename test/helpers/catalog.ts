import { DataSource } from 'typeorm';
import { CLOTHES_GENDER } from 'src/modules/clothes/enum/gender.enum';
import { CLOTHES_SIZES } from 'src/modules/clothes/enum/size.enum';
import { GenderEntity } from 'src/modules/clothes/entities/gender.entity';
import { SizeEntity } from 'src/modules/clothes/entities/size.entity';

export async function seedCatalog(dataSource: DataSource): Promise<void> {
  await dataSource.getRepository(SizeEntity).upsert(
    Object.values(CLOTHES_SIZES).map((size) => ({ size })),
    { conflictPaths: ['size'], skipUpdateIfNoValuesChanged: true },
  );

  await dataSource.getRepository(GenderEntity).upsert(
    Object.values(CLOTHES_GENDER).map((gender) => ({ gender })),
    { conflictPaths: ['gender'], skipUpdateIfNoValuesChanged: true },
  );
}

export async function expectCatalogSeeded(
  dataSource: DataSource,
): Promise<void> {
  await expect(dataSource.getRepository(SizeEntity).count()).resolves.toBe(
    Object.values(CLOTHES_SIZES).length,
  );
  await expect(dataSource.getRepository(GenderEntity).count()).resolves.toBe(
    Object.values(CLOTHES_GENDER).length,
  );
}
