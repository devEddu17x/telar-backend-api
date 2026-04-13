import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { CREATABLE_ROLES } from 'src/auth/constants/roles';

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

  @IsEnum(CREATABLE_ROLES, {
    message: `Role must be a valid creatable role: ${Object.values(CREATABLE_ROLES).join(', ')}`,
  })
  @IsNotEmpty()
  role: CREATABLE_ROLES;
}
