import { faker } from '@faker-js/faker';
import { CreateClothesDTO } from 'src/modules/clothes/dto/create-clothes.dto';
import { CreateDraftClothesDTO } from 'src/modules/clothes/dto/create-draft-clothes.dto';
import { AllowedImagesDTO } from 'src/modules/clothes/dto/images.dto';
import { Variant } from 'src/modules/clothes/dto/variants.dto';
import { ALLOWED_IMAGES } from 'src/modules/clothes/enum/allowed-images.enum';
import { CLOTHES_GENDER } from 'src/modules/clothes/enum/gender.enum';
import { CLOTHES_SIZES } from 'src/modules/clothes/enum/size.enum';

export function createVariantFactory(
  overrides: Partial<Variant> = {},
): Variant {
  return {
    size: CLOTHES_SIZES.M,
    gender: CLOTHES_GENDER.UNISEX,
    additional: 0,
    ...overrides,
  };
}

export function createClothesFactory(
  overrides: Partial<CreateClothesDTO> = {},
): CreateClothesDTO {
  return {
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: Number(faker.commerce.price({ min: 20, max: 150, dec: 2 })),
    variants: [
      createVariantFactory(),
      createVariantFactory({
        size: CLOTHES_SIZES.L,
        gender: CLOTHES_GENDER.UNISEX,
        additional: 10,
      }),
    ],
    images: [],
    ...overrides,
  };
}

export function createDraftClothesFactory(
  overrides: Partial<CreateDraftClothesDTO> = {},
): CreateDraftClothesDTO {
  return {
    name: faker.commerce.productName(),
    price: Number(faker.commerce.price({ min: 20, max: 150, dec: 2 })),
    images: [],
    ...overrides,
  };
}

export function createAllowedPngImageFactory(
  overrides: Partial<AllowedImagesDTO> = {},
): AllowedImagesDTO {
  return {
    filename: `${faker.system.commonFileName('png')}`,
    contentType: ALLOWED_IMAGES.PNG,
    ...overrides,
  };
}
