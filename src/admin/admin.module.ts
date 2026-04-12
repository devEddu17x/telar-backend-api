import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EmployeeModule } from 'src/employee/employee.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [EmployeeModule, AuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule { }
