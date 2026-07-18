import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsValidDeliveryDate } from '../validators/delivery-date.validator';

export class AddressDTO {
  @IsNotEmpty()
  @IsString()
  @MinLength(1, { message: 'Department must be at least 1 character long' })
  @MaxLength(100, { message: 'Department must be at most 100 characters long' })
  department: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1, { message: 'City must be at least 1 character long' })
  @MaxLength(100, { message: 'City must be at most 100 characters long' })
  city: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1, { message: 'District must be at least 1 character long' })
  @MaxLength(100, { message: 'District must be at most 100 characters long' })
  district: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(1, { message: 'Street must be at least 1 character long' })
  @MaxLength(255, { message: 'Street must be at most 255 characters long' })
  street: string;
}

export class CreateOrderDTO {
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  quoteId: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AddressDTO)
  address: AddressDTO;

  @IsNotEmpty()
  @IsDateString(
    { strict: true },
    { message: 'deliveryDate must be a valid date in YYYY-MM-DD format' },
  )
  @IsValidDeliveryDate()
  deliveryDate: string;
}
