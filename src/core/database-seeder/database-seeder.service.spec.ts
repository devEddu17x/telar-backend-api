import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DatabaseSeederService } from './database-seeder.service';
import { SizeEntity } from '../../modules/clothes/entities/size.entity';
import { GenderEntity } from '../../modules/clothes/entities/gender.entity';
import { CLOTHES_SIZES } from '../../modules/clothes/enum/size.enum';
import { CLOTHES_GENDER } from '../../modules/clothes/enum/gender.enum';

describe('DatabaseSeederService', () => {
  let service: DatabaseSeederService;
  let sizeRepository: { count: jest.Mock; upsert: jest.Mock };
  let genderRepository: { count: jest.Mock; upsert: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseSeederService,
        {
          provide: getRepositoryToken(SizeEntity),
          useValue: { count: jest.fn(), upsert: jest.fn() },
        },
        {
          provide: getRepositoryToken(GenderEntity),
          useValue: { count: jest.fn(), upsert: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(DatabaseSeederService);
    sizeRepository = module.get(getRepositoryToken(SizeEntity));
    genderRepository = module.get(getRepositoryToken(GenderEntity));
  });

  afterEach(() => jest.clearAllMocks());

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('hace upsert de todos los tamaños del enum en el repositorio de tallas', async () => {
      sizeRepository.count.mockResolvedValue(0);
      genderRepository.count.mockResolvedValue(0);

      await service.onModuleInit();

      const expectedSizes = Object.values(CLOTHES_SIZES).map((size) => ({
        size,
      }));
      expect(sizeRepository.upsert).toHaveBeenCalledWith(expectedSizes, {
        conflictPaths: ['size'],
        skipUpdateIfNoValuesChanged: true,
      });
    });

    it('hace upsert de todos los géneros del enum en el repositorio de géneros', async () => {
      sizeRepository.count.mockResolvedValue(0);
      genderRepository.count.mockResolvedValue(0);

      await service.onModuleInit();

      const expectedGenders = Object.values(CLOTHES_GENDER).map((gender) => ({
        gender,
      }));
      expect(genderRepository.upsert).toHaveBeenCalledWith(expectedGenders, {
        conflictPaths: ['gender'],
        skipUpdateIfNoValuesChanged: true,
      });
    });

    it('llama primero al seed de tallas y luego al de géneros', async () => {
      sizeRepository.count.mockResolvedValue(0);
      genderRepository.count.mockResolvedValue(0);
      const callOrder: string[] = [];
      sizeRepository.upsert.mockImplementation(() => {
        callOrder.push('sizes');
        return Promise.resolve();
      });
      genderRepository.upsert.mockImplementation(() => {
        callOrder.push('genders');
        return Promise.resolve();
      });

      await service.onModuleInit();

      expect(callOrder).toEqual(['sizes', 'genders']);
    });

    it('no lanza error si los repositorios ya tienen datos existentes', async () => {
      sizeRepository.count.mockResolvedValue(
        Object.values(CLOTHES_SIZES).length,
      );
      genderRepository.count.mockResolvedValue(
        Object.values(CLOTHES_GENDER).length,
      );

      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });
});
