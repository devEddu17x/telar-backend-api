import {
  Body,
  Controller,
  Get,
  NotImplementedException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { UpdateEmployeeDTO } from './dtos/update-employee.dto';
import { EmployeeEntity } from './entities/employee.entity';
@UseGuards()
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) { }

  @Get('me')
  async getEmployee(
  ): Promise<EmployeeEntity & { roles: string[] }> {
    throw new NotImplementedException('Not implemented yet');
  }

  @Patch()
  async updateEmployee(
    @Body() updateEmployeeDTO: UpdateEmployeeDTO,
  ): Promise<EmployeeEntity> {
    throw new NotImplementedException('Not implemented yet');
  }
}
