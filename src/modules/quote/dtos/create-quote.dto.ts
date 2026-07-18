import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CustomizationDTO {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must be at least 1 character long' })
  @MaxLength(100, { message: 'Name must be at most 100 characters long' })
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'quantity must be at least 0' })
  @Max(100, { message: 'quantity must be at most 100' })
  number?: number;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name must be at least 1 character long' })
  @MaxLength(1024, { message: 'Name must be at most 1024 characters long' })
  notes?: string;
}

export class CreateQuoteDTO {
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteDetailDTO)
  details: QuoteDetailDTO[];

  @IsNotEmpty()
  @IsString()
  @IsUUID()
  customerId: string;
}

export class QuoteDetailDTO {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  clothesVariantId: string;

  @IsNotEmpty()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'quantity must be a number' },
  )
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be at least 1' })
  @Max(100000, { message: 'quantity must be at most 10000' })
  quantity: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomizationDTO)
  @ArrayMaxSize(100, {
    message: 'customizations array cannot have more than 100 items',
  })
  customizations?: CustomizationDTO[];
}
