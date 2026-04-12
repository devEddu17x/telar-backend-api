import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { EmployeeModule } from 'src/employee/employee.module';
import { AuthController } from './auth.controller';
import { CognitoService } from './services/cognito.service';
@Module({
  imports: [EmployeeModule],
  controllers: [AuthController],
  providers: [AuthService, CognitoService],
})
export class AuthModule {}
