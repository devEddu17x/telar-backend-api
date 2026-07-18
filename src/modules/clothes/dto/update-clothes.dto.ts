import {
  IsString,
  IsNumber,
  Min,
  IsBoolean,
  IsOptional,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateClothesDTO {
  @IsOptional()
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

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  price?: number;

  @IsOptional()
  @IsBoolean()
  isInEcommerce?: boolean;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}
