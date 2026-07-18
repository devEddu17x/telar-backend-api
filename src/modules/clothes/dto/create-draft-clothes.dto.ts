import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Min,
  IsArray,
  ValidateNested,
  IsOptional,
  MaxLength,
  MinLength,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AllowedImagesDTO } from 'src/modules/clothes/dto/images.dto';

export class CreateDraftClothesDTO {
  @IsNotEmpty()
  @IsString()
  @MinLength(1, { message: 'Name must be at least 1 character long' })
  @MaxLength(100, { message: 'Name must be at most 100 characters long' })
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(1000)
  price: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllowedImagesDTO)
  images: AllowedImagesDTO[];
}
