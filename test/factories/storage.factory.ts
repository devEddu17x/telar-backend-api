import { faker } from '@faker-js/faker';
import { FilePlan } from 'src/modules/storage/interfaces/file-plan.interface';

export function createPngFilePlanFactory(
  overrides: Partial<FilePlan> = {},
): FilePlan {
  return {
    filename: `${faker.system.commonFileName('png')}`,
    contentType: 'image/png',
    ...overrides,
  };
}

export function createTinyPngBodyFactory(): Blob {
  return new Blob(
    [
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
        'base64',
      ),
    ],
    { type: 'image/png' },
  );
}
