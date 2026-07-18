import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Variant } from './variants.dto';
import { AllowedImagesDTO } from 'src/modules/clothes/dto/images.dto';

export class CreateClothesDTO {
  @IsNotEmpty()
  @IsString()
  @MinLength(1, { message: 'Name must be at least 1 character long' })
  @MaxLength(100, { message: 'Name must be at most 100 characters long' })
  name: string;

  @IsOptional()
  @IsString()
  @MinLength(0, { message: 'Description must be at least 0 characters long' })
  @MaxLength(1024, {
    message: 'Description must be at most 1024 characters long',
  })
  description: string;

  @IsNotEmpty()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must have at most 2 decimal places' },
  )
  @Min(1, { message: 'Price must be greater than or equal to 1' })
  @Max(1000, { message: 'Price must be less than or equal to 1000' })
  price: number;

  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Variant)
  variants: Variant[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllowedImagesDTO)
  images: AllowedImagesDTO[];
}
