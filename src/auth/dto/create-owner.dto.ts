import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateOwnerDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  lastName: string;

  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(64)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{12,}$/, {
    message:
      'password must contain at least 12 characters, including uppercase, lowercase, numbers, and symbols',
  })
  password: string;
}
