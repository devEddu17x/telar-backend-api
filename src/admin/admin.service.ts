import {
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import { ROLES } from 'src/auth/constants/roles';
import { EmployeeService } from 'src/employee/employee.service';
import { CreateEmployeeDTO } from 'src/employee/dtos/create-employee.dto';
import { EmployeeEntity } from 'src/employee/entities/employee.entity';
import { EmployeeWithRoles } from 'src/employee/interfaces/employee-with-roles.interface';

@Injectable()
export class AdminService {
  constructor(private readonly employeeService: EmployeeService) { }
  async getAllRoles() {
    throw new NotImplementedException('Not implemented yet');
  }

  async createEmployee(
    createEmployeeDTO: CreateEmployeeDTO,
  ): Promise<EmployeeEntity> {
    throw new NotImplementedException('Not implemented yet');
  }

  async updateEmployeeRole(email: string, role: ROLES) {
    throw new NotImplementedException('Not implemented yet');
  }

  async revokeEmployeeRole(email: string, role: ROLES) {
    throw new NotImplementedException('Not implemented yet');
  }

  async getAllEmployees(): Promise<EmployeeWithRoles[]> {
    throw new NotImplementedException('Not implemented yet');
  }

  async deleteEmployee(email: string): Promise<{ message: string }> {
    throw new NotImplementedException('Not implemented yet');
  }
}
