import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './services/auth.service';
import { EmployeeModule } from 'src/employee/employee.module';
import { AuthController } from './auth.controller';
import { CognitoService } from './services/cognito.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    EmployeeModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [AuthController],
  providers: [AuthService, CognitoService, JwtStrategy],
  exports: [AuthService, CognitoService, JwtStrategy, PassportModule],
})
export class AuthModule {}
