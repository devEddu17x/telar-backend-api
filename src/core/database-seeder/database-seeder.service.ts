import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SizeEntity } from '../../modules/clothes/entities/size.entity';
import { GenderEntity } from '../../modules/clothes/entities/gender.entity';
import { CLOTHES_SIZES } from '../../modules/clothes/enum/size.enum';
import { CLOTHES_GENDER } from '../../modules/clothes/enum/gender.enum';

@Injectable()
export class DatabaseSeederService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(
    @InjectRepository(SizeEntity)
    private readonly sizeRepository: Repository<SizeEntity>,
    @InjectRepository(GenderEntity)
    private readonly genderRepository: Repository<GenderEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Running catalog seed checks…');

    await this.seedSizes();
    await this.seedGenders();

    this.logger.log('Catalog seed checks completed');
  }

  private async seedSizes(): Promise<void> {
    const values = Object.values(CLOTHES_SIZES);
    const existingCount = await this.sizeRepository.count();

    await this.sizeRepository.upsert(
      values.map((size) => ({ size })),
      { conflictPaths: ['size'], skipUpdateIfNoValuesChanged: true },
    );

    const inserted = values.length - existingCount;
    this.logger.log(
      `Sizes catalog: ${inserted} inserted, ${existingCount} already existed`,
    );
  }

  private async seedGenders(): Promise<void> {
    const values = Object.values(CLOTHES_GENDER);
    const existingCount = await this.genderRepository.count();

    await this.genderRepository.upsert(
      values.map((gender) => ({ gender })),
      { conflictPaths: ['gender'], skipUpdateIfNoValuesChanged: true },
    );

    const inserted = values.length - existingCount;
    this.logger.log(
      `Genders catalog: ${inserted} inserted, ${existingCount} already existed`,
    );
  }
}
