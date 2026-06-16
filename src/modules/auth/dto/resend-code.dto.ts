import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendCodeDTO {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
