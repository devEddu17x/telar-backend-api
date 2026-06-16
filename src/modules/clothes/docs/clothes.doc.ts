import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDocCreateClothes() {
  return applyDecorators(
    ApiOperation({ summary: 'Create clothes with images and variants' }),
  );
}

export function ApiDocCreateDraftClothes() {
  return applyDecorators(ApiOperation({ summary: 'Create draft clothes' }));
}

export function ApiDocGetAllClothes() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all clothes for tenant' }),
  );
}

export function ApiDocSearchAndFilterClothes() {
  return applyDecorators(
    ApiOperation({ summary: 'Search and filter clothes' }),
  );
}

export function ApiDocGetClothesById() {
  return applyDecorators(ApiOperation({ summary: 'Get clothes by ID' }));
}

export function ApiDocUpdateClothes() {
  return applyDecorators(ApiOperation({ summary: 'Update clothes by ID' }));
}

export function ApiDocAddVariant() {
  return applyDecorators(ApiOperation({ summary: 'Add variant to clothes' }));
}

export function ApiDocUpdateVariant() {
  return applyDecorators(ApiOperation({ summary: 'Update clothes variant' }));
}

export function ApiDocDeleteVariant() {
  return applyDecorators(ApiOperation({ summary: 'Delete clothes variant' }));
}

export function ApiDocAddImages() {
  return applyDecorators(ApiOperation({ summary: 'Add images to clothes' }));
}

export function ApiDocDeleteImage() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete image from clothes' }),
  );
}

export function ApiDocDeleteClothes() {
  return applyDecorators(ApiOperation({ summary: 'Delete clothes by ID' }));
}
