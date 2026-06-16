import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEmployeeDTO {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  names?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  lastNames?: string;
}
