import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateEmployeeDTO {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(64)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  names: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  lastNames: string;
}
