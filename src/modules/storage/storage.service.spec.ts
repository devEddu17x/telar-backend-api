import { ConfigService } from '@nestjs/config';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from './storage.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('StorageService', () => {
  let service: StorageService;
  let sendMock: jest.Mock;
  let configService: { get: jest.Mock };

  beforeEach(() => {
    configService = {
      get: jest.fn(() => ({
        config: { region: 'us-east-1' },
        bucket: 'my-bucket',
        publicUrl: 'https://cdn.miapp.com',
      })),
    };

    service = new StorageService(configService as unknown as ConfigService);

    sendMock = jest.fn();
    (service as any).s3 = { send: sendMock };

    (getSignedUrl as jest.Mock).mockReset();
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('buildTempKey', () => {
    it('genera una key con la extensión del archivo', () => {
      const key = service.buildTempKey('tenant-1', 'clothes-1', 'foto.png');

      expect(key).toMatch(
        /^tenant-id-tenant-1\/clothe-id-clothes-1\/image-id-[0-9a-f-]+\.png$/,
      );
    });

    it('usa "bin" como extensión por defecto si el archivo no tiene extensión', () => {
      const key = service.buildTempKey(
        'tenant-1',
        'clothes-1',
        'foto-sin-extension',
      );

      expect(key).toMatch(/\.bin$/);
    });
  });

  describe('createPresignedPuts', () => {
    it('devuelve un array vacío si no hay archivos', async () => {
      const result = await service.createPresignedPuts(
        'clothes-1',
        [],
        'tenant-1',
      );

      expect(result).toEqual([]);
      expect(getSignedUrl).not.toHaveBeenCalled();
    });

    it('genera una URL pre-firmada por cada archivo', async () => {
      (getSignedUrl as jest.Mock).mockResolvedValue(
        'https://s3.presigned/put-url',
      );

      const result = await service.createPresignedPuts(
        'clothes-1',
        [{ filename: 'foto.png', contentType: 'image/png' }] as any,
        'tenant-1',
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          putUrl: 'https://s3.presigned/put-url',
          requiredHeaders: { 'Content-Type': 'image/png' },
        }),
      );
    });
  });

  describe('getImagesUrl', () => {
    it('arma las URLs públicas a partir de las keys', () => {
      const result = service.getImagesUrl(['key-1', 'key-2']);

      expect(result).toEqual([
        'https://cdn.miapp.com/key-1',
        'https://cdn.miapp.com/key-2',
      ]);
    });
  });

  describe('exists', () => {
    it('devuelve true si el objeto existe en S3', async () => {
      sendMock.mockResolvedValue({});

      const result = await service.exists('key-1');

      expect(result).toBe(true);
    });

    it('devuelve false si S3 lanza un error', async () => {
      sendMock.mockRejectedValue(new Error('not found'));

      const result = await service.exists('key-1');

      expect(result).toBe(false);
    });
  });

  describe('extractKeyFromUrl', () => {
    it('extrae la key de una URL válida', () => {
      const key = service.extractKeyFromUrl(
        'https://cdn.miapp.com/tenant-1/img.png',
      );

      expect(key).toBe('tenant-1/img.png');
    });

    it('devuelve null si la URL es inválida', () => {
      const key = service.extractKeyFromUrl('no-es-una-url');

      expect(key).toBeNull();
    });
  });

  describe('deleteObject', () => {
    it('devuelve true si se elimina exitosamente', async () => {
      sendMock.mockResolvedValue({});

      const result = await service.deleteObject('key-1');

      expect(result).toBe(true);
    });

    it('devuelve false si falla la eliminación', async () => {
      sendMock.mockRejectedValue(new Error('S3 down'));

      const result = await service.deleteObject('key-1');

      expect(result).toBe(false);
    });
  });
});
