import { ConfigService } from '@nestjs/config';
import { StorageService } from 'src/modules/storage/storage.service';
import { ensureTestBucket } from '../helpers/s3-mock';
import {
  createPngFilePlanFactory,
  createTinyPngBodyFactory,
} from '../factories/storage.factory';

describe('StorageService integration', () => {
  let service: StorageService;

  beforeAll(async () => {
    await ensureTestBucket();
    service = new StorageService({
      get: jest.fn((key: string) => {
        if (key !== 'storage') return undefined;

        return {
          config: {
            region: process.env.STORAGE_REGION,
            endpoint: process.env.STORAGE_ENDPOINT,
            forcePathStyle: true,
            credentials: {
              accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
              secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
            },
          },
          bucket: process.env.STORAGE_BUCKET_NAME,
          publicUrl: process.env.STORAGE_PUBLIC_URL,
        };
      }),
    } as unknown as ConfigService);
  });

  it('generates stable temporary keys with tenant, clothes and extension data', () => {
    const key = service.buildTempKey('tenant-1', 'clothes-1', 'photo.png');

    expect(key).toMatch(
      /^tenant-id-tenant-1\/clothe-id-clothes-1\/image-id-[0-9a-f-]+\.png$/,
    );
  });

  it('uploads through a presigned URL, verifies existence and deletes the object', async () => {
    const image = createPngFilePlanFactory();
    const [presigned] = await service.createPresignedPuts(
      'clothes-1',
      [image],
      'tenant-1',
      { ttlSeconds: 120, cacheControl: 'no-cache' },
    );

    expect(presigned.requiredHeaders).toEqual({
      'Content-Type': image.contentType,
    });
    expect(presigned.key).toContain('tenant-id-tenant-1/');

    const uploadResponse = await fetch(presigned.putUrl, {
      method: 'PUT',
      body: createTinyPngBodyFactory(),
      headers: presigned.requiredHeaders,
    });

    expect(uploadResponse.ok).toBe(true);
    await expect(service.exists(presigned.key)).resolves.toBe(true);

    const [publicUrl] = service.getImagesUrl([presigned.key]);
    expect(publicUrl).toBe(
      `${process.env.STORAGE_PUBLIC_URL}/${presigned.key}`,
    );
    expect(service.extractKeyFromUrl(publicUrl)).toBe(presigned.key);
    expect(service.extractKeyFromUrl('not-a-url')).toBeNull();

    await expect(service.deleteObject(presigned.key)).resolves.toBe(true);
    await expect(service.exists(presigned.key)).resolves.toBe(false);
  });
});
