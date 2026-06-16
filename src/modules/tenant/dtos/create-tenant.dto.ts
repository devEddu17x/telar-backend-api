import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^(10|20)\d{9}$/, {
    message: 'RUC must start with 10 or 20 and have exactly 11 numeric digits',
  })
  ruc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  address?: string;
}
