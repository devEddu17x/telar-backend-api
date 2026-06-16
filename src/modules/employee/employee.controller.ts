import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { ApiDocGetEmployee, ApiDocUpdateEmployee } from './docs/employee.doc';
import { UpdateEmployeeDTO } from './dtos/update-employee.dto';
import { EmployeeEntity } from './entities/employee.entity';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../modules/auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get('me')
  @ApiDocGetEmployee()
  async getEmployee(
    @CurrentUser() user: any,
  ): Promise<EmployeeEntity & { roles: string[] }> {
    return await this.employeeService.getMe(user.sub, user.roles);
  }

  @Patch()
  @ApiDocUpdateEmployee()
  async updateEmployee(
    @Body() updateEmployeeDTO: UpdateEmployeeDTO,
    @CurrentUser() user: any,
  ): Promise<EmployeeEntity> {
    return await this.employeeService.updateMe(
      user.sub,
      user.email,
      updateEmployeeDTO,
    );
  }
}
