import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { CreateOwnerDTO } from './dto/create-owner.dto';
import { ConfirmEmailDTO } from './dto/confirm-email.dto';
import { ResendCodeDTO } from './dto/resend-code.dto';
import {
  ApiDocRegister,
  ApiDocResendCode,
  ApiDocConfirmEmail,
} from './docs/auth.doc';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiDocRegister()
  async register(@Body() createOwnerDTO: CreateOwnerDTO) {
    return await this.authService.createOwner(createOwnerDTO);
  }

  @Post('confirm-email')
  @ApiDocConfirmEmail()
  async confirmEmail(@Body() dto: ConfirmEmailDTO) {
    return await this.authService.confirmEmail(dto.email, dto.code);
  }

  @Post('resend-code')
  @ApiDocResendCode()
  async resendConfirmationCode(@Body() dto: ResendCodeDTO) {
    return await this.authService.resendConfirmationCode(dto.email);
  }
}
