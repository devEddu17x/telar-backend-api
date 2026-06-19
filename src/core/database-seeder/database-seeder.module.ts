import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SizeEntity } from '../../modules/clothes/entities/size.entity';
import { GenderEntity } from '../../modules/clothes/entities/gender.entity';
import { DatabaseSeederService } from './database-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([SizeEntity, GenderEntity])],
  providers: [DatabaseSeederService],
})
export class DatabaseSeederModule {}
