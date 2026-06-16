import { IsString, IsEmail, IsNotEmpty, Length } from 'class-validator';

export class ConfirmEmailDTO {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
